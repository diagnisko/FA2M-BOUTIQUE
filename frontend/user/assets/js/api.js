'use strict';
/* ================================================================
   FA2M — API Client  |  Toutes les requêtes vers le backend
   ================================================================ */

const API = {

  // ── Base URL ──────────────────────────────────────────────────
  base() {
    return FA2M_CONFIG.API_BASE;
  },

  // ── Requête générique ─────────────────────────────────────────
  async _fetch(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body !== undefined) opts.body = JSON.stringify(body);

    let res;
    try {
      res = await fetch(this.base() + path, opts);
    } catch (networkErr) {
      throw new Error(
        'Impossible de contacter le serveur. Vérifiez que le backend est démarré (npm start dans /backend).'
      );
    }

    let json;
    try {
      json = await res.json();
    } catch {
      throw new Error('Réponse serveur invalide (non-JSON).');
    }

    if (!res.ok) {
      const err = new Error(json.message || `Erreur HTTP ${res.status}`);
      err.status = res.status;
      err.data   = json;
      throw err;
    }

    return json;
  },

  get(path)         { return this._fetch('GET',    path);        },
  post(path, data)  { return this._fetch('POST',   path, data);  },
  put(path, data)   { return this._fetch('PUT',    path, data);  },
  del(path)         { return this._fetch('DELETE', path);        },

  // ── Produits (publics) ────────────────────────────────────────

  /**
   * Récupère tous les produits actifs.
   * @param {Object} params  - { category, search, sort }
   */
  getProducts(params = {}) {
    const entries = Object.entries(params).filter(
      ([, v]) => v !== null && v !== undefined && v !== ''
    );
    const qs = entries
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    return this.get('/products' + (qs ? '?' + qs : ''));
  },

  /**
   * Récupère un produit par son id.
   * @param {number|string} id
   */
  getProduct(id) {
    return this.get('/products/' + id);
  },

  // ── Paiements / Commandes (publics) ───────────────────────────

  /**
   * Crée une commande et retourne l'URL WhatsApp pré-remplie.
   * @param {Object} data  - { prenom, nom, telephone, adresse, items[], total, ... }
   */
  orderWhatsapp(data) {
    return this.post('/payments/whatsapp', data);
  },

  /**
   * Initie un paiement Wave.
   * Si l'API Wave n'est pas configurée, le backend répond avec demo:true.
   * @param {Object} data
   */
  orderWave(data) {
    return this.post('/payments/wave', data);
  },

  /**
   * Initie un paiement Orange Money.
   * Si les credentials OM ne sont pas configurés, le backend répond avec demo:true.
   * @param {Object} data
   */
  orderOrangeMoney(data) {
    return this.post('/payments/orange-money', data);
  },
};
