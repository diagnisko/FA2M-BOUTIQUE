'use strict';
/* ================================================================
   FA2M — Main Init  |  v2.0
   Handles: home, products, contact, paiement-succes, paiement-erreur
   ================================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  // ── Always init ───────────────────────────────────────────────
  cartLoad();
  injectCartDrawer();
  cartUpdateUI();
  initHeader();
  initHamburger();
  setActiveNav();
  initReveal();

  // ── Global keyboard shortcuts ────────────────────────────────
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      cartClose();
      closeProductModal();
      checkoutClose();
    }
  });

  // ── Close modal on overlay click ─────────────────────────────
  document.getElementById('product-modal-overlay')
    ?.addEventListener('click', e => {
      if (e.target === e.currentTarget) closeProductModal();
    });

  // ── Remove input-error class on input ────────────────────────
  document.addEventListener('input', e => {
    if (e.target.classList.contains('input-error')) {
      e.target.classList.remove('input-error');
    }
  });

  // ── Route to page init ───────────────────────────────────────
  const page = document.body.dataset.page;

  switch (page) {
    case 'home':     await initHomePage();    break;
    case 'products': await initProductsPage(); break;
    case 'contact':       initContactPage();  break;
    case 'success':       initSuccessPage();  break;
    case 'error':         initErrorPage();    break;
    default: break;
  }
});


/* ================================================================
   HOME PAGE
   ================================================================ */
async function initHomePage() {

  // Typing effect removed

  // Particles removed

  // Animated counters
  initCounters();

  // Testimonials carousel
  initCarousel(
    document.querySelector('.testimonials-track'),
    document.querySelector('.carousel-dots'),
    document.querySelector('.carousel-btn-prev'),
    document.querySelector('.carousel-btn-next')
  );

  // ── Load hero products from API ──────────────────────────────
  const heroGrid = document.getElementById('hero-products-container');
  if (heroGrid) {
    try {
      const res      = await API.getProducts({ sort: 'rating' });
      const products = (res.data || []).slice(0, 4);

      if (products.length === 0) {
        heroGrid.innerHTML = `
          <p style="color:var(--text-2);text-align:center;padding:3rem;grid-column:1/-1">
            Produits en cours de chargement...
          </p>`;
      } else {
        heroGrid.innerHTML = products.map(p => renderProductCard(p)).join('');
        initReveal();
        initCardTilt();
      }
    } catch (err) {
      heroGrid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--danger)">
          <p style="font-size:1.5rem">⚠️</p>
          <p>Impossible de charger les produits vedettes.</p>
        </div>`;
    }
  }

  // ── Load bestsellers from API ──────────────────────────────
  const bestGrid = document.getElementById('bestsellers-grid');
  if (bestGrid) {
    // Show skeleton placeholders while loading
    bestGrid.innerHTML = `
      <div class="skeleton" style="height:360px;border-radius:16px"></div>
      <div class="skeleton" style="height:360px;border-radius:16px"></div>
      <div class="skeleton" style="height:360px;border-radius:16px"></div>
      <div class="skeleton" style="height:360px;border-radius:16px"></div>
    `;

    try {
      const res      = await API.getProducts({ sort: 'rating' });
      const products = (res.data || []).slice(0, 4);

      if (products.length === 0) {
        bestGrid.innerHTML = `
          <p style="color:var(--text-2);text-align:center;padding:3rem;grid-column:1/-1">
            Aucun produit disponible pour le moment.
          </p>`;
      } else {
        bestGrid.innerHTML = products.map(p => renderProductCard(p)).join('');
        initReveal();
        initCardTilt();
      }
    } catch (err) {
      bestGrid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-2)">
          <p style="font-size:2rem;margin-bottom:.5rem">⚠️</p>
          <p><strong>Impossible de charger les produits.</strong></p>
          <p style="margin-top:.5rem;font-size:.875rem">
            Vérifiez que le serveur backend est démarré :<br>
            <code style="color:var(--accent)">cd backend && npm start</code>
          </p>
        </div>`;
    }
  }

  // ── Newsletter form ────────────────────────────────────────
  const nlForm = document.getElementById('newsletter-form');
  if (nlForm) {
    nlForm.addEventListener('submit', e => {
      e.preventDefault();
      const emailInput = nlForm.querySelector('[type="email"]');
      if (!emailInput || !emailInput.value.trim()) {
        showToast('Veuillez entrer une adresse email valide.', 'warning');
        return;
      }
      showToast('✓ Merci pour votre inscription à la newsletter !', 'success');
      nlForm.reset();
    });
  }

  // ── Wishlist buttons (cosmetic) ────────────────────────────
  document.addEventListener('click', e => {
    if (e.target.classList.contains('product-wishlist')) {
      const btn   = e.target;
      const added = btn.dataset.wishlisted === '1';
      btn.dataset.wishlisted = added ? '0' : '1';
      btn.textContent        = added ? '♡' : '♥';
      btn.style.color        = added ? '' : 'var(--accent)';
      showToast(added ? 'Retiré des favoris' : '♥ Ajouté aux favoris', 'success');
    }
  });
}


/* ================================================================
   PRODUCTS PAGE
   ================================================================ */
async function initProductsPage() {

  let allProducts = [];
  const grid      = document.getElementById('products-grid');
  const countEl   = document.getElementById('products-count');
  const loaderEl  = document.getElementById('products-loader');

  // Show loader
  if (loaderEl) loaderEl.style.display = 'block';
  if (grid)     grid.innerHTML = '';

  // ── Fetch all products ─────────────────────────────────────
  try {
    const res  = await API.getProducts();
    allProducts = res.data || [];
  } catch (err) {
    if (loaderEl) loaderEl.style.display = 'none';
    if (grid) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:4rem;color:var(--text-2)">
          <p style="font-size:2rem;margin-bottom:.5rem">⚠️</p>
          <p><strong>Erreur de chargement des produits.</strong></p>
          <p style="margin-top:.5rem;font-size:.875rem">
            Vérifiez que le serveur backend est démarré :<br>
            <code style="color:var(--accent)">cd backend && npm start</code>
          </p>
        </div>`;
    }
    return;
  }

  if (loaderEl) loaderEl.style.display = 'none';

  // ── Filter state ───────────────────────────────────────────
  const filters = {
    category: 'tous',
    search:   '',
    sort:     'newest',
  };

  // ── Render filtered list ───────────────────────────────────
  function render() {
    let list = [...allProducts];

    // Category filter
    if (filters.category !== 'tous') {
      list = list.filter(p => p.category === filters.category);
    }

    // Text search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(p =>
        (p.name        || '').toLowerCase().includes(q) ||
        (p.short_desc  || '').toLowerCase().includes(q) ||
        (p.category    || '').toLowerCase().includes(q)
      );
    }

    // Sort
    switch (filters.sort) {
      case 'price_asc':  list.sort((a, b) => a.price   - b.price);   break;
      case 'price_desc': list.sort((a, b) => b.price   - a.price);   break;
      case 'rating':     list.sort((a, b) => b.rating  - a.rating);  break;
      default:           list.sort((a, b) => b.id      - a.id);      break;
    }

    // Update count
    if (countEl) {
      countEl.textContent =
        list.length + ' produit' + (list.length !== 1 ? 's' : '');
    }

    // Render grid
    if (grid) {
      if (list.length === 0) {
        grid.innerHTML = `
          <div style="grid-column:1/-1;text-align:center;padding:4rem;color:var(--text-2)">
            <p style="font-size:2rem;margin-bottom:.5rem">🔍</p>
            <p>Aucun produit ne correspond à votre recherche.</p>
            <button
              class="btn btn-ghost btn-sm"
              style="margin-top:1rem"
              onclick="resetFilters()"
            >Réinitialiser les filtres</button>
          </div>`;
      } else {
        grid.innerHTML = list.map(p => renderProductCard(p)).join('');
        initReveal();
        initCardTilt();
      }
    }
  }

  // ── Expose resetFilters globally ───────────────────────────
  window.resetFilters = function () {
    filters.category = 'tous';
    filters.search   = '';
    filters.sort     = 'newest';

    const searchInput = document.getElementById('filter-search');
    const sortSelect  = document.getElementById('filter-sort');
    if (searchInput) searchInput.value = '';
    if (sortSelect)  sortSelect.value  = 'newest';

    document.querySelectorAll('.cat-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.cat === 'tous' || !b.dataset.cat);
    });

    render();
  };

  // ── Initial render ─────────────────────────────────────────
  render();

  // ── Category buttons ───────────────────────────────────────
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filters.category = btn.dataset.cat || 'tous';
      render();
    });
  });

  // ── Search input (debounced) ───────────────────────────────
  const searchInput = document.getElementById('filter-search');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', e => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        filters.search = e.target.value.trim();
        render();
      }, 250);
    });

    // Clear on Escape
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        filters.search    = '';
        render();
      }
    });
  }

  // ── Sort select ────────────────────────────────────────────
  const sortSelect = document.getElementById('filter-sort');
  if (sortSelect) {
    sortSelect.addEventListener('change', e => {
      filters.sort = e.target.value;
      render();
    });
  }

  // ── Wishlist buttons (cosmetic) ────────────────────────────
  document.addEventListener('click', e => {
    if (e.target.classList.contains('product-wishlist')) {
      const btn   = e.target;
      const added = btn.dataset.wishlisted === '1';
      btn.dataset.wishlisted = added ? '0' : '1';
      btn.textContent        = added ? '♡' : '♥';
      btn.style.color        = added ? '' : 'var(--accent)';
    }
  });
}


/* ================================================================
   CONTACT PAGE
   ================================================================ */
function initContactPage() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const btn  = form.querySelector('[type="submit"]');
    const data = Object.fromEntries(new FormData(form));

    if (!data.nom || !data.email || !data.message) {
      showToast('Veuillez remplir tous les champs obligatoires.', 'error');
      return;
    }

    // Simple email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      showToast('Veuillez entrer une adresse email valide.', 'error');
      return;
    }

    btn.disabled    = true;
    btn.textContent = 'Envoi en cours…';

    // Build WhatsApp message as primary channel
    const lines = [
      '📩 *Message via FA2M*',
      '━━━━━━━━━━━━━━━━━━━━━━',
      '',
      `👤 Nom     : ${data.nom}`,
      `📧 Email   : ${data.email}`,
      `📌 Sujet   : ${data.sujet || 'Non précisé'}`,
      '',
      `💬 Message :`,
      data.message,
    ];

    const waUrl = `https://wa.me/${FA2M_CONFIG.SHOP_PHONE}?text=${encodeURIComponent(lines.join('\n'))}`;

    // Small delay for UX
    await new Promise(r => setTimeout(r, 500));

    window.open(waUrl, '_blank');
    showToast('✓ WhatsApp ouvert avec votre message.', 'success');
    form.reset();

    btn.disabled    = false;
    btn.textContent = 'Envoyer le message';
  });
}


/* ================================================================
   PAYMENT SUCCESS PAGE
   ================================================================ */
function initSuccessPage() {
  const params  = new URLSearchParams(location.search);
  const orderId = params.get('order');

  // Display order reference
  const refEl = document.getElementById('order-ref');
  if (refEl && orderId) {
    refEl.textContent = orderId;
  }

  // Animate the checkmark
  const checkEl = document.getElementById('success-check');
  if (checkEl) {
    checkEl.style.animation = 'none';
    setTimeout(() => { checkEl.style.animation = ''; }, 10);
  }

  // Confetti removed for clean design
}


/* ================================================================
   PAYMENT ERROR PAGE
   ================================================================ */
function initErrorPage() {
  const params  = new URLSearchParams(location.search);
  const orderId = params.get('order');

  // Show order reference if available
  const refEl = document.getElementById('error-order-ref');
  if (refEl && orderId) {
    refEl.textContent = orderId;
    refEl.closest('[id="error-ref-wrap"]')?.removeAttribute('hidden');
  }

  // WhatsApp support button
  const waBtn = document.getElementById('btn-wa-support');
  if (waBtn) {
    const msg = orderId
      ? `Bonjour FA2M, j'ai eu un problème de paiement pour ma commande ${orderId}. Pouvez-vous m'aider ?`
      : `Bonjour FA2M, j'ai eu un problème lors du paiement. Pouvez-vous m'aider ?`;

    waBtn.href = `https://wa.me/${FA2M_CONFIG.SHOP_PHONE}?text=${encodeURIComponent(msg)}`;
  }
}
