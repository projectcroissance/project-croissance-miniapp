import React, { useState, useEffect } from 'react';
import supabase from '../supabase';
import { useToast } from '../hooks/useAdmin';

const EMPTY_TASK = {
  title: '', description: '', task_type: 'daily',
  points_reward: 15, requires_proof: true,
  proof_note: '', expires_at: '', max_submissions: '',
};

export default function Tasks() {
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [form,    setForm]    = useState(EMPTY_TASK);
  const [editing, setEditing] = useState(null);
  const [saving,  setSaving]  = useState(false);
  const { show, ToastEl }     = useToast();

  useEffect(() => { fetchTasks(); }, []);

  async function fetchTasks() {
    setLoading(true);
    const { data } = await supabase
      .from('tasks')
      .select('*, submissions(id)')
      .order('created_at', { ascending: false });
    setTasks(data || []);
    setLoading(false);
  }

  function openCreate() {
    setForm(EMPTY_TASK);
    setEditing(null);
    setModal(true);
  }

  function openEdit(task) {
    setForm({
      title:           task.title,
      description:     task.description,
      task_type:       task.task_type,
      points_reward:   task.points_reward,
      requires_proof:  task.requires_proof,
      proof_note:      task.proof_note || '',
      expires_at:      task.expires_at ? task.expires_at.slice(0,16) : '',
      max_submissions: task.max_submissions || '',
    });
    setEditing(task.id);
    setModal(true);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.description.trim()) {
      show('Title and description are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title:           form.title.trim(),
        description:     form.description.trim(),
        task_type:       form.task_type,
        points_reward:   parseInt(form.points_reward) || 15,
        requires_proof:  form.requires_proof,
        proof_note:      form.proof_note.trim() || null,
        expires_at:      form.expires_at || null,
        max_submissions: form.max_submissions ? parseInt(form.max_submissions) : null,
      };

      if (editing) {
        const { error } = await supabase.from('tasks').update(payload).eq('id', editing);
        if (error) throw error;
        show('Task updated ✓');
      } else {
        const { error } = await supabase.from('tasks').insert({ ...payload, is_active: true, created_by: 'admin' });
        if (error) throw error;
        show('Task created ✓');
      }
      setModal(false);
      fetchTasks();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(task) {
    const { error } = await supabase
      .from('tasks')
      .update({ is_active: !task.is_active })
      .eq('id', task.id);
    if (error) { show(error.message, 'error'); return; }
    show(`Task ${task.is_active ? 'deactivated' : 'activated'} ✓`);
    fetchTasks();
  }

  async function deleteTask(task) {
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('tasks').delete().eq('id', task.id);
    if (error) { show(error.message, 'error'); return; }
    show('Task deleted');
    fetchTasks();
  }

  const typeColor = { daily: 'var(--teal)', timed: 'var(--gold)', ongoing: 'var(--purple)' };
  const typeBg    = { daily: 'var(--teal-pale)', timed: 'var(--gold-pale)', ongoing: 'var(--purple-pale)' };

  return (
    <div className="page-content">
      {ToastEl}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={openCreate}>+ Create Task</button>
      </div>

      {loading ? (
        <div className="loader"><div className="spinner" /></div>
      ) : tasks.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📋</div>
          <h3>No tasks yet</h3>
          <p>Create your first task for members to complete.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Type</th>
                  <th>Points</th>
                  <th>Proof</th>
                  <th>Submissions</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr key={task.id}>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text-bright)', marginBottom: 2 }}>{task.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-dim)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {task.description}
                      </div>
                    </td>
                    <td>
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 4,
                        fontFamily: 'var(--mono)', letterSpacing: '0.08em', textTransform: 'uppercase',
                        background: typeBg[task.task_type], color: typeColor[task.task_type],
                      }}>
                        {task.task_type}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--teal)' }}>
                        +{task.points_reward} CP
                      </span>
                    </td>
                    <td>{task.requires_proof ? '✅ Yes' : '—'}</td>
                    <td>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>
                        {task.submissions?.length || 0}
                        {task.max_submissions ? ` / ${task.max_submissions}` : ''}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
                      {task.expires_at
                        ? new Date(task.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                    <td>
                      <span className={`badge ${task.is_active ? 'badge-approved' : 'badge-dim'}`}>
                        {task.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-xs btn-secondary" onClick={() => openEdit(task)}>Edit</button>
                        <button className="btn btn-xs" style={{ background: task.is_active ? 'var(--red-pale)' : 'var(--green-pale)', color: task.is_active ? 'var(--red)' : 'var(--green)', border: `1px solid ${task.is_active ? 'rgba(220,38,38,0.2)' : 'rgba(22,163,74,0.2)'}` }} onClick={() => toggleActive(task)}>
                          {task.is_active ? 'Pause' : 'Activate'}
                        </button>
                        <button className="btn btn-xs btn-danger" onClick={() => deleteTask(task)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT MODAL ── */}
      {modal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{editing ? 'Edit Task' : 'Create New Task'}</div>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Task Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Share Croissance post on X" />
              </div>
              <div className="form-group">
                <label>Description *</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Explain exactly what members need to do..." rows={3} />
              </div>
              <div className="input-row">
                <div className="form-group">
                  <label>Task Type</label>
                  <select value={form.task_type} onChange={e => setForm(f => ({ ...f, task_type: e.target.value }))}>
                    <option value="daily">Daily</option>
                    <option value="timed">Timed</option>
                    <option value="ongoing">Ongoing</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Points Reward</label>
                  <input type="number" value={form.points_reward} onChange={e => setForm(f => ({ ...f, points_reward: e.target.value }))} min="1" max="500" />
                </div>
              </div>
              <div className="input-row">
                <div className="form-group">
                  <label>Expires At (optional)</label>
                  <input type="datetime-local" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Max Submissions (optional)</label>
                  <input type="number" value={form.max_submissions} onChange={e => setForm(f => ({ ...f, max_submissions: e.target.value }))} placeholder="Leave blank for unlimited" />
                </div>
              </div>
              <div className="form-group">
                <label>Proof Instructions (optional)</label>
                <input value={form.proof_note} onChange={e => setForm(f => ({ ...f, proof_note: e.target.value }))} placeholder="e.g. Screenshot of your post with likes visible" />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textTransform: 'none', letterSpacing: 0, fontSize: 13 }}>
                  <input type="checkbox" checked={form.requires_proof} onChange={e => setForm(f => ({ ...f, requires_proof: e.target.checked }))} style={{ width: 'auto', margin: 0 }} />
                  Require image proof for this task
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}