'use strict';
/* ================================================================
   FA2M Admin — Auth  |  Token management & JWT verification
   ================================================================ */

// ── Token Storage ─────────────────────────────────────────────────
function getToken()    { return localStorage.getItem(TOKEN_KEY); }
function setToken(t)   { localStorage.setItem(TOKEN_KEY, t); }
function removeToken() { localStorage.removeItem(TOKEN_KEY); }

// ── Verify token with server ──────────────────────────────────────
async function verifyAuth() {
  const token = getToken();
  if (!token) return false;
  try {
    const r = await fetch(ADMIN_API + '/auth/verify', {
      headers: { Authorization: 'Bearer ' + token },
    });
    return r.ok;
  } catch {
    return false;
  }
}

// ── Require auth — redirect to login if not authenticated ─────────
async function requireAuth() {
  const ok = await verifyAuth();
  if (!ok) {
    removeToken();
    window.location.href = 'login.html';
    // Return a never-resolving promise to stop further execution
    return new Promise(() => {});
  }
}

// ── Login ─────────────────────────────────────────────────────────
async function adminLogin(username, password) {
  const r = await fetch(ADMIN_API + '/auth/login', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ username, password }),
  });
  const json = await r.json();
  if (!r.ok) throw new Error(json.message || 'Identifiants incorrects.');
  setToken(json.data.token);
  return json.data;
}

// ── Logout ────────────────────────────────────────────────────────
function adminLogout() {
  removeToken();
  window.location.href = 'login.html';
}

// ── Get username from token (decoded) ─────────────────────────────
function getAdminUsername() {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.username || null;
  } catch {
    return null;
  }
}

// ── Auto-populate username badge in UI ───────────────────────────
function populateUserBadge() {
  const username = getAdminUsername();
  document.querySelectorAll('.admin-username').forEach(el => {
    if (username) el.textContent = username;
  });
}
