const express  = require('express');
const supabase = require('../supabase');
const router   = express.Router();

// GET /api/leaderboard — live top 100
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .limit(100);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leaderboard/legacy — all legacy members
router.get('/legacy', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('id, first_name, last_name, telegram_username, total_points, legacy_months, joined_at')
      .eq('is_legacy', true)
      .order('total_points', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leaderboard/history — list of past months
router.get('/history', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('monthly_snapshots')
      .select('month')
      .order('month', { ascending: false });
    const months = [...new Set((data || []).map(d => d.month))].slice(0, 12);
    if (error) throw error;
    res.json(months);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leaderboard/history/:month — snapshot for a specific month
router.get('/history/:month', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('monthly_snapshots')
      .select('*, members(first_name, last_name, telegram_username)')
      .eq('month', req.params.month)
      .order('final_rank', { ascending: true })
      .limit(20);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leaderboard/reset — trigger monthly reset
router.post('/reset', async (req, res) => {
  try {
    console.log(`[RESET] Monthly reset triggered by admin at ${new Date().toISOString()}`);
    const { error } = await supabase.rpc('monthly_reset');
    if (error) throw error;
    console.log('[RESET] Monthly reset complete');
    res.json({ success: true, reset_at: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;