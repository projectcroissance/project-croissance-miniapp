const express  = require('express');
const supabase = require('../supabase');
const router   = express.Router();

// GET /api/tasks — all tasks
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, submissions(id)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks — create task
router.post('/', async (req, res) => {
  try {
    const { title, description, task_type, points_reward,
            requires_proof, proof_note, expires_at, max_submissions } = req.body;

    if (!title?.trim() || !description?.trim()) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title:           title.trim(),
        description:     description.trim(),
        task_type:       task_type || 'daily',
        points_reward:   parseInt(points_reward) || 15,
        requires_proof:  requires_proof !== false,
        proof_note:      proof_note?.trim() || null,
        expires_at:      expires_at || null,
        max_submissions: max_submissions ? parseInt(max_submissions) : null,
        is_active:       true,
        created_by:      'admin',
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tasks/:id — update task
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = ['title','description','task_type','points_reward',
                     'requires_proof','proof_note','expires_at','max_submissions','is_active'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const { data, error } = await supabase
      .from('tasks').update(updates).eq('id', id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('tasks').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;