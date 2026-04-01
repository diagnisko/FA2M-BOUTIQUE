'use strict';

const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { db }  = require('../config/database');
const auth    = require('../middleware/auth');

const router = express.Router();

// ── POST /api/auth/login ──────────────────────────────────────────
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant et mot de passe requis.',
      });
    }

    const user = db
      .prepare('SELECT * FROM admin_users WHERE username = ?')
      .get(String(username).trim());

    if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants incorrects.',
      });
    }

    // Update last_login
    db.prepare("UPDATE admin_users SET last_login = datetime('now') WHERE id = ?").run(user.id);

    const secret  = process.env.JWT_SECRET || 'changeme_please_use_a_real_secret';
    const expires = process.env.JWT_EXPIRES_IN || '24h';

    const token = jwt.sign(
      { id: user.id, username: user.username },
      secret,
      { expiresIn: expires }
    );

    return res.json({
      success: true,
      data: { token, username: user.username },
      message: 'Connexion réussie.',
    });
  } catch (err) {
    console.error('[auth/login]', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ── GET /api/auth/verify ──────────────────────────────────────────
router.get('/verify', auth, (req, res) => {
  return res.json({
    success: true,
    data: { username: req.admin.username },
  });
});

// ── PUT /api/auth/password ────────────────────────────────────────
router.put('/password', auth, (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Ancien et nouveau mot de passe requis.',
      });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Le nouveau mot de passe doit contenir au moins 8 caractères.',
      });
    }

    const user = db
      .prepare('SELECT * FROM admin_users WHERE id = ?')
      .get(req.admin.id);

    if (!user || !bcrypt.compareSync(String(oldPassword), user.password_hash)) {
      return res.status(401).json({
        success: false,
        message: 'Ancien mot de passe incorrect.',
      });
    }

    const newHash = bcrypt.hashSync(String(newPassword), 10);
    db.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?').run(newHash, user.id);

    return res.json({
      success: true,
      message: 'Mot de passe mis à jour avec succès.',
    });
  } catch (err) {
    console.error('[auth/password]', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

module.exports = router;
