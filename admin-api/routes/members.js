const express  = require('express');
const supabase = require('../supabase');
const router   = express.Router();

const ACT_PTS = {
  general_post: 2, ama_attendance: 5, ama_question: 3,
  space_attendance: 5, introduction: 10, help_member: 3,
};

const ACT_LABELS = {
  general_post:     'Quality participation in #general',
  ama_attendance:   'Attended a live AMA session',
  ama_question:     'Asked a quality AMA question',
  space_attendance: 'Attended an X Space',
  introduction:     'Proper introduction in #general',
  help_member:      'Helped another member',
};

// GET /api/members — all members sorted by monthly points
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('member_stats')
      .select('*')
      .order('monthly_points', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/members/:id/transactions
router.get('/:id/transactions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('point_transactions')
      .select('points, reason, category, created_at, awarded_by')
      .eq('member_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/members/:id/award — manual point award or deduction
router.post('/:id/award', async (req, res) => {
  try {
    const { points, reason, category } = req.body;

    if (!points || !reason?.trim()) {
      return res.status(400).json({ error: 'Points and reason are required' });
    }

    const pts = parseInt(points);
    if (isNaN(pts) || pts === 0) {
      return res.status(400).json({ error: 'Points must be a non-zero integer' });
    }

    const { error } = await supabase.rpc('award_points', {
      p_member_id:  req.params.id,
      p_points:     pts,
      p_reason:     reason.trim(),
      p_category:   category || (pts > 0 ? 'manual_award' : 'manual_deduction'),
      p_awarded_by: 'admin',
    });

    if (error) throw error;
    res.json({ success: true, points: pts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/members/:id/activity — log community activity + award CP
router.post('/:id/activity', async (req, res) => {
  try {
    const { activity } = req.body;
    const pts = ACT_PTS[activity];

    if (!pts) return res.status(400).json({ error: 'Invalid activity type' });

    // Log activity record
    await supabase.from('community_activity').insert({
      member_id:   req.params.id,
      activity,
      points:      pts,
      recorded_by: 'admin',
    });

    // Award points
    const { error } = await supabase.rpc('award_points', {
      p_member_id:  req.params.id,
      p_points:     pts,
      p_reason:     ACT_LABELS[activity] || activity,
      p_category:   'community_activity',
      p_awarded_by: 'admin',
    });

    if (error) throw error;
    res.json({ success: true, points: pts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/members/:id/legacy — grant or remove legacy status
router.patch('/:id/legacy', async (req, res) => {
  try {
    const { is_legacy } = req.body;
    if (typeof is_legacy !== 'boolean') {
      return res.status(400).json({ error: 'is_legacy must be a boolean' });
    }

    const { error } = await supabase
      .from('members')
      .update({ is_legacy, tier: is_legacy ? 'Legacy' : undefined })
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true, is_legacy });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;