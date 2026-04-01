'use strict';

const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentification requise. Fournissez un token Bearer.',
    });
  }

  const token = auth.slice(7);

  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET || 'changeme_please');
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError'
      ? 'Session expirée. Veuillez vous reconnecter.'
      : 'Token invalide.';
    return res.status(401).json({ success: false, message });
  }
};
