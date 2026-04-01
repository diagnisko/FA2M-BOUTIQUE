'use strict';

const express               = require('express');
const path                  = require('path');
const fs                    = require('fs');
const { db, seedDefaultProducts } = require('../config/database');
const auth                  = require('../middleware/auth');

const router = express.Router();

// ── Helper: generate unique filename ──────────────────────────────
function generateFilename(ext) {
  return `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`;
}

// ── Helper: parse JSON fields ─────────────────────────────────────
function parseProduct(row) {
  if (!row) return null;
  return {
    ...row,
    images: (() => { try { return JSON.parse(row.images || '[]'); } catch { return []; } })(),
    specs:  (() => { try { return JSON.parse(row.specs  || '[]'); } catch { return []; } })(),
  };
}

// ── GET /api/products ─────────────────────────────────────────────
// Public — supports ?category= ?search= ?sort=
router.get('/', (req, res) => {
  try {
    const { category, search, sort } = req.query;

    let sql    = 'SELECT * FROM products WHERE active = 1';
    const params = [];

    if (category && category !== 'tous') {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (search && search.trim()) {
      sql += ' AND (name LIKE ? OR short_desc LIKE ? OR category LIKE ?)';
      const like = `%${search.trim()}%`;
      params.push(like, like, like);
    }

    switch (sort) {
      case 'price_asc':  sql += ' ORDER BY price ASC';    break;
      case 'price_desc': sql += ' ORDER BY price DESC';   break;
      case 'rating':     sql += ' ORDER BY rating DESC';  break;
      default:           sql += ' ORDER BY id DESC';      break;
    }

    const products = db.prepare(sql).all(...params).map(parseProduct);

    return res.json({ success: true, data: products });
  } catch (err) {
    console.error('[products/GET /]', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ── POST /api/products/upload ─────────────────────────────────────
// Admin — upload image (base64 or file)
router.post('/upload', auth, (req, res) => {
  try {
    const { image_data, filename } = req.body;

    if (!image_data) {
      return res.status(400).json({ success: false, message: 'Données d\'image manquantes.' });
    }

    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Parse base64 data
    let buffer;
    let ext = '.jpg';

    if (image_data.startsWith('data:')) {
      // Base64 data URL format: data:image/jpeg;base64,<data>
      const matches = image_data.match(/^data:image\/(jpeg|png|webp|gif);base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({ success: false, message: 'Format base64 invalide.' });
      }

      const mimeType = matches[1];
      const base64Data = matches[2];
      buffer = Buffer.from(base64Data, 'base64');

      // Map MIME type to extension
      const mimeMap = { jpeg: '.jpg', png: '.png', webp: '.webp', gif: '.gif' };
      ext = mimeMap[mimeType] || '.jpg';
    } else {
      // Raw base64 string, assume JPEG
      buffer = Buffer.from(image_data, 'base64');
    }

    // Generate unique filename
    const generatedFilename = filename || generateFilename(ext);
    const safeName = generatedFilename.replace(/[^a-z0-9._-]/gi, '_');
    const filepath = path.join(uploadsDir, safeName);

    // Write file
    fs.writeFileSync(filepath, buffer);

    // Return relative URL
    const url = `/uploads/${safeName}`;

    return res.json({
      success: true,
      url,
      message: 'Image uploadée avec succès.',
    });
  } catch (err) {
    console.error('[products/upload]', err);
    return res.status(500).json({ success: false, message: 'Erreur lors de l\'upload.' });
  }
});

// ── POST /api/products/reset ──────────────────────────────────────
// Admin — MUST be defined BEFORE /:id to avoid route conflict
router.post('/reset', auth, (req, res) => {
  try {
    seedDefaultProducts();
    return res.json({
      success: true,
      message: 'Produits réinitialisés avec succès.',
      data: { count: 8 },
    });
  } catch (err) {
    console.error('[products/reset]', err);
    return res.status(500).json({ success: false, message: 'Erreur lors de la réinitialisation.' });
  }
});

// ── GET /api/products/:id ─────────────────────────────────────────
// Public
router.get('/:id', (req, res) => {
  try {
    const product = db
      .prepare('SELECT * FROM products WHERE id = ? AND active = 1')
      .get(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Produit introuvable.' });
    }

    return res.json({ success: true, data: parseProduct(product) });
  } catch (err) {
    console.error('[products/GET /:id]', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ── POST /api/products ────────────────────────────────────────────
// Admin — create a new product
router.post('/', auth, (req, res) => {
  try {
    const {
      name, category, price, old_price, badge,
      short_desc, long_desc, image, images,
      rating, reviews, stock, specs,
    } = req.body;

    // Validate required fields
    const errors = [];
    if (!name    || !String(name).trim())      errors.push('Le nom est requis.');
    if (!category|| !String(category).trim())  errors.push('La catégorie est requise.');
    if (price == null || isNaN(Number(price))) errors.push('Le prix est requis et doit être un nombre.');

    if (errors.length) {
      return res.status(400).json({ success: false, message: errors.join(' '), errors });
    }

    // Normalise JSON fields
    const imagesStr = typeof images === 'string'
      ? images
      : JSON.stringify(Array.isArray(images) ? images : []);
    const specsStr = typeof specs === 'string'
      ? specs
      : JSON.stringify(Array.isArray(specs) ? specs : []);

    const result = db.prepare(`
      INSERT INTO products
        (name, category, price, old_price, badge, short_desc, long_desc,
         image, images, rating, reviews, stock, specs, active)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      String(name).trim(),
      String(category).trim(),
      Number(price),
      old_price ? Number(old_price) : null,
      badge  || null,
      short_desc || null,
      long_desc  || null,
      image      || null,
      imagesStr,
      rating  != null ? Number(rating)  : 4.5,
      reviews != null ? Number(reviews) : 0,
      stock   != null ? Number(stock)   : 10,
      specsStr,
    );

    const created = db
      .prepare('SELECT * FROM products WHERE id = ?')
      .get(result.lastInsertRowid);

    return res.status(201).json({
      success: true,
      data: parseProduct(created),
      message: 'Produit créé avec succès.',
    });
  } catch (err) {
    console.error('[products/POST /]', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ── PUT /api/products/:id ─────────────────────────────────────────
// Admin — update existing product
router.put('/:id', auth, (req, res) => {
  try {
    const existing = db
      .prepare('SELECT * FROM products WHERE id = ?')
      .get(req.params.id);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Produit introuvable.' });
    }

    const allowed = [
      'name', 'category', 'price', 'old_price', 'badge',
      'short_desc', 'long_desc', 'image', 'images',
      'rating', 'reviews', 'stock', 'specs', 'active',
    ];

    const setClauses = ["updated_at = datetime('now')"];
    const values     = [];

    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        setClauses.push(`${field} = ?`);

        if (field === 'images' || field === 'specs') {
          const val = req.body[field];
          values.push(typeof val === 'string' ? val : JSON.stringify(val));
        } else if (['price', 'old_price', 'rating', 'reviews', 'stock', 'active'].includes(field)) {
          values.push(req.body[field] === null ? null : Number(req.body[field]));
        } else {
          values.push(req.body[field] === null ? null : String(req.body[field]));
        }
      }
    }

    if (setClauses.length === 1) {
      return res.status(400).json({ success: false, message: 'Aucun champ à mettre à jour.' });
    }

    values.push(req.params.id);
    db.prepare(`UPDATE products SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);

    return res.json({
      success: true,
      data: parseProduct(updated),
      message: 'Produit mis à jour.',
    });
  } catch (err) {
    console.error('[products/PUT /:id]', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ── DELETE /api/products/:id ──────────────────────────────────────
// Admin — soft delete
router.delete('/:id', auth, (req, res) => {
  try {
    const existing = db
      .prepare('SELECT id FROM products WHERE id = ?')
      .get(req.params.id);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Produit introuvable.' });
    }

    db.prepare("UPDATE products SET active = 0, updated_at = datetime('now') WHERE id = ?")
      .run(req.params.id);

    return res.json({ success: true, message: 'Produit supprimé.' });
  } catch (err) {
    console.error('[products/DELETE /:id]', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

module.exports = router;
