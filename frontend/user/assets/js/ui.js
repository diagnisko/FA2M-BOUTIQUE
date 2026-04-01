'use strict';
/* ================================================================
   FA2M — UI Helpers  |  v2.0
   Animations, Product Card, Modal, Carousel, Header
   ================================================================ */

// ── Product Card Renderer ─────────────────────────────────────────
function renderProductCard(p) {
  const disc        = discountPct(p.price, p.old_price);
  const hasOld      = p.old_price && p.old_price > p.price;
  const productData = JSON.stringify({
    id:    p.id,
    name:  p.name,
    price: p.price,
    image: p.image || '',
  }).replace(/"/g, '&quot;');

  return `
<div class="product-card reveal" data-id="${p.id}">
  <div class="product-img-wrap">
    <img
      src="${escHtml(p.image || '')}"
      alt="${escHtml(p.name)}"
      loading="lazy"
      onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=60'"
    >
    ${p.badge
      ? `<span class="product-badge ${badgeCls(p.badge)}">${escHtml(p.badge)}</span>`
      : ''}
    <button class="product-wishlist" aria-label="Ajouter aux favoris" title="Favoris">♡</button>
  </div>
  <div class="product-body">
    <span class="product-cat">${escHtml(p.category)}</span>
    <h3 class="product-name">${escHtml(p.name)}</h3>
    <p class="product-short">${escHtml(truncate(p.short_desc || '', 80))}</p>
    <div class="rating">
      ${starsHtml(p.rating || 0)}
      <span class="rating-count">(${p.reviews || 0})</span>
    </div>
    <div class="price-row">
      <span class="price-current">${formatCFA(p.price)}</span>
      ${hasOld ? `<span class="price-old">${formatCFA(p.old_price)}</span>` : ''}
      ${disc > 0 ? `<span class="price-discount">-${disc}%</span>` : ''}
    </div>
    <div class="card-actions">
      <button
        class="btn btn-cart"
        onclick='cartAdd(JSON.parse(this.dataset.product))'
        data-product="${productData}"
        aria-label="Ajouter ${escHtml(p.name)} au panier"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96C5 16.1 6.1 17 7 17h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63H19c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0023.5 4H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
        </svg>
        Ajouter
      </button>
      <button
        class="btn btn-ghost btn-sm"
        onclick="openProductModal(${p.id})"
        aria-label="Voir les détails de ${escHtml(p.name)}"
      >Détails</button>
    </div>
  </div>
</div>`;
}

// ── Product Modal ─────────────────────────────────────────────────
let _currentProduct = null;

async function openProductModal(id) {
  const overlay = document.getElementById('product-modal-overlay');
  if (!overlay) return;

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  const panel = overlay.querySelector('.modal-panel');
  panel.innerHTML = `
    <div style="padding:4rem;text-align:center;color:var(--text-2)">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite">
        <circle cx="12" cy="12" r="10" stroke-opacity=".3"/>
        <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--accent)"/>
      </svg>
      <p style="margin-top:1rem">Chargement…</p>
    </div>`;

  try {
    const res      = await API.getProduct(id);
    _currentProduct = res.data;
    _renderModalContent(_currentProduct);
  } catch (err) {
    panel.innerHTML = `
      <button class="modal-close" onclick="closeProductModal()" aria-label="Fermer">✕</button>
      <div style="padding:4rem;text-align:center;color:var(--danger)">
        <p style="font-size:2rem">⚠️</p>
        <p>${escHtml(err.message || 'Impossible de charger ce produit.')}</p>
        <button class="btn btn-ghost btn-sm" style="margin-top:1rem" onclick="closeProductModal()">Fermer</button>
      </div>`;
  }
}

function _renderModalContent(p) {
  const overlay  = document.getElementById('product-modal-overlay');
  if (!overlay) return;

  const disc     = discountPct(p.price, p.old_price);
  const hasOld   = p.old_price && p.old_price > p.price;
  const images   = (Array.isArray(p.images) && p.images.length > 0)
    ? p.images
    : [p.image].filter(Boolean);
  const mainImg  = images[0] || '';

  const specsRows = (p.specs || [])
    .map(s => `<tr><td>${escHtml(s[0])}</td><td>${escHtml(s[1])}</td></tr>`)
    .join('');

  const thumbsHtml = images.map((img, i) => `
    <img
      class="modal-thumb${i === 0 ? ' active' : ''}"
      src="${escHtml(img)}"
      alt="Vue ${i + 1}"
      loading="lazy"
      onclick="changeModalImage('${escHtml(img)}', this)"
      onerror="this.style.display='none'"
    >`).join('');

  overlay.querySelector('.modal-panel').innerHTML = `
    <button class="modal-close" onclick="closeProductModal()" aria-label="Fermer la fiche produit">✕</button>
    <div class="modal-grid">

      <!-- Gallery -->
      <div class="modal-gallery">
        <div class="modal-main-img">
          <img
            id="modal-main-img"
            src="${escHtml(mainImg)}"
            alt="${escHtml(p.name)}"
            onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80'"
          >
        </div>
        ${images.length > 1
          ? `<div class="modal-thumbs">${thumbsHtml}</div>`
          : ''}
      </div>

      <!-- Info -->
      <div class="modal-info">
        ${p.badge
          ? `<div class="modal-badge-wrap"><span class="product-badge ${badgeCls(p.badge)}">${escHtml(p.badge)}</span></div>`
          : ''}

        <h2 class="modal-name">${escHtml(p.name)}</h2>

        <div class="modal-rating-row">
          ${starsHtml(p.rating)}
          <span class="rating-count">${p.reviews || 0} avis clients</span>
        </div>

        <div class="modal-price-row">
          <span class="modal-price-current">${formatCFA(p.price)}</span>
          ${hasOld ? `<span class="modal-price-old">${formatCFA(p.old_price)}</span>` : ''}
          ${disc > 0
            ? `<span class="modal-price-save">Économie ${disc}%</span>`
            : ''}
        </div>

        <p class="modal-desc">${escHtml(p.long_desc || p.short_desc || '')}</p>

        ${specsRows ? `
          <h4 class="modal-specs-title">Caractéristiques</h4>
          <table class="specs-table">
            <tbody>${specsRows}</tbody>
          </table>` : ''}

        <div class="modal-stock">
          Disponibilité :
          <strong>
            ${p.stock > 0
              ? `✓ ${p.stock} en stock`
              : '⚠️ Rupture de stock'}
          </strong>
        </div>

        <div class="modal-actions">
          <div class="modal-qty-wrap">
            <button
              class="cart-qty-btn"
              onclick="_modalQtyChange(-1)"
              aria-label="Diminuer la quantité"
            >−</button>
            <input
              id="modal-qty"
              type="number"
              class="cart-qty-val"
              value="1"
              min="1"
              max="${p.stock || 99}"
              aria-label="Quantité"
              style="width:52px;text-align:center;background:transparent;border:none;color:var(--text);font-size:1rem;font-weight:600"
            >
            <button
              class="cart-qty-btn"
              onclick="_modalQtyChange(1)"
              aria-label="Augmenter la quantité"
            >+</button>
          </div>

          <button
            class="btn modal-cart-btn"
            onclick="_modalAddToCart()"
            ${p.stock <= 0 ? 'disabled' : ''}
            aria-label="Ajouter au panier"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96C5 16.1 6.1 17 7 17h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63H19c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0023.5 4H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
            ${p.stock > 0 ? 'Ajouter au panier' : 'Indisponible'}
          </button>
        </div>

        <a
          href="https://wa.me/${FA2M_CONFIG.SHOP_PHONE}?text=${encodeURIComponent('Bonjour FA2M, je suis intéressé(e) par : ' + p.name + ' (' + formatCFA(p.price) + ')')}"
          class="btn btn-whatsapp"
          target="_blank"
          rel="noopener"
          style="margin-top:.75rem;display:flex;align-items:center;gap:.5rem;justify-content:center"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Demander sur WhatsApp
        </a>
      </div>
    </div>`;
}

function _modalQtyChange(delta) {
  const input  = document.getElementById('modal-qty');
  if (!input) return;
  const max    = parseInt(input.max) || 99;
  const newVal = Math.min(max, Math.max(1, (parseInt(input.value) || 1) + delta));
  input.value  = newVal;
}

function _modalAddToCart() {
  if (!_currentProduct) return;
  const qty = parseInt(document.getElementById('modal-qty')?.value) || 1;
  cartAdd(_currentProduct, qty);
  closeProductModal();
}

function changeModalImage(url, thumbEl) {
  const img = document.getElementById('modal-main-img');
  if (img) {
    img.style.opacity = '0';
    img.src = url;
    img.onload = () => { img.style.opacity = '1'; };
  }
  document.querySelectorAll('.modal-thumb').forEach(t => t.classList.remove('active'));
  if (thumbEl) thumbEl.classList.add('active');
}

function closeProductModal() {
  document.getElementById('product-modal-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
  _currentProduct = null;
}

// ── Scroll Reveal ─────────────────────────────────────────────────
function initReveal() {
  if (!('IntersectionObserver' in window)) {
    // Fallback: show all
    document.querySelectorAll('.reveal, .reveal-left, .reveal-right')
      .forEach(el => el.classList.add('visible'));
    return;
  }

  const obs = new IntersectionObserver(
    entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          obs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll('.reveal, .reveal-left, .reveal-right')
    .forEach(el => obs.observe(el));
}

// ── Animated Counters ─────────────────────────────────────────────
function initCounters() {
  if (!('IntersectionObserver' in window)) return;

  const obs = new IntersectionObserver(
    entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        obs.unobserve(e.target);

        const el       = e.target;
        const target   = parseFloat(el.dataset.target || '0');
        const isFloat  = String(el.dataset.target || '').includes('.');
        const duration = 1800;
        const step     = 16;
        const inc      = target / (duration / step);
        let   current  = 0;

        const timer = setInterval(() => {
          current += inc;
          if (current >= target) {
            current = target;
            clearInterval(timer);
          }
          el.textContent = isFloat
            ? current.toFixed(1)
            : Math.floor(current).toLocaleString('fr-FR');
        }, step);
      });
    },
    { threshold: 0.5 }
  );

  document.querySelectorAll('[data-target]').forEach(el => obs.observe(el));
}

// ── Typing Effect ─────────────────────────────────────────────────
function initTyping(el, words) {
  if (!el || !words || words.length === 0) return;

  let wordIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let isPaused   = false;

  function tick() {
    if (isPaused) return;

    const word    = words[wordIndex];
    const current = el.textContent;

    if (!isDeleting) {
      // Typing
      el.textContent = word.slice(0, charIndex + 1);
      charIndex++;

      if (charIndex === word.length) {
        // Pause at end of word
        isPaused = true;
        setTimeout(() => { isPaused = false; isDeleting = true; setTimeout(tick, 80); }, 2200);
        return;
      }
    } else {
      // Deleting
      el.textContent = word.slice(0, charIndex - 1);
      charIndex--;

      if (charIndex === 0) {
        isDeleting  = false;
        wordIndex   = (wordIndex + 1) % words.length;
      }
    }

    const speed = isDeleting ? 55 : 110;
    setTimeout(tick, speed);
  }

  tick();
}

// ── Particle Background ───────────────────────────────────────────
function initParticles(container) {
  if (!container) return;

  for (let i = 0; i < 22; i++) {
    const p         = document.createElement('span');
    p.className     = 'particle';
    const size      = 2 + Math.random() * 4;
    const x         = Math.random() * 100;
    const y         = Math.random() * 100;
    const delay     = Math.random() * 6;
    const duration  = 5 + Math.random() * 7;
    const opacity   = 0.15 + Math.random() * 0.45;

    p.style.cssText = [
      `left:${x}%`,
      `top:${y}%`,
      `width:${size}px`,
      `height:${size}px`,
      `opacity:${opacity}`,
      `animation-delay:${delay}s`,
      `animation-duration:${duration}s`,
    ].join(';');

    container.appendChild(p);
  }
}

// ── Testimonials Carousel ─────────────────────────────────────────
function initCarousel(track, dotsContainer, prevBtn, nextBtn) {
  if (!track) return;

  const cards = Array.from(track.querySelectorAll('.testimonial-card'));
  if (cards.length === 0) return;

  let current   = 0;
  let autoTimer = null;

  function goTo(idx) {
    cards[current].classList.remove('active');
    current = ((idx % cards.length) + cards.length) % cards.length;
    cards[current].classList.add('active');

    if (dotsContainer) {
      dotsContainer.querySelectorAll('.carousel-dot').forEach((d, i) => {
        d.classList.toggle('active', i === current);
        d.setAttribute('aria-selected', i === current);
      });
    }
  }

  function startAuto() {
    stopAuto();
    autoTimer = setInterval(() => goTo(current + 1), 5000);
  }

  function stopAuto() {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
  }

  // Init first card
  cards[0].classList.add('active');

  // Build dots
  if (dotsContainer) {
    dotsContainer.innerHTML = cards.map((_, i) => `
      <button
        class="carousel-dot${i === 0 ? ' active' : ''}"
        aria-label="Témoignage ${i + 1}"
        aria-selected="${i === 0}"
        role="tab"
      ></button>`).join('');

    dotsContainer.querySelectorAll('.carousel-dot').forEach((dot, i) => {
      dot.addEventListener('click', () => { goTo(i); startAuto(); });
    });
  }

  // Controls
  prevBtn?.addEventListener('click', () => { goTo(current - 1); startAuto(); });
  nextBtn?.addEventListener('click', () => { goTo(current + 1); startAuto(); });

  // Pause on hover
  track.closest('section')?.addEventListener('mouseenter', stopAuto);
  track.closest('section')?.addEventListener('mouseleave', startAuto);

  // Touch / swipe support
  let touchStartX = 0;
  track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) { goTo(dx < 0 ? current + 1 : current - 1); startAuto(); }
  }, { passive: true });

  startAuto();
}

// ── Sticky Header ─────────────────────────────────────────────────
function initHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const update = () => header.classList.toggle('scrolled', window.scrollY > 60);
  window.addEventListener('scroll', update, { passive: true });
  update();
}

// ── Hamburger Menu ────────────────────────────────────────────────
function initHamburger() {
  const btn = document.querySelector('.hamburger');
  const nav = document.querySelector('.nav-mobile');
  if (!btn || !nav) return;

  btn.addEventListener('click', () => {
    const isOpen = btn.classList.toggle('active');
    nav.classList.toggle('open', isOpen);
    btn.setAttribute('aria-expanded', String(isOpen));
    btn.setAttribute('aria-label', isOpen ? 'Fermer le menu' : 'Ouvrir le menu');
  });

  // Close on outside click
  document.addEventListener('click', e => {
    if (!btn.contains(e.target) && !nav.contains(e.target)) {
      btn.classList.remove('active');
      nav.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });

  // Close on nav link click
  nav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      btn.classList.remove('active');
      nav.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    });
  });
}

// ── Active Nav Link ───────────────────────────────────────────────
function setActiveNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-desktop a, .nav-mobile a').forEach(a => {
    const href = (a.getAttribute('href') || '').split('?')[0];
    const match =
      href === page ||
      (page === '' && href === 'index.html') ||
      (page === 'index.html' && href === 'index.html');
    a.classList.toggle('active', match);
    if (match) a.setAttribute('aria-current', 'page');
    else        a.removeAttribute('aria-current');
  });
}

// ── 3-D Card Tilt ─────────────────────────────────────────────────
function initCardTilt() {
  document.querySelectorAll('.product-card').forEach(card => {
    // Skip if already has tilt listener (prevents double-binding on re-renders)
    if (card.dataset.tilt) return;
    card.dataset.tilt = '1';

    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x    = ((e.clientX - rect.left) / rect.width  - 0.5) * 10;
      const y    = ((e.clientY - rect.top)  / rect.height - 0.5) * 10;
      card.style.transform = `perspective(700px) rotateY(${x}deg) rotateX(${-y}deg) translateZ(6px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

// ── Inject Spin Keyframe (for loader) ────────────────────────────
(function injectSpinStyle() {
  if (document.getElementById('fa2m-spin-style')) return;
  const style = document.createElement('style');
  style.id    = 'fa2m-spin-style';
  style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
})();
