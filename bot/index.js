console.log("1");

require('dotenv').config({ path: '../.env' });

console.log("2");

const express = require('express');

console.log("3");

const TelegramBot = require('node-telegram-bot-api');

console.log("4");

const {
  handleStart,
  handlePoints,
  handleReferral,
  handleTasks,
  handleLeaderboard,
  handleHelp
} = require('./handlers/commands');

console.log("5");

const { handleCallback } = require('./handlers/callbacks');

console.log("6");

const { handleNewMember } = require('./handlers/group');

console.log("7");

const { startCronJobs } = require('./cron');

console.log("8");

// ─────────────────────────────────────────────
// Validate environment
// ─────────────────────────────────────────────
const BOT_TOKEN  = process.env.BOT_TOKEN;
const MINIAPP_URL = process.env.MINIAPP_URL;
const PORT       = process.env.PORT || 3001;
const NODE_ENV   = process.env.NODE_ENV || 'development';

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is missing from .env');
  process.exit(1);
}

// ─────────────────────────────────────────────
// Create bot instance
// In development: use polling (no webhook needed)
// In production:  use webhook via express
// ─────────────────────────────────────────────
let bot;

if (NODE_ENV === 'production') {
  // Production: webhook mode
  bot = new TelegramBot(BOT_TOKEN, { webHook: { port: PORT } });
  console.log('🤖 Bot running in WEBHOOK mode');
} else {
  // Development: polling mode (simpler, no tunnel needed for testing)
  bot = new TelegramBot(BOT_TOKEN, { polling: true });
  console.log('🤖 Bot running in POLLING mode (development)');
}

// ─────────────────────────────────────────────
// Express server (for webhooks + health check)
// ─────────────────────────────────────────────
const app = express();
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status:  'ok',
    bot:     'Project Croissance Guild Bot',
    mode:    NODE_ENV,
    uptime:  process.uptime(),
  });
});

// Webhook endpoint (production only)
if (NODE_ENV === 'production') {
  const WEBHOOK_URL = process.env.MINIAPP_URL?.replace('miniapp', 'bot') || '';

  bot.setWebHook(`${WEBHOOK_URL}/webhook/${BOT_TOKEN}`);

  app.post(`/webhook/${BOT_TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });
}

app.listen(PORT, () => {
  console.log(`🌐 Express server running on port ${PORT}`);
});

// ─────────────────────────────────────────────
// COMMAND HANDLERS
// ─────────────────────────────────────────────
bot.onText(/\/start(.*)/, (msg) => handleStart(bot, msg));
bot.onText(/\/points/,    (msg) => handlePoints(bot, msg));
bot.onText(/\/referral/,  (msg) => handleReferral(bot, msg));
bot.onText(/\/tasks/,     (msg) => handleTasks(bot, msg));
bot.onText(/\/leaderboard/,(msg) => handleLeaderboard(bot, msg));
bot.onText(/\/help/,      (msg) => handleHelp(bot, msg));

// ─────────────────────────────────────────────
// CALLBACK QUERY HANDLER (inline keyboard buttons)
// ─────────────────────────────────────────────
bot.on('callback_query', (query) => handleCallback(bot, query));

// ─────────────────────────────────────────────
// GROUP EVENT HANDLERS
// ─────────────────────────────────────────────
bot.on('new_chat_members', (msg) => handleNewMember(bot, msg));

// ─────────────────────────────────────────────
// START CRON JOBS
// ─────────────────────────────────────────────
startCronJobs(bot);

// ─────────────────────────────────────────────
// SET BOT COMMANDS (shows in Telegram menu)
// ─────────────────────────────────────────────
bot.setMyCommands([
  { command: 'start',       description: '🚀 Open the Guild App' },
  { command: 'points',      description: '📊 Check your CP balance' },
  { command: 'referral',    description: '🔗 Get your referral link' },
  { command: 'tasks',       description: '📋 View active tasks' },
  { command: 'leaderboard', description: '🏆 Top 10 this month' },
  { command: 'help',        description: '❓ How to earn CP' },
]);

// ─────────────────────────────────────────────
// ERROR HANDLING
// ─────────────────────────────────────────────
bot.on('polling_error', (err) => {
  console.error('Polling error:', err.message);
});

bot.on('error', (err) => {
  console.error('Bot error:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

console.log(`
╔════════════════════════════════════════╗
║   PROJECT CROISSANCE GUILD BOT         ║
║   Status: Running ✅                   ║
║   Community: t.me/projectcroissancechat║
╚════════════════════════════════════════╝
`);