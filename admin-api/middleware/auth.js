const jwt = require('jsonwebtoken');

// ─────────────────────────────────────────────
// requireAuth — middleware that protects every
// admin API route. Extracts and verifies the
// JWT from the Authorization header.
// ─────────────────────────────────────────────
function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = header.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = payload; // { role: 'admin', iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired — please log in again' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { requireAuth };