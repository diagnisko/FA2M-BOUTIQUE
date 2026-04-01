'use strict';
/* ================================================================
   FA2M — Cart & Checkout  |  v2.0
   ================================================================ */

// ── State ─────────────────────────────────────────────────────────
let CART = [];

// ── Persistence ───────────────────────────────────────────────────
function cartLoad() {
  try {
    const raw = localStorage.getItem(FA2M_CONFIG.CART_KEY);
    CART = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(CART)) CART = [];
  } catch {
    CART = [];
  }
}

function cartSave() {
  try {
    localStorage.setItem(FA2M_CONFIG.CART_KEY, JSON.stringify(CART));
  } catch { /* storage full — ignore */ }
}

// ── Mutations ─────────────────────────────────────────────────────
function cartAdd(product, qty) {
  qty = Math.max(1, parseInt(qty) || 1);
  const existing = CART.find(i => String(i.id) === String(product.id));
  if (existing) {
    existing.qty = Math.min(existing.qty + qty, 99);
  } else {
    CART.push({
      id:    product.id,
      name:  product.name,
      price: product.price,
      image: product.image || '',
      qty,
    });
  }
  cartSave();
  cartUpdateUI();
  cartShowToast(product.name);
}

function cartRemove(id) {
  CART = CART.filter(i => String(i.id) !== String(id));
  cartSave();
  cartUpdateUI();
  cartRenderItems();
}

function cartSetQty(id, qty) {
  qty = parseInt(qty);
  if (isNaN(qty) || qty < 1) { cartRemove(id); return; }
  const item = CART.find(i => String(i.id) === String(id));
  if (item) {
    item.qty = Math.min(qty, 99);
    cartSave();
    cartUpdateUI();
    cartRenderItems();
  }
}

function cartClear() {
  CART = [];
  cartSave();
  cartUpdateUI();
}

// ── Computed ──────────────────────────────────────────────────────
function cartTotal() {
  return CART.reduce((sum, i) => sum + i.price * i.qty, 0);
}

function cartCount() {
  return CART.reduce((sum, i) => sum + i.qty, 0);
}

// ── UI Updates ────────────────────────────────────────────────────
function cartUpdateUI() {
  const count = cartCount();
  document.querySelectorAll('.cart-badge').forEach(el => {
    el.textContent    = count;
    el.style.display  = count > 0 ? 'flex' : 'none';
  });
}

function cartRenderItems() {
  const list    = document.getElementById('cart-items-list');
  const empty   = document.getElementById('cart-empty');
  const summary = document.getElementById('cart-summary');
  if (!list) return;

  if (CART.length === 0) {
    list.innerHTML = '';
    if (empty)   empty.style.display   = 'flex';
    if (summary) summary.style.display = 'none';
    return;
  }

  if (empty)   empty.style.display   = 'none';
  if (summary) summary.style.display = 'block';

  list.innerHTML = CART.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <img
        class="cart-item-img"
        src="${escHtml(item.image)}"
        alt="${escHtml(item.name)}"
        loading="lazy"
        onerror="this.style.display='none'"
      >
      <div class="cart-item-info">
        <div class="cart-item-name">${escHtml(item.name)}</div>
        <div class="cart-item-price">${formatCFA(item.price)}</div>
        <div class="cart-qty-wrap">
          <button
            class="cart-qty-btn"
            onclick="cartSetQty(${item.id}, ${item.qty - 1})"
            aria-label="Réduire la quantité"
          >−</button>
          <span class="cart-qty-val">${item.qty}</span>
          <button
            class="cart-qty-btn"
            onclick="cartSetQty(${item.id}, ${item.qty + 1})"
            aria-label="Augmenter la quantité"
          >+</button>
        </div>
      </div>
      <div class="cart-item-right">
        <div class="cart-item-subtotal">${formatCFA(item.price * item.qty)}</div>
        <button
          class="cart-item-remove"
          onclick="cartRemove(${item.id})"
          aria-label="Supprimer ${escHtml(item.name)}"
          title="Supprimer"
        >✕</button>
      </div>
    </div>
  `).join('');

  const totalEl = document.getElementById('cart-total');
  if (totalEl) totalEl.textContent = formatCFA(cartTotal());
}

// ── Drawer Open / Close ───────────────────────────────────────────
function cartOpen() {
  cartRenderItems();
  document.getElementById('cart-drawer')?.classList.add('open');
  document.getElementById('cart-overlay')?.classList.add('visible');
  document.body.style.overflow = 'hidden';
  document.getElementById('cart-drawer')
    ?.querySelector('.cart-close-btn')?.focus();
}

function cartClose() {
  document.getElementById('cart-drawer')?.classList.remove('open');
  document.getElementById('cart-overlay')?.classList.remove('visible');
  document.body.style.overflow = '';
}

// ── Toast ─────────────────────────────────────────────────────────
function cartShowToast(name) {
  const t = document.getElementById('cart-toast');
  if (!t) return;
  t.querySelector('.toast-msg').textContent = `"${name}" ajouté au panier`;
  t.classList.add('show');
  clearTimeout(t._tid);
  t._tid = setTimeout(() => t.classList.remove('show'), 3000);
}

function showToast(msg, type) {
  type = type || 'success';
  const t = document.getElementById('global-toast');
  if (!t) { console.info('[Toast]', msg); return; }
  t.className = 'global-toast show ' + type;
  t.querySelector('.toast-msg').textContent = msg;
  clearTimeout(t._tid);
  t._tid = setTimeout(() => t.classList.remove('show'), 4000);
}

// ── Checkout ──────────────────────────────────────────────────────
function checkoutOpen() {
  if (CART.length === 0) {
    showToast('Votre panier est vide.', 'warning');
    return;
  }
  cartClose();

  // Render order recap
  const recapList = document.getElementById('order-recap-list');
  if (recapList) {
    recapList.innerHTML = CART.map(i => `
      <li>
        <span>${escHtml(i.name)} × ${i.qty}</span>
        <span>${formatCFA(i.price * i.qty)}</span>
      </li>
    `).join('');
  }
  const recapTotal = document.getElementById('order-recap-total-amount');
  if (recapTotal) recapTotal.textContent = formatCFA(cartTotal());

  const wrap = document.getElementById('checkout-form-wrap');
  if (wrap) {
    wrap.classList.add('open');
    document.body.style.overflow = 'hidden';
    wrap.querySelector('#order-prenom')?.focus();
  }
}

function checkoutClose() {
  document.getElementById('checkout-form-wrap')?.classList.remove('open');
  document.body.style.overflow = '';
}

// ── Submit Order ──────────────────────────────────────────────────
async function checkoutSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const get  = id => (form.querySelector('#' + id)?.value || '').trim();

  const prenom    = get('order-prenom');
  const nom       = get('order-nom');
  const telephone = get('order-telephone');
  const adresse   = get('order-adresse');
  const quartier  = get('order-quartier');
  const notes     = get('order-notes');

  const paymentMethod =
    form.querySelector('input[name="payment"]:checked')?.value || 'whatsapp';

  // Client-side validation
  if (!prenom || !nom || !telephone || !adresse) {
    showToast('Veuillez remplir tous les champs obligatoires (*).', 'error');
    // Highlight missing fields
    [
      ['order-prenom', prenom],
      ['order-nom', nom],
      ['order-telephone', telephone],
      ['order-adresse', adresse],
    ].forEach(([id, val]) => {
      const el = form.querySelector('#' + id);
      if (el) el.classList.toggle('input-error', !val);
    });
    return;
  }

  const orderData = {
    prenom,
    nom,
    telephone,
    adresse,
    quartier,
    notes,
    ville: 'Dakar',
    items: CART.map(i => ({
      id:    i.id,
      name:  i.name,
      price: i.price,
      qty:   i.qty,
    })),
    total: cartTotal(),
  };

  const btn = form.querySelector('[type="submit"]');
  const originalText = btn.textContent;
  btn.disabled    = true;
  btn.textContent = 'Traitement en cours…';

  try {
    if (paymentMethod === 'wave') {
      const res = await API.orderWave(orderData);
      const d   = res.data;

      if (d.demo) {
        showToast(
          'Mode démo Wave — ' + (d.message || 'Configurez WAVE_API_KEY dans .env'),
          'info'
        );
        cartClear();
        checkoutClose();
        form.reset();
        return;
      }

      if (d.paymentUrl) {
        cartClear();
        checkoutClose();
        form.reset();
        window.location.href = d.paymentUrl;
        return;
      }

      showToast('Erreur Wave : impossible d\'obtenir l\'URL de paiement.', 'error');

    } else if (paymentMethod === 'orange_money') {
      const res = await API.orderOrangeMoney(orderData);
      const d   = res.data;

      if (d.demo) {
        showToast(
          'Mode démo Orange Money — Configurez OM_CLIENT_ID dans .env',
          'info'
        );
        cartClear();
        checkoutClose();
        form.reset();
        return;
      }

      if (d.paymentUrl) {
        cartClear();
        checkoutClose();
        form.reset();
        window.location.href = d.paymentUrl;
        return;
      }

      showToast('Erreur Orange Money : impossible d\'obtenir l\'URL de paiement.', 'error');

    } else {
      // WhatsApp (default)
      const res = await API.orderWhatsapp(orderData);
      const d   = res.data;

      if (d.whatsappUrl) {
        cartClear();
        checkoutClose();
        form.reset();
        window.open(d.whatsappUrl, '_blank');
        showToast('✓ Commande envoyée via WhatsApp !', 'success');
        return;
      }

      showToast('Erreur lors de la création de la commande.', 'error');
    }

  } catch (err) {
    showToast(
      err.message || 'Erreur de connexion. Vérifiez que le serveur est démarré.',
      'error'
    );
  } finally {
    btn.disabled    = false;
    btn.textContent = originalText;
  }
}

// ── Inject Cart Drawer HTML ───────────────────────────────────────
function injectCartDrawer() {
  if (document.getElementById('cart-drawer')) return; // already injected

  const html = /* html */`
    <!-- Cart Overlay -->
    <div id="cart-overlay" class="cart-overlay" onclick="cartClose()" aria-hidden="true"></div>

    <!-- Cart Drawer -->
    <aside id="cart-drawer" class="cart-drawer" role="dialog" aria-modal="true" aria-label="Panier d'achat">
      <div class="cart-drawer-header">
        <h2 class="cart-drawer-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96C5 16.1 6.1 17 7 17h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63H19c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0023.5 4H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
          </svg>
          Mon Panier
        </h2>
        <button class="cart-close-btn" onclick="cartClose()" aria-label="Fermer le panier">✕</button>
      </div>

      <div class="cart-drawer-body">
        <!-- Empty state -->
        <div id="cart-empty" class="cart-empty">
          <div class="cart-empty-icon">🛍️</div>
          <p>Votre panier est vide</p>
          <a href="produits.html" class="btn btn-primary btn-sm" onclick="cartClose()">
            Découvrir nos produits
          </a>
        </div>

        <!-- Items list -->
        <ul id="cart-items-list" class="cart-items-list" aria-label="Articles dans le panier"></ul>
      </div>

      <!-- Summary -->
      <div id="cart-summary" class="cart-summary" style="display:none">
        <div class="cart-summary-row cart-summary-total">
          <span>Total</span>
          <span id="cart-total" class="fw-bold">0&nbsp;FCFA</span>
        </div>
        <p class="cart-summary-note">
          🚚 Livraison calculée à la confirmation de commande
        </p>
        <button class="cart-clear-btn" onclick="cartClear(); cartRenderItems();">
          🗑 Vider le panier
        </button>
      </div>

      <div class="cart-drawer-footer">
        <button class="btn-checkout" onclick="checkoutOpen()">
          Commander maintenant →
        </button>
      </div>
    </aside>

    <!-- ── Checkout Form ── -->
    <div id="checkout-form-wrap" class="checkout-form-wrap" role="dialog" aria-modal="true" aria-label="Finaliser la commande">
      <div class="checkout-form-header">
        <button class="cart-close-btn" onclick="checkoutClose()" title="Retour au panier">
          ← Retour
        </button>
        <h3>Finaliser la commande</h3>
      </div>

      <form
        id="order-form"
        class="order-form"
        onsubmit="checkoutSubmit(event)"
        novalidate
        autocomplete="on"
      >
        <!-- Recap -->
        <div class="order-recap">
          <div class="order-recap-title">📦 Récapitulatif</div>
          <ul id="order-recap-list" class="order-recap-list"></ul>
          <div class="order-recap-total">
            Total :
            <strong id="order-recap-total-amount"></strong>
          </div>
        </div>

        <!-- Customer Info -->
        <div class="order-form-grid">
          <div class="order-form-group">
            <label for="order-prenom">Prénom <span class="req" aria-hidden="true">*</span></label>
            <input
              id="order-prenom"
              name="prenom"
              class="order-input"
              type="text"
              placeholder="Votre prénom"
              required
              autocomplete="given-name"
            >
          </div>
          <div class="order-form-group">
            <label for="order-nom">Nom <span class="req" aria-hidden="true">*</span></label>
            <input
              id="order-nom"
              name="nom"
              class="order-input"
              type="text"
              placeholder="Votre nom de famille"
              required
              autocomplete="family-name"
            >
          </div>
          <div class="order-form-group">
            <label for="order-telephone">Téléphone <span class="req" aria-hidden="true">*</span></label>
            <input
              id="order-telephone"
              name="telephone"
              class="order-input"
              type="tel"
              placeholder="7X XXX XX XX"
              required
              autocomplete="tel"
            >
          </div>
          <div class="order-form-group">
            <label for="order-adresse">Adresse <span class="req" aria-hidden="true">*</span></label>
            <input
              id="order-adresse"
              name="adresse"
              class="order-input"
              type="text"
              placeholder="Votre adresse complète"
              required
              autocomplete="street-address"
            >
          </div>
          <div class="order-form-group">
            <label for="order-quartier">Quartier</label>
            <input
              id="order-quartier"
              name="quartier"
              class="order-input"
              type="text"
              placeholder="Ex : Plateau, Almadies, HLM…"
              autocomplete="address-level2"
            >
          </div>
        </div>

        <textarea
          id="order-notes"
          name="notes"
          class="order-input order-textarea"
          placeholder="Notes / Instructions de livraison (optionnel)…"
          rows="3"
        ></textarea>

        <!-- Payment Methods -->
        <div class="payment-methods">
          <div class="payment-methods-title">💳 Mode de paiement</div>
          <div class="payment-methods-grid">

            <label class="payment-option">
              <input type="radio" name="payment" value="whatsapp" checked>
              <span class="payment-option-inner">
                <span class="payment-option-icon">📱</span>
                <span class="payment-option-info">
                  <strong>WhatsApp</strong>
                  <span>Confirmez par message — toujours disponible</span>
                </span>
              </span>
            </label>

            <label class="payment-option">
              <input type="radio" name="payment" value="wave">
              <span class="payment-option-inner wave">
                <span class="payment-option-icon">🌊</span>
                <span class="payment-option-info">
                  <strong>Wave</strong>
                  <span>Paiement mobile instantané et sécurisé</span>
                </span>
              </span>
            </label>

            <label class="payment-option">
              <input type="radio" name="payment" value="orange_money">
              <span class="payment-option-inner om">
                <span class="payment-option-icon">🟠</span>
                <span class="payment-option-info">
                  <strong>Orange Money</strong>
                  <span>Paiement via Orange Money Sénégal</span>
                </span>
              </span>
            </label>

          </div>
        </div>

        <button type="submit" class="btn-submit-order">
          Confirmer la commande
        </button>

        <p class="order-note">
          🔒 Vos données personnelles sont protégées et ne seront jamais partagées avec des tiers.
        </p>
      </form>
    </div>

    <!-- ── Cart Toast ── -->
    <div id="cart-toast" class="cart-toast" role="status" aria-live="polite" aria-atomic="true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
      </svg>
      <span class="toast-msg"></span>
    </div>

    <!-- ── Global Toast ── -->
    <div id="global-toast" class="global-toast" role="alert" aria-live="assertive" aria-atomic="true">
      <span class="toast-msg"></span>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);
}
