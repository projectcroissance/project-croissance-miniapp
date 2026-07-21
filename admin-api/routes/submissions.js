const express  = require('express');
const supabase = require('../supabase');
const router   = express.Router();

// GET /api/submissions?status=pending
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let q = supabase
      .from('submissions')
      .select(`*, members(id,first_name,last_name,telegram_username,monthly_points,tier), tasks(title,points_reward,requires_proof)`)
      .order('submitted_at', { ascending: false })
      .limit(100);
    if (status && status !== 'all') q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/submissions/:id/review — approve or reject
router.patch('/:id/review', async (req, res) => {
  try {
    const { id }     = req.params;
    const { decision, points_override, reviewer_note } = req.body;

    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ error: 'decision must be approved or rejected' });
    }

    // Fetch submission to get member_id and default points
    const { data: sub, error: fetchErr } = await supabase
      .from('submissions')
      .select('*, tasks(title, points_reward), members(id)')
      .eq('id', id)
      .single();

    if (fetchErr || !sub) return res.status(404).json({ error: 'Submission not found' });
    if (sub.status !== 'pending') return res.status(400).json({ error: 'Submission already reviewed' });

    const pts = parseInt(points_override) || sub.tasks?.points_reward || 0;

    // Update submission
    const { error: updateErr } = await supabase
      .from('submissions')
      .update({
        status:         decision,
        points_awarded: decision === 'approved' ? pts : 0,
        reviewer_note:  reviewer_note?.trim() || null,
        reviewed_by:    'admin',
        reviewed_at:    new Date().toISOString(),
      })
      .eq('id', id);

    if (updateErr) throw updateErr;

    // Award points if approved — uses the secure server-side function
    if (decision === 'approved') {
      const { error: ptErr } = await supabase.rpc('award_points', {
        p_member_id:  sub.members.id,
        p_points:     pts,
        p_reason:     `Task approved: ${sub.tasks?.title}`,
        p_category:   'task_completion',
        p_reference:  sub.task_id,
        p_awarded_by: 'admin',
      });
      if (ptErr) throw ptErr;
    }

    res.json({ success: true, points_awarded: decision === 'approved' ? pts : 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;