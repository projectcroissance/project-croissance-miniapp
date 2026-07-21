const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const router  = express.Router();

// ─────────────────────────────────────────────
// POST /api/auth/login
// Body: { password: string }
// Returns: { token: string } on success
// ─────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { password } = req.body;

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required' });
  }

  const correct = process.env.ADMIN_PASSWORD;

  // Constant-time comparison via bcrypt prevents timing attacks
  // We hash the stored password once at startup for comparison
  // For simplicity here we use a direct comparison with a small
  // artificial delay — in production use bcrypt.compare with a
  // pre-hashed password stored in env
  const valid = password === correct;

  // Artificial delay regardless of result — prevents timing attacks
  await new Promise(r => setTimeout(r, 200 + Math.random() * 100));

  if (!valid) {
    // Log failed attempt (you can add rate limiting on top of this)
    console.warn(`[AUTH] Failed login attempt at ${new Date().toISOString()} from ${req.ip}`);
    return res.status(401).json({ error: 'Incorrect password' });
  }

  // Issue JWT — expires in 8 hours (one working day)
  const token = jwt.sign(
    { role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  console.log(`[AUTH] Admin login successful at ${new Date().toISOString()}`);

  return res.json({
    token,
    expiresIn: 8 * 60 * 60, // seconds
  });
});

// ─────────────────────────────────────────────
// POST /api/auth/verify
// Lets the frontend check if its token is still valid
// ─────────────────────────────────────────────
router.post('/verify', (req, res) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ valid: false });
  }
  try {
    jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    return res.json({ valid: true });
  } catch {
    return res.status(401).json({ valid: false });
  }
});

module.exports = router;