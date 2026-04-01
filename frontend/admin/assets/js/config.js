'use strict';
/* ================================================================
   FA2M Admin — Configuration  |  v2.0
   ================================================================ */

// ── API Base URL ──────────────────────────────────────────────────
// Override by setting window.FA2M_API_URL before this script loads
const ADMIN_API = (typeof window !== 'undefined' && window.FA2M_API_URL)
  ? window.FA2M_API_URL
  : 'http://localhost:3000/api';

const TOKEN_KEY = 'fa2m_admin_token';

// ── Status labels and styles ──────────────────────────────────────
const STATUS_MAP = {
  nouvelle:     { label: 'Nouvelle',      cls: 'status-new',       emoji: '🆕' },
  confirmee:    { label: 'Confirmée',     cls: 'status-confirmed', emoji: '✅' },
  en_livraison: { label: 'En livraison',  cls: 'status-shipping',  emoji: '🚚' },
  livree:       { label: 'Livrée',        cls: 'status-delivered', emoji: '📦' },
  annulee:      { label: 'Annulée',       cls: 'status-cancelled', emoji: '❌' },
};

// ── Payment method labels ─────────────────────────────────────────
const PAYMENT_MAP = {
  whatsapp:     { label: 'WhatsApp',     icon: '📱' },
  wave:         { label: 'Wave',         icon: '🌊' },
  orange_money: { label: 'Orange Money', icon: '🟠' },
};

// ── Categories ────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'accessoires', label: 'Accessoires' },
  { value: 'sacs',        label: 'Sacs' },
  { value: 'beaute',      label: 'Beauté' },
  { value: 'chaussures',  label: 'Chaussures' },
  { value: 'vetements',   label: 'Vêtements' },
];

// ── Badge options ─────────────────────────────────────────────────
const BADGES = [
  { value: '',          label: 'Aucun' },
  { value: 'Populaire', label: 'Populaire' },
  { value: 'Promo',     label: 'Promo' },
  { value: 'Nouveau',   label: 'Nouveau' },
  { value: 'Luxe',      label: 'Luxe' },
];

// ── Helpers ───────────────────────────────────────────────────────
function formatCFA(n) {
  return Number(n || 0).toLocaleString('fr-FR') + '\u00a0FCFA';
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

function showAdminToast(msg, type) {
  type = type || 'success';
  const t = document.getElementById('admin-toast');
  if (!t) return;
  t.textContent  = msg;
  t.className    = 'admin-toast show ' + type;
  clearTimeout(t._tid);
  t._tid = setTimeout(() => t.classList.remove('show'), 3500);
}
