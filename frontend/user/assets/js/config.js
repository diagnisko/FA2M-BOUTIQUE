'use strict';
/* ================================================================
   FA2M — Frontend Config  |  v2.0
   ================================================================ */

// ── API Base URL ──────────────────────────────────────────────────
// Override by setting window.FA2M_API_URL before this script loads
// e.g. <script>window.FA2M_API_URL = 'https://api.fa2m.sn/api'</script>
const FA2M_CONFIG = {
  API_BASE:   (typeof window !== 'undefined' && window.FA2M_API_URL)
                ? window.FA2M_API_URL
                : 'http://localhost:3000/api',
  SHOP_PHONE: '221781332323',
  SHOP_NAME:  'FA2M',
  CURRENCY:   'FCFA',
  CART_KEY:   'fa2m_cart_v2',
};

// ── Format price in FCFA ──────────────────────────────────────────
function formatCFA(amount) {
  return Number(amount || 0).toLocaleString('fr-FR') + '\u00a0FCFA';
}

// ── Escape HTML to prevent XSS ────────────────────────────────────
function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

// ── Render star rating HTML ───────────────────────────────────────
function starsHtml(rating) {
  const r    = Math.round((rating || 0) * 2) / 2;
  const full = Math.floor(r);
  const half = r % 1 !== 0;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    '<span class="stars">' +
    '★'.repeat(full) +
    (half ? '<span style="opacity:.5">★</span>' : '') +
    '☆'.repeat(empty) +
    '</span>'
  );
}

// ── Badge CSS class ───────────────────────────────────────────────
function badgeCls(badge) {
  const map = {
    Populaire: 'badge-populaire',
    Promo:     'badge-promo',
    Nouveau:   'badge-nouveau',
    Luxe:      'badge-luxe',
  };
  return map[badge] || 'badge-populaire';
}

// ── Discount percentage ───────────────────────────────────────────
function discountPct(price, oldPrice) {
  if (!oldPrice || oldPrice <= price) return 0;
  return Math.round((1 - price / oldPrice) * 100);
}

// ── Truncate text ─────────────────────────────────────────────────
function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max).trimEnd() + '…' : str;
}
