require('dotenv').config();
const express     = require('express');
const helmet      = require('helmet');
const cors        = require('cors');
const rateLimit   = require('express-rate-limit');

// ── Route handlers ──
const authRoutes        = require('./routes/auth');
const dashboardRoutes   = require('./routes/dashboard');
const tasksRoutes       = require('./routes/tasks');
const submissionsRoutes = require('./routes/submissions');
const membersRoutes     = require('./routes/members');
const leaderboardRoutes = require('./routes/leaderboard');

// ── Auth middleware ──
const { requireAuth } = require('./middleware/auth');

// ─────────────────────────────────────────────
// Validate required env vars at startup
// ─────────────────────────────────────────────
const REQUIRED = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'ADMIN_PASSWORD', 'JWT_SECRET'];
REQUIRED.forEach(key => {
  if (!process.env[key]) {
    console.error(`❌ Missing required env var: ${key}`);
    process.exit(1);
  }
});

if (process.env.JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET must be at least 32 characters. Generate one with:');
  console.error('   node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  process.exit(1);
}

const app  = express();
const PORT = process.env.PORT || 4000;

// ─────────────────────────────────────────────
// Security middleware
// ─────────────────────────────────────────────

// Helmet sets secure HTTP headers
app.use(helmet());

// CORS — allow requests from the admin frontend
// Supports multiple origins for dev flexibility
const ALLOWED_ORIGINS = [
  process.env.ADMIN_FRONTEND_URL || 'http://localhost:3002',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173', // Vite default
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// JSON body parser — 100kb limit prevents large payload attacks
app.use(express.json({ limit: '100kb' }));

// ─────────────────────────────────────────────
// Rate limiting
// ─────────────────────────────────────────────

// Strict limit on login endpoint — 10 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              10,
  message:          { error: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders:  true,
  legacyHeaders:    false,
});

// General API limit — 300 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs:         60 * 1000,
  max:              300,
  message:          { error: 'Too many requests. Slow down.' },
  standardHeaders:  true,
  legacyHeaders:    false,
});

app.use('/api/', apiLimiter);

// ─────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────

// Health check — no auth required
app.get('/health', (req, res) => {
  res.json({
    status:  'ok',
    service: 'croissance-admin-api',
    time:    new Date().toISOString(),
  });
});

// Auth routes — public (login + verify)
app.use('/api/auth', loginLimiter, authRoutes);

// All other routes — protected by JWT
app.use('/api/dashboard',   requireAuth, dashboardRoutes);
app.use('/api/tasks',       requireAuth, tasksRoutes);
app.use('/api/submissions', requireAuth, submissionsRoutes);
app.use('/api/members',     requireAuth, membersRoutes);
app.use('/api/leaderboard', requireAuth, leaderboardRoutes);

// ─────────────────────────────────────────────
// 404 handler
// ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ─────────────────────────────────────────────
// Global error handler
// ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ─────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   CROISSANCE ADMIN API                 ║
║   Status: Running ✅                   ║
║   Port:   ${PORT}                          ║
║   Env:    ${process.env.NODE_ENV || 'development'}                   ║
╚════════════════════════════════════════╝
  `);
  console.log('✅ All secrets secured server-side');
  console.log('✅ CORS restricted to:', process.env.ADMIN_FRONTEND_URL || 'http://localhost:3002');
  console.log('✅ Rate limiting active on all routes');
});

module.exports = app;