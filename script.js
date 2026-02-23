// Configuration (mettre le numéro international sans + ni espaces si possible)
const PHONE_NUMBER = '781332323'; // <-- remplace par '33XXXXXXXXX' si FR (+33)
const BASE_MESSAGE_PREFIX = "Bonjour! Je souhaite commander : "; // non-encoded, we'll encode later

// Utility: safe get phone and validate basic digits
function getPhoneNumber() {
  const p = (PHONE_NUMBER || '').trim();
  // basic check: keep only digits
  const digits = p.replace(/\D/g, '');
  return digits || null;
}

// Helper to open URL in new tab safely
function openNew(url) {
  window.open(url, '_blank', 'noopener');
}

// Footer year (safe)
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Lazy-load external script
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (!src) return reject(new Error('Missing src'));
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load')));
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load ' + src));
    document.head.appendChild(s);
  });
}

// Conditionally load Lottie/GSAP only when needed
function ensureAnimations() {
  const needsLottie = !!document.getElementById('hero-lottie');
  const needsGsap = !!document.querySelector('.product-card') || !!document.querySelector('.hero-text');

  const promises = [];
  if (needsLottie) promises.push(loadScript('https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.7.6/lottie.min.js'));
  if (needsGsap) promises.push(loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js'));
  return Promise.all(promises).catch(err => console.warn('Lib load failed', err));
}

// Initialize animations if available
ensureAnimations().then(() => {
  try {
    if (typeof lottie !== 'undefined' && document.getElementById('hero-lottie')) {
      lottie.loadAnimation({
        container: document.getElementById('hero-lottie'),
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'https://assets9.lottiefiles.com/packages/lf20_touohxv0.json'
      });
    }
  } catch (e) { console.warn('Lottie error', e); }

  try {
    // Respect prefers-reduced-motion
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce && typeof gsap !== 'undefined') {
      if (document.querySelector('.hero-text')) {
        gsap.from('.hero-text h1', { y: 30, opacity: 0, duration: .8, ease: 'power3.out' });
        gsap.from('.lead', { y: 20, opacity: 0, duration: .7, delay: .15, ease: 'power3.out' });
        gsap.from('.btn', { scale: 0.96, opacity: 0, duration: .6, delay: .25, stagger: .08, ease: 'back.out(1.2)' });
      }
      if (document.querySelectorAll('.product-card').length) {
        gsap.from('.product-card', { y: 30, opacity: 0, duration: .7, delay: .2, stagger: 0.12, ease: 'power2.out' });
      }
    }
  } catch (e) { console.warn('GSAP error', e); }
});

// Micro-interactions (3D tilt) with safe guards
(function initCardTilt(){
  const cards = document.querySelectorAll('.product-card');
  if (!cards.length) return;
  cards.forEach(card => {
    let rect = null;
    function onMove(e) {
      rect = rect || card.getBoundingClientRect();
      const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
      const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const dx = (x - cx) / cx;
      const dy = (y - cy) / cy;
      const tiltX = (dy * 6).toFixed(2);
      const tiltY = (dx * -6).toFixed(2);
      card.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateZ(0)`;
      const img = card.querySelector('.media img');
      if (img) img.style.transform = `translateX(${dx * -6}px) translateY(${dy * -6}px) scale(1.03)`;
    }
    function onLeave() {
      card.style.transform = '';
      const img = card.querySelector('.media img');
      if (img) img.style.transform = '';
      rect = null;
    }
    card.addEventListener('mousemove', onMove);
    card.addEventListener('mouseleave', onLeave);
    card.addEventListener('touchmove', onMove, {passive: true});
    card.addEventListener('touchend', onLeave);
  });
})();

// Centralized click handling (delegation) for order buttons
document.addEventListener('click', (e) => {
  const orderBtn = e.target.closest && e.target.closest('[data-action="order"], .btn.whatsapp');
  if (orderBtn) {
    e.preventDefault();
    const card = orderBtn.closest('.product-card');
    let name = '';
    let price = '';
    if (card) {
      name = card.dataset.name || (card.querySelector('h3') && card.querySelector('h3').innerText) || '';
      price = card.dataset.price || (card.querySelector('.price') && card.querySelector('.price').innerText) || '';
    }
    // small feedback animation (if gsap loaded)
    try {
      if (typeof gsap !== 'undefined') {
        gsap.fromTo(orderBtn, { scale: 1 }, { scale: 0.96, duration: .08, yoyo: true, repeat: 1, ease: 'power1.inOut' });
      }
    } catch (err) { /* ignore */ }
    openWhatsApp(name, price);
    return;
  }

  // floating whatsapp
  const floatBtn = e.target.closest && e.target.closest('#whatsapp-float');
  if (floatBtn) {
    e.preventDefault();
    const phone = getPhoneNumber();
    if (!phone) { alert('Numéro WhatsApp non configuré. Contacte l’administrateur du site.'); return; }
    const url = `https://wa.me/${phone}?text=${encodeURIComponent('Bonjour, je souhaite passer une commande.')}`;
    openNew(url);
    return;
  }

  // contact page direct whatsapp link
  const contactWp = e.target.closest && e.target.closest('#contact-whatsapp');
  if (contactWp) {
    e.preventDefault();
    const phone = getPhoneNumber();
    if (!phone) { alert('Numéro WhatsApp non configuré.'); return; }
    const url = `https://wa.me/${phone}?text=${encodeURIComponent("Bonjour, j'ai une question.")}`;
    openNew(url);
    return;
  }
});

// Open WhatsApp with prefilled product message
function openWhatsApp(productName, price) {
  const phone = getPhoneNumber();
  if (!phone) {
    alert('Numéro WhatsApp non configuré. Contacte l’administrateur du site.');
    return;
  }
  const message = `${BASE_MESSAGE_PREFIX}${productName}${price ? ' — ' + price : ''}`;
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  openNew(url);
}

// Contact form -> open WhatsApp with message composed from form
(function initContactForm(){
  const contactForm = document.getElementById('contact-form');
  if (!contactForm) return;
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = (document.getElementById('c-name') || {}).value?.trim() || '';
    const email = (document.getElementById('c-email') || {}).value?.trim() || '';
    const msg = (document.getElementById('c-msg') || {}).value?.trim() || '';
    const phone = getPhoneNumber();
    if (!phone) { alert('Numéro WhatsApp non configuré.'); return; }
    const composed = `Contact FA2M - ${name}${email ? ' (' + email + ')' : ''} : ${msg}`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(composed)}`;
    openNew(url);
  });
})();

// Search (simple client-side filter) - safe
(function initSearch(){
  const searchInput = document.getElementById('search');
  if (!searchInput) return;
  searchInput.addEventListener('input', (e) => {
    const q = (e.target.value || '').toLowerCase();
    document.querySelectorAll('.product-card').forEach(card => {
      const name = ((card.dataset.name) || (card.querySelector('h3') && card.querySelector('h3').innerText) || '').toLowerCase();
      card.style.display = name.includes(q) ? '' : 'none';
    });
  });
})();

// Sort (basic)
(function initSort(){
  const sortSelect = document.getElementById('sort');
  if (!sortSelect) return;
  sortSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    const container = document.getElementById('products-list');
    if (!container) return;
    const items = Array.from(container.querySelectorAll('.product-card'));
    if (val === 'price-asc') {
      items.sort((a,b)=> (Number(a.dataset.price) || 0) - (Number(b.dataset.price) || 0));
    } else if (val === 'price-desc') {
      items.sort((a,b)=> (Number(b.dataset.price) || 0) - (Number(a.dataset.price) || 0));
    } else { // popular / default: keep DOM order but ensure badge on top
      items.sort((a,b)=> (b.querySelector('.badge') ? 1 : 0) - (a.querySelector('.badge') ? 1 : 0));
    }
    items.forEach(i=>container.appendChild(i));
  });
})();