const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    // Allow token via query param (for SSE EventSource which can't set headers)
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Zugriff verweigert. Kein Token vorhanden.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token abgelaufen.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Ungültiges Token.' });
  }
};

module.exports = authenticate;
