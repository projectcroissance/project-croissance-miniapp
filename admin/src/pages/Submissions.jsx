import React, { useState, useEffect } from 'react';
import supabase from '../supabase';
import { useToast } from '../hooks/useAdmin';

export default function Submissions() {
  const [submissions, setSubmissions] = useState([]);
  const [filter,      setFilter]      = useState('pending');
  const [loading,     setLoading]     = useState(true);
  const [reviewing,   setReviewing]   = useState(null); // submission open in modal
  const [note,        setNote]        = useState('');
  const [customPts,   setCustomPts]   = useState('');
  const [saving,      setSaving]      = useState(false);
  const [preview,     setPreview]     = useState(null); // image preview
  const { show, ToastEl }             = useToast();

  useEffect(() => { fetchSubmissions(); }, [filter]);

  async function fetchSubmissions() {
    setLoading(true);
    let q = supabase
      .from('submissions')
      .select(`
        *,
        members ( id, first_name, last_name, telegram_username, monthly_points, tier ),
        tasks   ( title, points_reward, requires_proof )
      `)
      .order('submitted_at', { ascending: false });

    if (filter !== 'all') q = q.eq('status', filter);

    const { data } = await q.limit(100);
    setSubmissions(data || []);
    setLoading(false);
  }

  function openReview(sub) {
    setReviewing(sub);
    setNote('');
    setCustomPts(sub.tasks?.points_reward?.toString() || '15');
  }

  async function handleDecision(decision) {
    if (!reviewing) return;
    setSaving(true);

    try {
      const pts = parseInt(customPts) || reviewing.tasks?.points_reward || 0;

      const { error: subErr } = await supabase
        .from('submissions')
        .update({
          status:         decision,
          points_awarded: decision === 'approved' ? pts : 0,
          reviewer_note:  note.trim() || null,
          reviewed_by:    'admin',
          reviewed_at:    new Date().toISOString(),
        })
        .eq('id', reviewing.id);

      if (subErr) throw subErr;

      // Award points if approved
      if (decision === 'approved') {
        const { error: ptErr } = await supabase.rpc('award_points', {
          p_member_id:  reviewing.members.id,
          p_points:     pts,
          p_reason:     `Task approved: ${reviewing.tasks?.title}`,
          p_category:   'task_completion',
          p_reference:  reviewing.task_id,
          p_awarded_by: 'admin',
        });
        if (ptErr) throw ptErr;
      }

      show(`Submission ${decision} — ${decision === 'approved' ? `+${pts} CP awarded` : 'no points awarded'}`);
      setReviewing(null);
      fetchSubmissions();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  const statusCounts = submissions.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {});

  const TIER_EMOJI = { Recruit:'🌱', Active:'⚡', Contributor:'🥉', Elite:'🥇', Legacy:'⭐' };

  return (
    <div className="page-content">
      {ToastEl}

      {/* ── FILTER TABS ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { id: 'pending',  label: 'Pending',  color: 'var(--gold)'  },
          { id: 'approved', label: 'Approved', color: 'var(--green)' },
          { id: 'rejected', label: 'Rejected', color: 'var(--red)'   },
          { id: 'all',      label: 'All',      color: 'var(--text)'  },
        ].map(({ id, label, color }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className="btn btn-sm"
            style={{
              background: filter === id ? `${color}18` : 'var(--bg3)',
              color:      filter === id ? color : 'var(--text-dim)',
              border:     `1px solid ${filter === id ? `${color}40` : 'var(--border)'}`,
            }}
          >
            {label}
            {id !== 'all' && statusCounts[id] > 0 && (
              <span style={{
                marginLeft: 6, background: color, color: '#fff',
                borderRadius: 10, padding: '1px 6px', fontSize: 10, fontFamily: 'var(--mono)',
              }}>
                {statusCounts[id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loader"><div className="spinner" /></div>
      ) : submissions.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📭</div>
          <h3>No {filter} submissions</h3>
          <p>Check back when members start submitting tasks.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Task</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Proof</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map(sub => {
                  const m    = sub.members;
                  const t    = sub.tasks;
                  const time = new Date(sub.submitted_at).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                  });

                  return (
                    <tr key={sub.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="avatar">{m?.first_name?.[0]?.toUpperCase() || '?'}</div>
                          <div>
                            <div style={{ fontWeight: 500, color: 'var(--text-bright)' }}>
                              {m?.first_name} {m?.last_name || ''}
                              {m?.tier && <span style={{ marginLeft: 5 }}>{TIER_EMOJI[m.tier]}</span>}
                            </div>
                            {m?.telegram_username && (
                              <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
                                @{m.telegram_username}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--text-bright)', marginBottom: 2 }}>{t?.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--teal)', fontFamily: 'var(--mono)' }}>+{t?.points_reward} CP</div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>{time}</td>
                      <td>
                        <span className={`badge badge-${sub.status}`}>{sub.status}</span>
                        {sub.status === 'approved' && (
                          <div style={{ fontSize: 11, color: 'var(--teal)', fontFamily: 'var(--mono)', marginTop: 3 }}>
                            +{sub.points_awarded} CP
                          </div>
                        )}
                      </td>
                      <td>
                        {sub.proof_url ? (
                          <button
                            className="btn btn-xs btn-secondary"
                            onClick={() => setPreview(sub.proof_url)}
                          >
                            👁 View
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td>
                        {sub.status === 'pending' ? (
                          <button className="btn btn-xs btn-primary" onClick={() => openReview(sub)}>
                            Review
                          </button>
                        ) : (
                          <button className="btn btn-xs btn-secondary" onClick={() => openReview(sub)}>
                            Details
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── IMAGE PREVIEW MODAL ── */}
      {preview && (
        <div
          className="modal-overlay"
          onClick={() => setPreview(null)}
          style={{ cursor: 'zoom-out' }}
        >
          <div style={{ maxWidth: '90vw', maxHeight: '90vh' }}>
            <img
              src={preview}
              alt="Proof"
              style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 12, objectFit: 'contain' }}
            />
          </div>
        </div>
      )}

      {/* ── REVIEW MODAL ── */}
      {reviewing && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setReviewing(null); }}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Review Submission</div>
              <button className="modal-close" onClick={() => setReviewing(null)}>×</button>
            </div>
            <div className="modal-body">

              {/* Member & task info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Member</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-bright)' }}>
                    {reviewing.members?.first_name} {reviewing.members?.last_name || ''}
                  </div>
                  {reviewing.members?.telegram_username && (
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
                      @{reviewing.members.telegram_username}
                    </div>
                  )}
                </div>
                <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Task</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-bright)' }}>{reviewing.tasks?.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--teal)', fontFamily: 'var(--mono)' }}>
                    Default: +{reviewing.tasks?.points_reward} CP
                  </div>
                </div>
              </div>

              {/* Proof image */}
              {reviewing.proof_url && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8, fontFamily: 'var(--mono)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Proof Image</div>
                  <img
                    src={reviewing.proof_url}
                    alt="Proof"
                    style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 10, cursor: 'zoom-in', border: '1px solid var(--border)' }}
                    onClick={() => setPreview(reviewing.proof_url)}
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4, textAlign: 'center' }}>Click to view full size</div>
                </div>
              )}

              {/* Member's note */}
              {reviewing.proof_note && (
                <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '12px 14px', marginBottom: 14, fontSize: 13, color: 'var(--text)', borderLeft: '2px solid var(--teal)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Member's Note</div>
                  {reviewing.proof_note}
                </div>
              )}

              {/* Current status */}
              {reviewing.status !== 'pending' && (
                <div style={{
                  background: reviewing.status === 'approved' ? 'var(--green-pale)' : 'var(--red-pale)',
                  border: `1px solid ${reviewing.status === 'approved' ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)'}`,
                  borderRadius: 8, padding: '12px 14px', marginBottom: 14,
                  fontSize: 13,
                  color: reviewing.status === 'approved' ? 'var(--green)' : 'var(--red)',
                }}>
                  {reviewing.status === 'approved' ? `✅ Approved — +${reviewing.points_awarded} CP awarded` : '❌ Rejected'}
                  {reviewing.reviewer_note && (
                    <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-dim)' }}>
                      Note: {reviewing.reviewer_note}
                    </div>
                  )}
                </div>
              )}

              {/* Points override */}
              {reviewing.status === 'pending' && (
                <>
                  <div className="form-group">
                    <label>Points to Award</label>
                    <input
                      type="number"
                      value={customPts}
                      onChange={e => setCustomPts(e.target.value)}
                      min="0"
                      max="500"
                    />
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                      Default is {reviewing.tasks?.points_reward} CP. Override if quality warrants more or less.
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Reviewer Note (optional)</label>
                    <textarea
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="Feedback for the member..."
                      rows={2}
                    />
                  </div>
                </>
              )}
            </div>

            {reviewing.status === 'pending' && (
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setReviewing(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={() => handleDecision('rejected')} disabled={saving}>
                  {saving ? '...' : '❌ Reject'}
                </button>
                <button className="btn btn-success" onClick={() => handleDecision('approved')} disabled={saving}>
                  {saving ? '...' : `✅ Approve +${customPts} CP`}
                </button>
              </div>
            )}
            {reviewing.status !== 'pending' && (
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setReviewing(null)}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}