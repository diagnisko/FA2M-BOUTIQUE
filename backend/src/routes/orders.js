'use strict';

const express = require('express');
const { db }  = require('../config/database');
const auth    = require('../middleware/auth');

const router = express.Router();

// ── Helpers ───────────────────────────────────────────────────────
function parseOrder(row) {
  if (!row) return null;
  return {
    ...row,
    items: (() => { try { return JSON.parse(row.items); } catch { return []; } })(),
  };
}

const VALID_STATUSES = ['nouvelle', 'confirmee', 'en_livraison', 'livree', 'annulee'];

function generateId() {
  return (
    'CMD-' +
    Date.now() +
    '-' +
    Math.random().toString(36).substr(2, 5).toUpperCase()
  );
}

// ── POST /api/orders — Create order (public) ─────────────────────
router.post('/', (req, res) => {
  try {
    const { prenom, nom, telephone, adresse, quartier, ville, items, total, notes } = req.body;

    // Validation
    const errors = [];
    if (!prenom || !String(prenom).trim())    errors.push('Le prénom est requis.');
    if (!nom    || !String(nom).trim())        errors.push('Le nom est requis.');
    if (!telephone || !String(telephone).trim()) errors.push('Le téléphone est requis.');
    if (!adresse || !String(adresse).trim())  errors.push('L\'adresse est requise.');
    if (!Array.isArray(items) || items.length === 0)
      errors.push('La commande doit contenir au moins un article.');
    if (typeof total !== 'number' || total <= 0)
      errors.push('Le total doit être un nombre positif.');

    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors[0], errors });
    }

    const id = generateId();

    db.prepare(`
      INSERT INTO orders
        (id, prenom, nom, telephone, adresse, quartier, ville, items, total,
         status, payment_method, payment_status, notes)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, 'nouvelle', 'whatsapp', 'pending', ?)
    `).run(
      id,
      String(prenom).trim(),
      String(nom).trim(),
      String(telephone).trim(),
      String(adresse).trim(),
      quartier ? String(quartier).trim() : null,
      ville    ? String(ville).trim()    : 'Dakar',
      JSON.stringify(items),
      total,
      notes ? String(notes).trim() : null,
    );

    return res.status(201).json({
      success: true,
      data: { id, message: 'Commande créée avec succès.' },
    });
  } catch (err) {
    console.error('[orders/create]', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ── GET /api/orders/stats — Dashboard stats (admin) ──────────────
// IMPORTANT: must be defined BEFORE GET /:id
router.get('/stats', auth, (req, res) => {
  try {
    const totalOrders   = db.prepare('SELECT COUNT(*) AS cnt FROM orders').get().cnt;
    const newOrders     = db.prepare("SELECT COUNT(*) AS cnt FROM orders WHERE status = 'nouvelle'").get().cnt;
    const revenue       = db.prepare("SELECT COALESCE(SUM(total), 0) AS total FROM orders WHERE status = 'livree'").get().total;
    const pendingOrders = db.prepare(
      "SELECT COUNT(*) AS cnt FROM orders WHERE status IN ('nouvelle','confirmee','en_livraison')"
    ).get().cnt;

    // Revenue by month — last 6 months
    const rawMonths = db.prepare(`
      SELECT
        strftime('%m/%Y', created_at) AS month_key,
        strftime('%Y-%m', created_at) AS sort_key,
        COALESCE(SUM(total), 0)        AS total
      FROM orders
      WHERE
        created_at >= date('now', '-6 months')
        AND status != 'annulee'
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY sort_key ASC
    `).all();

    const MONTH_NAMES = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    const revenueByMonth = rawMonths.map(row => {
      const [m, y] = row.month_key.split('/');
      return { month: MONTH_NAMES[parseInt(m, 10) - 1] + ' ' + y, total: row.total };
    });

    // Pad missing months with 0 up to 6 entries
    while (revenueByMonth.length < 6) {
      revenueByMonth.unshift({ month: '—', total: 0 });
    }

    return res.json({
      success: true,
      data: { totalOrders, newOrders, revenue, pendingOrders, revenueByMonth },
    });
  } catch (err) {
    console.error('[orders/stats]', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ── GET /api/orders — List orders with filters (admin) ────────────
router.get('/', auth, (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const search = req.query.search ? String(req.query.search).trim() : '';

    // Build WHERE clauses
    const conditions = [];
    const params     = [];

    if (status && VALID_STATUSES.includes(status)) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (search) {
      conditions.push('(prenom LIKE ? OR nom LIKE ? OR telephone LIKE ? OR id LIKE ?)');
      const like = '%' + search + '%';
      params.push(like, like, like, like);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const totalRow = db
      .prepare(`SELECT COUNT(*) AS cnt FROM orders ${where}`)
      .get(...params);
    const total = totalRow.cnt;
    const pages = Math.ceil(total / limit) || 1;

    const rows = db
      .prepare(
        `SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset);

    return res.json({
      success: true,
      data: {
        orders: rows.map(parseOrder),
        total,
        page,
        pages,
      },
    });
  } catch (err) {
    console.error('[orders/list]', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ── GET /api/orders/:id — Single order (admin) ────────────────────
router.get('/:id', auth, (req, res) => {
  try {
    const row = db
      .prepare('SELECT * FROM orders WHERE id = ?')
      .get(req.params.id);

    if (!row) {
      return res.status(404).json({ success: false, message: 'Commande introuvable.' });
    }

    return res.json({ success: true, data: parseOrder(row) });
  } catch (err) {
    console.error('[orders/get]', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ── PUT /api/orders/:id/status — Update status (admin) ────────────
router.put('/:id/status', auth, (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Statut invalide. Valeurs acceptées : ${VALID_STATUSES.join(', ')}.`,
      });
    }

    const order = db.prepare('SELECT id FROM orders WHERE id = ?').get(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Commande introuvable.' });
    }

    db.prepare(
      "UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(status, req.params.id);

    return res.json({ success: true, message: 'Statut mis à jour avec succès.' });
  } catch (err) {
    console.error('[orders/status]', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

module.exports = router;
