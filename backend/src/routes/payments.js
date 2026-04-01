'use strict';

const express = require('express');
const crypto  = require('crypto');
const fetch   = require('node-fetch');
const { db }  = require('../config/database');

const router = express.Router();

// ── Helpers ───────────────────────────────────────────────────────
function generateId() {
  return (
    'CMD-' +
    Date.now() +
    '-' +
    Math.random().toString(36).substr(2, 5).toUpperCase()
  );
}

function formatCFA(amount) {
  return Number(amount).toLocaleString('fr-FR') + ' FCFA';
}

function validateOrderData(body) {
  const errors = [];
  if (!body.prenom    || !String(body.prenom).trim())    errors.push('Prénom requis.');
  if (!body.nom       || !String(body.nom).trim())        errors.push('Nom requis.');
  if (!body.telephone || !String(body.telephone).trim()) errors.push('Téléphone requis.');
  if (!body.adresse   || !String(body.adresse).trim())   errors.push('Adresse requise.');
  if (!Array.isArray(body.items) || body.items.length === 0)
    errors.push('La commande doit contenir au moins un article.');
  if (typeof body.total !== 'number' || body.total <= 0)
    errors.push('Total invalide.');
  return errors;
}

function createOrderInDB(data, paymentMethod) {
  const id = generateId();
  db.prepare(`
    INSERT INTO orders
      (id, prenom, nom, telephone, adresse, quartier, ville,
       items, total, status, payment_method, payment_status, notes)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, 'nouvelle', ?, 'pending', ?)
  `).run(
    id,
    String(data.prenom).trim(),
    String(data.nom).trim(),
    String(data.telephone).trim(),
    String(data.adresse).trim(),
    data.quartier ? String(data.quartier).trim() : null,
    data.ville    ? String(data.ville).trim()    : 'Dakar',
    JSON.stringify(data.items),
    data.total,
    paymentMethod,
    data.notes ? String(data.notes).trim() : null,
  );
  return id;
}

function buildWhatsAppMessage(data, orderId) {
  const lines = [];
  lines.push('🛍️ *NOUVELLE COMMANDE — FA2M*');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push('👤 *INFORMATIONS CLIENT*');
  lines.push(`• Prénom   : ${data.prenom}`);
  lines.push(`• Nom      : ${data.nom}`);
  lines.push(`• Tél      : ${data.telephone}`);
  lines.push(`• Adresse  : ${data.adresse}${data.quartier ? ', ' + data.quartier : ''}`);
  lines.push(`• Ville    : ${data.ville || 'Dakar'}`);
  if (data.notes) lines.push(`• Notes    : ${data.notes}`);
  lines.push('');
  lines.push('📦 *ARTICLES COMMANDÉS*');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━');
  data.items.forEach((item, i) => {
    lines.push('');
    lines.push(`${i + 1}. *${item.name}*`);
    lines.push(`   Qté       : ${item.qty}`);
    lines.push(`   Prix/u    : ${formatCFA(item.price)}`);
    lines.push(`   Sous-total: ${formatCFA(item.price * item.qty)}`);
  });
  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push(`🧾 *TOTAL : ${formatCFA(data.total)}*`);
  lines.push(`📋 *Référence : ${orderId}*`);
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push('✅ Merci de confirmer cette commande et d\'indiquer le délai de livraison.');
  return lines.join('\n');
}

// ── POST /api/payments/whatsapp ───────────────────────────────────
router.post('/whatsapp', (req, res) => {
  try {
    const errors = validateOrderData(req.body);
    if (errors.length) {
      return res.status(400).json({ success: false, message: errors[0], errors });
    }

    const orderId      = createOrderInDB(req.body, 'whatsapp');
    const message      = buildWhatsAppMessage(req.body, orderId);
    const phone        = process.env.SHOP_PHONE || '221781332323';
    const whatsappUrl  = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    return res.json({
      success: true,
      data: { orderId, whatsappUrl },
    });
  } catch (err) {
    console.error('[payments/whatsapp]', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ── POST /api/payments/wave ───────────────────────────────────────
router.post('/wave', async (req, res) => {
  try {
    const errors = validateOrderData(req.body);
    if (errors.length) {
      return res.status(400).json({ success: false, message: errors[0], errors });
    }

    const orderId = createOrderInDB(req.body, 'wave');
    const APP_URL = process.env.APP_URL || 'http://localhost:3000';

    if (!process.env.WAVE_API_KEY) {
      return res.json({
        success: true,
        data: {
          orderId,
          paymentUrl: null,
          demo: true,
          message: 'Clé API Wave non configurée. Ajoutez WAVE_API_KEY dans votre fichier .env.',
        },
      });
    }

    const waveRes = await fetch('https://api.wave.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization':    `Bearer ${process.env.WAVE_API_KEY}`,
        'Content-Type':     'application/json',
        'Idempotency-Key':  orderId,
      },
      body: JSON.stringify({
        amount:           String(Math.round(req.body.total)),
        currency:         'XOF',
        error_url:        `${APP_URL}/paiement-erreur.html?order=${orderId}`,
        success_url:      `${APP_URL}/paiement-succes.html?order=${orderId}`,
        client_reference: orderId,
      }),
    });

    const waveData = await waveRes.json();

    if (!waveRes.ok) {
      console.error('[payments/wave] Wave API error:', waveData);
      return res.status(502).json({
        success: false,
        message: `Erreur Wave : ${waveData.message || waveData.error || 'Réponse invalide.'}`,
      });
    }

    // Save wave checkout id
    db.prepare('UPDATE orders SET wave_checkout_id = ? WHERE id = ?')
      .run(waveData.id || null, orderId);

    return res.json({
      success: true,
      data: { orderId, paymentUrl: waveData.wave_launch_url },
    });
  } catch (err) {
    console.error('[payments/wave]', err);
    return res.status(500).json({ success: false, message: 'Erreur lors de la création du paiement Wave.' });
  }
});

// ── POST /api/payments/wave/webhook ──────────────────────────────
router.post('/wave/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    const secret    = process.env.WAVE_WEBHOOK_SECRET;
    const signature = req.headers['wave-signature'] || req.headers['x-wave-signature'] || '';
    const rawBody   = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);

    // Verify HMAC signature if secret is configured
    if (secret) {
      const expected = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

      if (signature !== expected && `sha256=${signature}` !== expected) {
        return res.status(400).json({ error: 'Invalid signature.' });
      }
    }

    let event;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body.' });
    }

    const clientRef = event.client_reference
      || (event.checkout_session && event.checkout_session.client_reference)
      || null;

    const succeeded =
      event.checkout_status   === 'complete' ||
      event.payment_status    === 'succeeded' ||
      event.type              === 'checkout.session.completed';

    if (clientRef && succeeded) {
      db.prepare(`
        UPDATE orders
        SET payment_status = 'paid',
            status         = 'confirmee',
            payment_ref    = ?,
            updated_at     = datetime('now')
        WHERE id = ?
      `).run(event.id || event.transaction_id || null, clientRef);

      console.log(`✓ Wave paiement confirmé pour la commande ${clientRef}`);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[payments/wave/webhook]', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── POST /api/payments/orange-money ──────────────────────────────
router.post('/orange-money', async (req, res) => {
  try {
    const errors = validateOrderData(req.body);
    if (errors.length) {
      return res.status(400).json({ success: false, message: errors[0], errors });
    }

    const orderId  = createOrderInDB(req.body, 'orange_money');
    const APP_URL  = process.env.APP_URL  || 'http://localhost:3000';
    const API_URL  = process.env.API_URL  || 'http://localhost:3000';
    const OM_COUNTRY = process.env.OM_COUNTRY || 'sn';

    if (!process.env.OM_CLIENT_ID || !process.env.OM_CLIENT_SECRET) {
      return res.json({
        success: true,
        data: {
          orderId,
          paymentUrl: null,
          demo: true,
          message: 'Orange Money non configuré. Ajoutez OM_CLIENT_ID et OM_CLIENT_SECRET dans .env.',
        },
      });
    }

    // Step 1 — Get access token
    const basicAuth = Buffer.from(
      `${process.env.OM_CLIENT_ID}:${process.env.OM_CLIENT_SECRET}`
    ).toString('base64');

    const tokenRes = await fetch('https://api.orange.com/oauth/v3/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type':  'application/x-www-form-urlencoded',
        'Accept':        'application/json',
      },
      body: 'grant_type=client_credentials',
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('[payments/orange-money] Token error:', tokenData);
      return res.status(502).json({
        success: false,
        message: 'Impossible d\'obtenir le token Orange Money.',
      });
    }

    // Step 2 — Create payment
    const paymentRes = await fetch(
      `https://api.orange.com/orange-money-webpay/${OM_COUNTRY}/v1/webpayment`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type':  'application/json',
          'Accept':        'application/json',
        },
        body: JSON.stringify({
          merchant_key: process.env.OM_MERCHANT_KEY || '',
          currency:     'OUV',
          order_id:     orderId,
          amount:       String(Math.round(req.body.total)),
          return_url:   `${APP_URL}/paiement-succes.html?order=${orderId}`,
          cancel_url:   `${APP_URL}/paiement-erreur.html?order=${orderId}`,
          notif_url:    `${API_URL}/api/payments/orange-money/webhook`,
          lang:         'fr',
          reference:    orderId,
        }),
      }
    );

    const omData = await paymentRes.json();

    if (!paymentRes.ok) {
      console.error('[payments/orange-money] Payment error:', omData);
      return res.status(502).json({
        success: false,
        message: `Erreur Orange Money : ${omData.message || omData.error || 'Réponse invalide.'}`,
      });
    }

    return res.json({
      success: true,
      data: { orderId, paymentUrl: omData.payment_url },
    });
  } catch (err) {
    console.error('[payments/orange-money]', err);
    return res.status(500).json({ success: false, message: 'Erreur lors de la création du paiement Orange Money.' });
  }
});

// ── POST /api/payments/orange-money/webhook ───────────────────────
router.post('/orange-money/webhook', (req, res) => {
  try {
    const body = req.body;

    const orderId  = body.order_id || body.reference || null;
    const omStatus = body.status   || body.transaction_status || '';

    if (orderId && omStatus === 'SUCCESS') {
      db.prepare(`
        UPDATE orders
        SET payment_status = 'paid',
            status         = 'confirmee',
            payment_ref    = ?,
            updated_at     = datetime('now')
        WHERE id = ?
      `).run(body.transaction_id || body.txnid || null, orderId);

      console.log(`✓ Orange Money paiement confirmé pour la commande ${orderId}`);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[payments/orange-money/webhook]', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
