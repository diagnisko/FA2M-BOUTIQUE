'use strict';
/* ================================================================
   FA2M Admin — App  |  v2.0
   All page logic: login, dashboard, orders, products
   ================================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  const page = document.body.dataset.page;

  switch (page) {
    case 'login':    initLoginPage();    break;
    case 'dashboard': await initDashboard(); break;
    case 'orders':   await initOrdersPage(); break;
    case 'products': await initProductsPage(); break;
    default: break;
  }
});


/* ================================================================
   LOGIN PAGE
   ================================================================ */
async function initLoginPage() {
  // If already authenticated, redirect to dashboard
  const ok = await verifyAuth();
  if (ok) { window.location.href = 'index.html'; return; }

  const form   = document.getElementById('login-form');
  const errEl  = document.getElementById('login-error');
  const btnEl  = form?.querySelector('[type="submit"]');

  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (errEl) errEl.style.display = 'none';
    if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Connexion…'; }

    try {
      const username = form.querySelector('#username').value.trim();
      const password = form.querySelector('#password').value;

      if (!username || !password) {
        throw new Error('Veuillez remplir tous les champs.');
      }

      await adminLogin(username, password);
      window.location.href = 'index.html';

    } catch (err) {
      if (errEl) {
        errEl.textContent   = err.message || 'Erreur de connexion.';
        errEl.style.display = 'block';
        errEl.focus();
      }
      // Shake form animation
      form.classList.add('shake');
      setTimeout(() => form.classList.remove('shake'), 500);

    } finally {
      if (btnEl) { btnEl.disabled = false; btnEl.textContent = 'Se connecter'; }
    }
  });

  // Focus first field
  form.querySelector('#username')?.focus();
}


/* ================================================================
   DASHBOARD PAGE
   ================================================================ */
async function initDashboard() {
  await requireAuth();
  populateUserBadge();
  initSidebarLogout();

  // Load stats
  try {
    const res = await Orders.stats();
    const s   = res.data;

    // Stat cards
    _setText('stat-total',   s.totalOrders);
    _setText('stat-new',     s.newOrders);
    _setText('stat-revenue', formatCFA(s.revenue));
    _setText('stat-pending', s.pendingOrders);

    // Revenue mini-chart
    renderRevenueChart(s.revenueByMonth || []);

    // Recent orders table
    const recentRes = await Orders.list({ limit: 5, page: 1 });
    renderOrdersTable(recentRes.data?.orders || [], 'recent-orders-tbody', true);

  } catch (err) {
    console.error('[dashboard]', err);
    showAdminToast('Erreur de chargement : ' + err.message, 'error');
  }
}

function renderRevenueChart(months) {
  const chart = document.getElementById('revenue-chart');
  if (!chart || !months.length) return;

  const max = Math.max(...months.map(m => m.total), 1);

  chart.innerHTML = months.map(m => {
    const pct   = Math.round((m.total / max) * 100);
    const label = (m.month || '—').split(' ')[0]; // just month name
    return `
      <div class="chart-bar-wrap" title="${m.month}: ${formatCFA(m.total)}">
        <div class="chart-bar-bg">
          <div class="chart-bar" style="height:${pct}%" aria-label="${m.month} ${formatCFA(m.total)}"></div>
        </div>
        <span class="chart-label">${escHtml(label)}</span>
      </div>`;
  }).join('');
}


/* ================================================================
   ORDERS PAGE
   ================================================================ */
let _ordersParams = { page: 1, limit: 20 };
let _ordersTotal  = 0;
let _ordersPages  = 1;

async function initOrdersPage() {
  await requireAuth();
  populateUserBadge();
  initSidebarLogout();

  await loadOrders();

  // ── Status filter tabs ────────────────────────────────────────
  document.querySelectorAll('[data-status-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-status-filter]')
        .forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const val = btn.dataset.statusFilter;
      if (val === 'all') {
        delete _ordersParams.status;
      } else {
        _ordersParams.status = val;
      }
      _ordersParams.page = 1;
      loadOrders();
    });
  });

  // ── Search input ──────────────────────────────────────────────
  const searchInput = document.getElementById('orders-search');
  let searchTimer;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        _ordersParams.search = searchInput.value.trim() || undefined;
        _ordersParams.page   = 1;
        loadOrders();
      }, 300);
    });
  }

  // ── Close modal on overlay click ──────────────────────────────
  document.getElementById('order-modal')
    ?.addEventListener('click', e => {
      if (e.target === e.currentTarget) closeOrderModal();
    });
}

async function loadOrders() {
  const tbody = document.getElementById('orders-tbody');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;padding:2.5rem;color:var(--text-2)">
          Chargement…
        </td>
      </tr>`;
  }

  try {
    const res = await Orders.list(_ordersParams);
    const { orders, total, page, pages } = res.data;

    _ordersTotal = total;
    _ordersPages = pages;

    renderOrdersTable(orders, 'orders-tbody', false);
    renderPagination(page, pages, total);

  } catch (err) {
    console.error('[orders/load]', err);
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center;padding:2rem;color:var(--danger)">
            Erreur : ${escHtml(err.message)}
          </td>
        </tr>`;
    }
  }
}

function renderOrdersTable(orders, tbodyId, minimal) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  if (!orders || orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="${minimal ? 5 : 7}"
            style="text-align:center;padding:2.5rem;color:var(--text-2)">
          Aucune commande trouvée.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = orders.map(o => {
    const statusInfo  = STATUS_MAP[o.status]  || { label: o.status,  cls: '',      emoji: '' };
    const payInfo     = PAYMENT_MAP[o.payment_method] || { label: o.payment_method, icon: '?' };

    if (minimal) {
      return `
        <tr class="clickable-row" onclick="openOrderModal('${escHtml(o.id)}')">
          <td><code class="order-id">${escHtml(o.id)}</code></td>
          <td>${escHtml(o.prenom)} ${escHtml(o.nom)}</td>
          <td>${formatCFA(o.total)}</td>
          <td>
            <span class="status-badge ${statusInfo.cls}">
              ${statusInfo.emoji} ${statusInfo.label}
            </span>
          </td>
          <td>${formatDate(o.created_at)}</td>
        </tr>`;
    }

    return `
      <tr class="clickable-row" onclick="openOrderModal('${escHtml(o.id)}')">
        <td><code class="order-id">${escHtml(o.id)}</code></td>
        <td>
          <strong>${escHtml(o.prenom)} ${escHtml(o.nom)}</strong><br>
          <span style="color:var(--text-2);font-size:.8rem">${escHtml(o.telephone)}</span>
        </td>
        <td>${escHtml(o.adresse)}${o.quartier ? ', ' + escHtml(o.quartier) : ''}</td>
        <td class="fw-bold">${formatCFA(o.total)}</td>
        <td>
          <span class="payment-badge">
            ${payInfo.icon} ${payInfo.label}
          </span>
        </td>
        <td>
          <span class="status-badge ${statusInfo.cls}">
            ${statusInfo.emoji} ${statusInfo.label}
          </span>
        </td>
        <td style="color:var(--text-2);font-size:.85rem;white-space:nowrap">
          ${formatDate(o.created_at)}
        </td>
      </tr>`;
  }).join('');
}

function renderPagination(page, pages, total) {
  const container = document.getElementById('orders-pagination');
  if (!container) return;

  if (pages <= 1) { container.innerHTML = ''; return; }

  const prev = page > 1
    ? `<button class="btn btn-sm btn-ghost" onclick="changePage(${page - 1})">← Préc.</button>`
    : `<button class="btn btn-sm btn-ghost" disabled>← Préc.</button>`;

  const next = page < pages
    ? `<button class="btn btn-sm btn-ghost" onclick="changePage(${page + 1})">Suiv. →</button>`
    : `<button class="btn btn-sm btn-ghost" disabled>Suiv. →</button>`;

  container.innerHTML = `
    <div class="pagination-wrap">
      ${prev}
      <span class="page-info">Page ${page} / ${pages} — ${total} commande${total > 1 ? 's' : ''}</span>
      ${next}
    </div>`;
}

function changePage(p) {
  _ordersParams.page = p;
  loadOrders();
  document.getElementById('orders-tbody')?.scrollIntoView({ behavior: 'smooth' });
}

// ── Order Detail Modal ────────────────────────────────────────────
async function openOrderModal(id) {
  const modal = document.getElementById('order-modal');
  if (!modal) return;

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  try {
    console.log('[openOrderModal]', 'Fetching order:', id);
    const res = await Orders.get(id);
    console.log('[openOrderModal]', 'Response:', res);
    
    if (!res || !res.success) {
      throw new Error(res?.message || 'Réponse API invalide');
    }
    
    const o = res.data;
    if (!o) {
      throw new Error('Aucun détail de commande retourné');
    }
    
    renderOrderModalContent(o);
  } catch (err) {
    console.error('[openOrderModal]', 'Error:', err);
    const content = modal.querySelector('.admin-modal-body');
    if (content) {
      content.innerHTML = `
        <div style="text-align:center;padding:3rem;color:var(--danger)">
          <strong>Erreur :</strong><br>
          ${escHtml(err.message)}<br>
          <br>
          <button class="btn btn-sm btn-ghost" onclick="closeOrderModal()">Fermer</button>
        </div>`;
    }
    showAdminToast('Erreur : ' + err.message, 'error');
  }
}

function renderOrderModalContent(o) {
  const statusInfo  = STATUS_MAP[o.status]  || { label: o.status, cls: '' };
  const payInfo     = PAYMENT_MAP[o.payment_method] || { label: o.payment_method, icon: '?' };

  // Debug: Log items
  console.log('[renderOrderModalContent]', 'Order ID:', o.id, 'Items:', o.items);

  const itemsHtml = (o.items || []).length > 0
    ? (o.items || []).map(i => `
    <tr>
      <td>${escHtml(i.name)}</td>
      <td style="text-align:center">${i.qty}</td>
      <td style="text-align:right">${formatCFA(i.price)}</td>
      <td style="text-align:right;font-weight:600">${formatCFA(i.price * i.qty)}</td>
    </tr>`).join('')
    : '<tr><td colspan="4" style="text-align:center;color:var(--text-2);padding:1rem">Aucun article</td></tr>';

  _setText('modal-order-id',      o.id);
  _setText('modal-order-client',  `${o.prenom} ${o.nom}`);
  _setText('modal-order-tel',     o.telephone);
  _setText('modal-order-adresse', o.adresse + (o.quartier ? ', ' + o.quartier : '') + ' — ' + (o.ville || 'Dakar'));
  _setText('modal-order-total',   formatCFA(o.total));
  _setText('modal-order-date',    formatDate(o.created_at));
  _setText('modal-order-payment', `${payInfo.icon} ${payInfo.label}`);

  if (o.notes) {
    _setText('modal-order-notes', o.notes);
    document.getElementById('modal-notes-row')?.removeAttribute('hidden');
  } else {
    document.getElementById('modal-notes-row')?.setAttribute('hidden', '');
  }

  // Insert items into table
  const itemsTbody = document.getElementById('modal-order-items');
  if (itemsTbody) {
    itemsTbody.innerHTML = itemsHtml;
  } else {
    console.warn('[renderOrderModalContent]', 'modal-order-items tbody not found!');
  }

  // Status select
  const statusSel = document.getElementById('modal-order-status');
  if (statusSel) {
    statusSel.value          = o.status;
    statusSel.dataset.orderId = o.id;
  }

  // Status badge
  const statusBadge = document.getElementById('modal-current-status');
  if (statusBadge) {
    statusBadge.textContent = `${statusInfo.label}`;
    statusBadge.className   = `status-badge ${statusInfo.cls}`;
  }
}

async function saveOrderStatus() {
  const sel = document.getElementById('modal-order-status');
  if (!sel) return;

  const id     = sel.dataset.orderId;
  const status = sel.value;

  try {
    await Orders.updateStatus(id, status);
    showAdminToast('✓ Statut mis à jour avec succès.');
    closeOrderModal();
    loadOrders();
  } catch (err) {
    showAdminToast('Erreur : ' + err.message, 'error');
  }
}

function closeOrderModal() {
  document.getElementById('order-modal')?.classList.remove('open');
  document.body.style.overflow = '';
}


/* ================================================================
   PRODUCTS PAGE
   ================================================================ */
async function initProductsPage() {
  await requireAuth();
  populateUserBadge();
  initSidebarLogout();

  await loadProducts();

  // ── Add product button ────────────────────────────────────────
  document.getElementById('btn-add-product')
    ?.addEventListener('click', () => openProductForm(null));

  // ── Reset to defaults ─────────────────────────────────────────
  document.getElementById('btn-reset-products')
    ?.addEventListener('click', async () => {
      if (!confirm(
        'Réinitialiser tous les produits aux valeurs par défaut ?\n\n' +
        'Cette action supprimera tous les produits actuels et les remplacera par les 8 produits de base.'
      )) return;

      try {
        await Products.reset();
        showAdminToast('✓ Produits réinitialisés.');
        loadProducts();
      } catch (err) {
        showAdminToast('Erreur : ' + err.message, 'error');
      }
    });

  // ── Product search ────────────────────────────────────────────
  const searchInput = document.getElementById('products-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase();
      document.querySelectorAll('#products-tbody tr[data-product-name]').forEach(row => {
        const name = row.dataset.productName.toLowerCase();
        row.style.display = name.includes(q) ? '' : 'none';
      });
    });
  }

  // ── Close modals on overlay click ─────────────────────────────
  document.getElementById('product-modal')
    ?.addEventListener('click', e => {
      if (e.target === e.currentTarget) closeProductModal();
    });
}

async function loadProducts() {
  const tbody   = document.getElementById('products-tbody');
  const countEl = document.getElementById('products-count');

  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;padding:2.5rem;color:var(--text-2)">
          Chargement…
        </td>
      </tr>`;
  }

  try {
    const res      = await Products.list();
    const products = res.data || [];

    if (countEl) countEl.textContent = products.length + ' produit(s)';

    if (!tbody) return;

    if (products.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center;padding:3rem;color:var(--text-2)">
            Aucun produit. Cliquez sur "Ajouter" pour créer le premier.
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = products.map(p => {
      const badgeHtml = p.badge
        ? `<span class="badge-tag badge-${p.badge.toLowerCase()}">${escHtml(p.badge)}</span>`
        : '<span style="color:var(--muted)">—</span>';

      return `
        <tr data-product-name="${escHtml(p.name)}">
          <td>
            <img
              class="thumb"
              src="${escHtml(p.image || '')}"
              alt="${escHtml(p.name)}"
              loading="lazy"
              onerror="this.style.display='none'"
            >
          </td>
          <td>
            <strong>${escHtml(p.name)}</strong>
            <br>
            <span style="color:var(--text-2);font-size:.8rem">
              ${starsText(p.rating)} (${p.reviews})
            </span>
          </td>
          <td><span class="cat-tag">${escHtml(p.category)}</span></td>
          <td class="fw-bold">${formatCFA(p.price)}</td>
          <td>
            <span style="color:${p.stock > 5 ? 'var(--accent)' : p.stock > 0 ? 'var(--warning)' : 'var(--danger)'}">
              ${p.stock}
            </span>
          </td>
          <td>${badgeHtml}</td>
          <td class="table-actions">
            <button
              class="btn btn-sm"
              onclick="openProductForm(${p.id})"
              title="Modifier ${escHtml(p.name)}"
            >
              ✏️ Éditer
            </button>
            <button
              class="btn btn-sm btn-danger"
              onclick="deleteProduct(${p.id}, '${escHtml(p.name).replace(/'/g, "\\'")}')"
              title="Supprimer ${escHtml(p.name)}"
            >
              🗑️
            </button>
          </td>
        </tr>`;
    }).join('');

  } catch (err) {
    console.error('[products/load]', err);
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center;padding:2rem;color:var(--danger)">
            Erreur : ${escHtml(err.message)}
          </td>
        </tr>`;
    }
  }
}

function starsText(rating) {
  const r = Math.round((rating || 0) * 2) / 2;
  return '★'.repeat(Math.floor(r)) + (r % 1 ? '½' : '') + '☆'.repeat(5 - Math.ceil(r));
}

// ── Product Form Modal ────────────────────────────────────────────
async function openProductForm(id) {
  const modal     = document.getElementById('product-modal');
  const titleEl   = document.getElementById('product-form-title');
  const idInput   = document.getElementById('product-form-id');
  const form      = document.getElementById('product-form');

  if (!modal || !form) return;

  form.reset();
  renderSpecsEditor([]);
  clearImagePreview();

  if (id) {
    if (titleEl) titleEl.textContent = 'Modifier le produit';
    if (idInput) idInput.value = id;

    try {
      const res = await Products.get(id);
      const p   = res.data;
      fillProductForm(p);
    } catch (err) {
      showAdminToast('Erreur lors du chargement : ' + err.message, 'error');
      return;
    }
  } else {
    if (titleEl) titleEl.textContent = 'Nouveau produit';
    if (idInput) idInput.value = '';
  }

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  form.querySelector('#pf-name')?.focus();
}

function fillProductForm(p) {
  const f = id => document.getElementById(id);

  _setVal('pf-name',      p.name        || '');
  _setVal('pf-category',  p.category    || '');
  _setVal('pf-price',     p.price       || '');
  _setVal('pf-old-price', p.old_price   || '');
  _setVal('pf-badge',     p.badge       || '');
  _setVal('pf-stock',     p.stock       ?? '');
  _setVal('pf-rating',    p.rating      || '');
  _setVal('pf-reviews',   p.reviews     || '');
  _setVal('pf-short-desc', p.short_desc || '');
  _setVal('pf-long-desc',  p.long_desc  || '');
  _setVal('pf-image',     p.image       || '');

  const imagesArr = Array.isArray(p.images) ? p.images : [];
  _setVal('pf-images', imagesArr.join('\n'));

  // Image preview
  if (p.image) updateImagePreview(p.image);

  // Specs editor
  renderSpecsEditor(p.specs || []);
}

async function saveProductForm(e) {
  e.preventDefault();

  const form  = document.getElementById('product-form');
  const id    = document.getElementById('product-form-id')?.value;
  const btn   = form.querySelector('[type="submit"]');

  // Collect specs
  const specs = Array.from(
    document.querySelectorAll('#specs-editor .spec-row')
  ).map(row => [
    row.querySelector('.spec-key')?.value?.trim() || '',
    row.querySelector('.spec-val')?.value?.trim() || '',
  ]).filter(([k, v]) => k && v);

  // Collect images (one per line)
  const imagesRaw  = (_getVal('pf-images') || '').split('\n').map(s => s.trim()).filter(Boolean);
  const mainImage  = _getVal('pf-image') || imagesRaw[0] || '';

  const data = {
    name:       _getVal('pf-name')?.trim(),
    category:   _getVal('pf-category'),
    price:      Number(_getVal('pf-price')) || 0,
    old_price:  Number(_getVal('pf-old-price')) || null,
    badge:      _getVal('pf-badge') || null,
    stock:      parseInt(_getVal('pf-stock')) || 0,
    rating:     parseFloat(_getVal('pf-rating')) || 4.5,
    reviews:    parseInt(_getVal('pf-reviews')) || 0,
    short_desc: _getVal('pf-short-desc')?.trim() || null,
    long_desc:  _getVal('pf-long-desc')?.trim()  || null,
    image:      mainImage,
    images:     JSON.stringify(imagesRaw.length ? imagesRaw : [mainImage].filter(Boolean)),
    specs:      JSON.stringify(specs),
    active:     1,
  };

  // Validate
  if (!data.name)     { showAdminToast('Le nom est requis.',      'error'); return; }
  if (!data.category) { showAdminToast('La catégorie est requise.','error'); return; }
  if (!data.price)    { showAdminToast('Le prix est requis.',     'error'); return; }

  if (btn) { btn.disabled = true; btn.textContent = 'Enregistrement…'; }

  try {
    if (id) {
      await Products.update(id, data);
      showAdminToast('✓ Produit mis à jour.');
    } else {
      await Products.create(data);
      showAdminToast('✓ Produit créé avec succès.');
    }
    closeProductModal();
    loadProducts();
  } catch (err) {
    showAdminToast('Erreur : ' + err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Enregistrer'; }
  }
}

async function deleteProduct(id, name) {
  if (!confirm(`Supprimer le produit "${name}" ?\n\nCette action est irréversible.`)) return;
  try {
    await Products.delete(id);
    showAdminToast('✓ Produit supprimé.');
    loadProducts();
  } catch (err) {
    showAdminToast('Erreur : ' + err.message, 'error');
  }
}

function closeProductModal() {
  document.getElementById('product-modal')?.classList.remove('open');
  document.body.style.overflow = '';
}

// ── Specs Editor ──────────────────────────────────────────────────
function renderSpecsEditor(specs) {
  const container = document.getElementById('specs-editor');
  if (!container) return;

  container.innerHTML = (specs || []).map((s, i) => `
    <div class="spec-row">
      <input
        class="spec-key form-control"
        type="text"
        placeholder="Caractéristique (ex: Matière)"
        value="${escHtml(s[0] || '')}"
        aria-label="Nom de la caractéristique ${i + 1}"
      >
      <input
        class="spec-val form-control"
        type="text"
        placeholder="Valeur (ex: Cuir)"
        value="${escHtml(s[1] || '')}"
        aria-label="Valeur de la caractéristique ${i + 1}"
      >
      <button
        type="button"
        class="btn-rm-spec"
        onclick="removeSpec(this)"
        aria-label="Supprimer cette caractéristique"
      >✕</button>
    </div>`).join('');
}

function addSpec() {
  const container = document.getElementById('specs-editor');
  if (!container) return;

  const div = document.createElement('div');
  div.className = 'spec-row';
  div.innerHTML = `
    <input
      class="spec-key form-control"
      type="text"
      placeholder="Caractéristique (ex: Couleur)"
      aria-label="Nom de la caractéristique"
    >
    <input
      class="spec-val form-control"
      type="text"
      placeholder="Valeur (ex: Noir)"
      aria-label="Valeur de la caractéristique"
    >
    <button
      type="button"
      class="btn-rm-spec"
      onclick="removeSpec(this)"
      aria-label="Supprimer cette caractéristique"
    >✕</button>`;

  container.appendChild(div);
  div.querySelector('.spec-key')?.focus();
}

function removeSpec(btn) {
  btn.closest('.spec-row')?.remove();
}

// ── Image Tab Switching ───────────────────────────────────────────
function switchImageTab(tab) {
  // Update tab buttons
  document.querySelectorAll('.image-tab-btn').forEach(btn => {
    if (btn.dataset.tab === tab) {
      btn.classList.add('active');
      btn.style.color = 'var(--text)';
      btn.style.borderBottomColor = 'var(--accent)';
    } else {
      btn.classList.remove('active');
      btn.style.color = 'var(--text-2)';
      btn.style.borderBottomColor = 'transparent';
    }
  });

  // Update tab contents
  document.querySelectorAll('.image-tab-content').forEach(content => {
    if (content.id === `image-tab-${tab}`) {
      content.style.display = 'block';
    } else {
      content.style.display = 'none';
    }
  });
}

// ── Images Tab Switching ──────────────────────────────────────────
function switchImagesTab(tab) {
  // Update tab buttons
  document.querySelectorAll('.images-tab-btn').forEach(btn => {
    if (btn.dataset.tab === tab) {
      btn.classList.add('active');
      btn.style.color = 'var(--text)';
      btn.style.borderBottomColor = 'var(--accent)';
    } else {
      btn.classList.remove('active');
      btn.style.color = 'var(--text-2)';
      btn.style.borderBottomColor = 'transparent';
    }
  });

  // Update tab contents
  document.querySelectorAll('.images-tab-content').forEach(content => {
    if (content.id === `images-tab-${tab}`) {
      content.style.display = 'block';
    } else {
      content.style.display = 'none';
    }
  });
}

// ── Image File Upload ─────────────────────────────────────────────
async function handleImageUpload(file) {
  if (!file) return;

  // Validate file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    showAdminToast('L\'image dépasse 5MB.', 'error');
    return;
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    showAdminToast('Veuillez sélectionner une image.', 'error');
    return;
  }

  // Show progress
  const progress = document.getElementById('upload-progress');
  const status = document.getElementById('upload-status');
  const bar = document.getElementById('upload-bar');
  if (progress) progress.style.display = 'block';

  try {
    // Convert file to base64
    const reader = new FileReader();
    reader.onloadstart = () => {
      if (status) status.textContent = 'Conversion en cours...';
      if (bar) bar.style.width = '30%';
    };
    reader.onprogress = (e) => {
      const percent = (e.loaded / e.total) * 70 + 30;
      if (bar) bar.style.width = percent + '%';
    };
    reader.onload = async () => {
      if (status) status.textContent = 'Envoi en cours...';
      if (bar) bar.style.width = '70%';

      try {
        // Upload to server
        const res = await Products.upload(reader.result, `product-${Date.now()}`);

        if (res.success) {
          const imageUrl = res.url;
          
          // Update form field
          document.getElementById('pf-image').value = imageUrl;
          
          // Show preview
          updateImagePreview(imageUrl);
          
          if (status) status.textContent = '✓ Image uploadée avec succès!';
          if (bar) bar.style.width = '100%';
          if (bar) bar.style.background = 'var(--success)';
          
          // Clear progress after 2s
          setTimeout(() => {
            if (progress) progress.style.display = 'none';
            if (bar) bar.style.background = 'var(--accent)';
            if (bar) bar.style.width = '0%';
          }, 2000);
        } else {
          throw new Error(res.message || 'Erreur lors de l\'upload');
        }
      } catch (err) {
        showAdminToast('Erreur upload : ' + err.message, 'error');
        if (progress) progress.style.display = 'none';
      }
    };
    reader.onerror = () => {
      showAdminToast('Erreur lors de la lecture du fichier.', 'error');
      if (progress) progress.style.display = 'none';
    };
    reader.readAsDataURL(file);
  } catch (err) {
    showAdminToast('Erreur : ' + err.message, 'error');
    if (progress) progress.style.display = 'none';
  }
}

function handleImageDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    handleImageUpload(files[0]);
  }
}

// ── Multiple Images Upload ────────────────────────────────────────
async function handleImagesMultipleUpload(files) {
  if (!files || files.length === 0) return;

  const validFiles = Array.from(files).filter(file => {
    if (file.size > 5 * 1024 * 1024) {
      showAdminToast(`${file.name} dépasse 5MB.`, 'error');
      return false;
    }
    if (!file.type.startsWith('image/')) {
      showAdminToast(`${file.name} n'est pas une image.`, 'error');
      return false;
    }
    return true;
  });

  if (validFiles.length === 0) return;

  // Get current images
  const currentImagesStr = document.getElementById('pf-images').value.trim();
  const currentImages = currentImagesStr ? currentImagesStr.split('\n').map(s => s.trim()).filter(Boolean) : [];
  const uploadedUrls = [];

  // Upload each file
  const progress = document.getElementById('multi-upload-progress');
  const status = document.getElementById('multi-upload-status');
  const bar = document.getElementById('multi-upload-bar');
  if (progress) progress.style.display = 'block';

  for (let i = 0; i < validFiles.length; i++) {
    const file = validFiles[i];
    try {
      if (status) status.textContent = `Envoi ${i + 1}/${validFiles.length}: ${file.name}...`;
      const percent = ((i / validFiles.length) * 100);
      if (bar) bar.style.width = percent + '%';

      const reader = new FileReader();
      const uploadPromise = new Promise((resolve, reject) => {
        reader.onload = async () => {
          try {
            const res = await Products.upload(reader.result, `gallery-${Date.now()}-${i}`);
            if (res.success) {
              uploadedUrls.push(res.url);
              resolve();
            } else {
              reject(new Error(res.message || 'Erreur upload'));
            }
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject(new Error('Erreur lecture fichier'));
      });

      reader.readAsDataURL(file);
      await uploadPromise;
    } catch (err) {
      console.error('[handleImagesMultipleUpload]', err);
      showAdminToast(`Erreur pour ${file.name}: ${err.message}`, 'error');
    }
  }

  if (uploadedUrls.length > 0) {
    // Add uploaded URLs to textarea
    const allImages = [...currentImages, ...uploadedUrls];
    document.getElementById('pf-images').value = allImages.join('\n');

    if (status) status.textContent = `✓ ${uploadedUrls.length} image(s) uploadée(s)!`;
    if (bar) bar.style.background = 'var(--success)';
    if (bar) bar.style.width = '100%';

    showAdminToast(`✓ ${uploadedUrls.length} image(s) ajoutée(s).`);

    setTimeout(() => {
      if (progress) progress.style.display = 'none';
      if (bar) bar.style.background = 'var(--accent)';
      if (bar) bar.style.width = '0%';
    }, 2000);
  } else {
    if (progress) progress.style.display = 'none';
  }
}

function handleImagesDropZone(e) {
  e.preventDefault();
  e.stopPropagation();
  
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    handleImagesMultipleUpload(files);
  }
}

// ── Image Preview ─────────────────────────────────────────────────
function previewMainImage(input) {
  const url = (typeof input === 'string') ? input : input.value?.trim();
  updateImagePreview(url);
}

function updateImagePreview(url) {
  const preview = document.getElementById('image-preview');
  const img = document.getElementById('preview-img');
  
  if (!preview || !img) return;

  if (url) {
    img.src = url;
    img.onerror = function() {
      this.style.display = 'none';
    };
    preview.style.display = 'block';
  } else {
    clearImagePreview();
  }
}

function clearImagePreview() {
  const preview = document.getElementById('image-preview');
  if (preview) preview.style.display = 'none';
}


/* ================================================================
   SHARED HELPERS
   ================================================================ */

// ── Sidebar logout ────────────────────────────────────────────────
function initSidebarLogout() {
  document.querySelectorAll('[data-action="logout"]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      if (confirm('Se déconnecter ?')) adminLogout();
    });
  });
}

// ── Mobile sidebar toggle ─────────────────────────────────────────
function toggleSidebar() {
  document.querySelector('.admin-sidebar')?.classList.toggle('open');
}

// ── DOM helpers ───────────────────────────────────────────────────
function _setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function _setVal(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

function _getVal(id) {
  return document.getElementById(id)?.value || '';
}
