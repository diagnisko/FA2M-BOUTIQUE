'use strict';
/* ================================================================
   FA2M Admin — API Client  |  All authenticated API calls
   ================================================================ */

// ── Core fetch wrapper ────────────────────────────────────────────
async function apiCall(method, path, body) {
  const opts = {
    method,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': 'Bearer ' + getToken(),
    },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  let res;
  try {
    res = await fetch(ADMIN_API + path, opts);
  } catch {
    throw new Error('Impossible de contacter le serveur. Vérifiez que le backend est démarré.');
  }

  // Auto-logout on 401
  if (res.status === 401) {
    adminLogout();
    return;
  }

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error('Réponse serveur invalide.');
  }

  if (!res.ok) {
    throw new Error(json.message || `Erreur HTTP ${res.status}`);
  }

  return json;
}

// ── Products ──────────────────────────────────────────────────────
const Products = {
  list(params) {
    const qs = params
      ? '?' + Object.entries(params)
          .filter(([, v]) => v != null && v !== '')
          .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
          .join('&')
      : '';
    return apiCall('GET', '/products' + qs);
  },

  get(id) {
    return apiCall('GET', '/products/' + id);
  },

  create(data) {
    return apiCall('POST', '/products', data);
  },

  update(id, data) {
    return apiCall('PUT', '/products/' + id, data);
  },

  delete(id) {
    return apiCall('DELETE', '/products/' + id);
  },

  reset() {
    return apiCall('POST', '/products/reset');
  },

  upload(imageData, filename) {
    return apiCall('POST', '/products/upload', { image_data: imageData, filename });
  },
};

// ── Orders ────────────────────────────────────────────────────────
const Orders = {
  list(params) {
    const qs = params
      ? '?' + Object.entries(params)
          .filter(([, v]) => v != null && v !== '')
          .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
          .join('&')
      : '';
    return apiCall('GET', '/orders' + qs);
  },

  stats() {
    return apiCall('GET', '/orders/stats');
  },

  get(id) {
    return apiCall('GET', '/orders/' + id);
  },

  updateStatus(id, status) {
    return apiCall('PUT', '/orders/' + id + '/status', { status });
  },
};

// ── Auth ──────────────────────────────────────────────────────────
const Auth = {
  verify() {
    return apiCall('GET', '/auth/verify');
  },

  changePassword(oldPassword, newPassword) {
    return apiCall('PUT', '/auth/password', { oldPassword, newPassword });
  },
};
