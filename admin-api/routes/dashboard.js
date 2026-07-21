const express  = require('express');
const supabase = require('../supabase');
const router   = express.Router();

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
  try {
    const [members, pending, tasks, txToday] = await Promise.all([
      supabase.from('members').select('id', { count: 'exact', head: true }),
      supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('point_transactions').select('points')
        .gte('created_at', new Date(Date.now() - 86400000).toISOString())
        .gt('points', 0),
    ]);

    const cpToday = (txToday.data || []).reduce((s, t) => s + t.points, 0);

    res.json({
      members:  members.count  || 0,
      pending:  pending.count  || 0,
      tasks:    tasks.count    || 0,
      cpToday,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/growth
router.get('/growth', async (req, res) => {
  try {
    const since = new Date(Date.now() - 14 * 86400000).toISOString();
    const { data } = await supabase
      .from('members')
      .select('joined_at')
      .gte('joined_at', since)
      .order('joined_at', { ascending: true });

    const byDate = {};
    (data || []).forEach(m => {
      const d = m.joined_at.split('T')[0];
      byDate[d] = (byDate[d] || 0) + 1;
    });

    const result = [];
    for (let i = 13; i >= 0; i--) {
      const d   = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().split('T')[0];
      result.push({
        date:    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        members: byDate[key] || 0,
      });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/recent-activity
router.get('/recent-activity', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('point_transactions')
      .select('points, reason, category, created_at, members(first_name, telegram_username)')
      .order('created_at', { ascending: false })
      .limit(8);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;