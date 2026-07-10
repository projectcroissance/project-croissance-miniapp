import React, { useState, useEffect } from 'react';
import supabase from '../supabase';

// ─────────────────────────────────────────────
// Tasks Page — active tasks + proof submission
// ─────────────────────────────────────────────
export default function Tasks({ member }) {
  const [tasks,       setTasks]       = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(null); // task id being submitted
  const [selected,    setSelected]    = useState(null); // task open in modal
  const [proofFile,   setProofFile]   = useState(null);
  const [proofNote,   setProofNote]   = useState('');
  const [uploadPct,   setUploadPct]   = useState(0);
  const [toast,       setToast]       = useState(null);

  useEffect(() => {
    fetchTasks();
    if (member?.id) fetchMySubmissions();
  }, [member?.id]);

  async function fetchTasks() {
    setLoading(true);
    const { data } = await supabase.from('active_tasks').select('*');
    setTasks(data || []);
    setLoading(false);
  }

  async function fetchMySubmissions() {
    const { data } = await supabase
      .from('submissions')
      .select('task_id, status, points_awarded, submitted_at')
      .eq('member_id', member.id);
    const map = {};
    (data || []).forEach(s => { map[s.task_id] = s; });
    setSubmissions(map);
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSubmit(task) {
    if (!member) return;
    if (task.requires_proof && !proofFile) {
      showToast('Please attach proof image', 'error');
      return;
    }

    setSubmitting(task.id);
    setUploadPct(0);

    try {
      let proofUrl = null;

      // Upload proof image to Supabase Storage
      if (proofFile) {
        const ext      = proofFile.name.split('.').pop();
        const filename = `${member.id}/${task.id}-${Date.now()}.${ext}`;

        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('proof-images')
          .upload(filename, proofFile, {
            cacheControl: '3600',
            upsert: false,
            onUploadProgress: (e) => {
              setUploadPct(Math.round((e.loaded / e.total) * 100));
            },
          });

        if (uploadErr) throw uploadErr;

        const { data: { publicUrl } } = supabase.storage
          .from('proof-images')
          .getPublicUrl(filename);

        proofUrl = publicUrl;
      }

      // Create submission record
      const { error: subErr } = await supabase
        .from('submissions')
        .insert({
          member_id:  member.id,
          task_id:    task.id,
          proof_url:  proofUrl,
          proof_note: proofNote || null,
          status:     'pending',
        });

      if (subErr) throw subErr;

      showToast(`✅ Submitted! Pending review for +${task.points_reward} CP`);
      setSelected(null);
      setProofFile(null);
      setProofNote('');
      fetchMySubmissions();
    } catch (err) {
      if (err.code === '23505') {
        showToast('You already submitted this task', 'error');
      } else {
        showToast(err.message || 'Submission failed', 'error');
      }
    } finally {
      setSubmitting(null);
      setUploadPct(0);
    }
  }

  const typeLabel = { daily: 'Daily', timed: 'Timed', ongoing: 'Ongoing' };
  const typeColor = { daily: 'var(--teal)', timed: 'var(--gold)', ongoing: 'var(--purple)' };

  function timeLeft(expiresAt) {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt) - new Date();
    if (diff <= 0) return 'Expired';
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (d > 0)  return `${d}d left`;
    if (h > 0)  return `${h}h left`;
    return 'Ending soon';
  }

  if (loading) return <div className="loader"><div className="spinner" /></div>;

  return (
    <div className="page" style={{ padding: '20px 16px 80px' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          zIndex: 999, background: toast.type === 'error' ? 'var(--red)' : 'var(--teal)',
          color: '#fff', padding: '10px 20px', borderRadius: 10,
          fontSize: 14, fontWeight: 500, boxShadow: 'var(--shadow)',
          maxWidth: '90vw', textAlign: 'center',
        }}>
          {toast.msg}
        </div>
      )}

      <h2 style={{ marginBottom: 4 }}>Active Tasks</h2>
      <p style={{ marginBottom: 20 }}>Complete tasks and submit proof to earn CP.</p>

      {tasks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <h3 style={{ marginBottom: 8 }}>No tasks right now</h3>
          <p>New tasks drop every week. Check back soon.</p>
        </div>
      ) : (
        tasks.map(task => {
          const sub     = submissions[task.id];
          const done    = !!sub;
          const pending = sub?.status === 'pending';
          const approved = sub?.status === 'approved';
          const rejected = sub?.status === 'rejected';
          const tLeft   = timeLeft(task.expires_at);

          return (
            <div key={task.id} className="card" style={{
              opacity: done && !rejected ? 0.85 : 1,
              border: approved
                ? '1px solid rgba(13,148,136,0.4)'
                : rejected
                  ? '1px solid rgba(220,38,38,0.3)'
                  : '1px solid var(--border)',
            }}>
              {/* Task header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600,
                      color: typeColor[task.task_type],
                      background: `${typeColor[task.task_type]}18`,
                      padding: '2px 8px', borderRadius: 4,
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                    }}>
                      {typeLabel[task.task_type]}
                    </span>
                    {tLeft && (
                      <span style={{ fontSize: 11, color: 'var(--gold)' }}>⏱ {tLeft}</span>
                    )}
                  </div>
                  <h3 style={{ fontSize: 15, marginBottom: 4 }}>{task.title}</h3>
                  <p style={{ fontSize: 13 }}>{task.description}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--teal)', fontFamily: 'var(--font-mono)' }}>
                    +{task.points_reward}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>CP</div>
                </div>
              </div>

              {/* Proof note */}
              {task.proof_note && (
                <div style={{
                  background: 'var(--bg3)', borderRadius: 8, padding: '8px 12px',
                  fontSize: 12, color: 'var(--text-dim)', marginBottom: 10,
                  borderLeft: '2px solid var(--teal)',
                }}>
                  📎 {task.proof_note}
                </div>
              )}

              {/* Status / Action */}
              {approved && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--teal-pale)', borderRadius: 8, padding: '10px 12px',
                  fontSize: 13, color: 'var(--teal)',
                }}>
                  ✅ Approved — <strong>+{sub.points_awarded} CP earned</strong>
                </div>
              )}
              {pending && (
                <div style={{
                  background: 'rgba(217,119,6,0.08)', borderRadius: 8, padding: '10px 12px',
                  fontSize: 13, color: 'var(--gold)',
                }}>
                  ⏳ Submitted — pending review
                </div>
              )}
              {rejected && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{
                    background: 'var(--red-pale)', borderRadius: 8, padding: '10px 12px',
                    fontSize: 13, color: 'var(--red)', marginBottom: 8,
                  }}>
                    ❌ Rejected — you can resubmit
                  </div>
                  <button className="btn btn-secondary" onClick={() => { setSelected(task); setProofNote(''); setProofFile(null); }}>
                    Resubmit
                  </button>
                </div>
              )}
              {!done && (
                <button
                  className="btn btn-primary"
                  onClick={() => { setSelected(task); setProofNote(''); setProofFile(null); }}
                >
                  {task.requires_proof ? '📤 Submit with Proof' : '✅ Mark Complete'}
                </button>
              )}
            </div>
          );
        })
      )}

      {/* ── SUBMISSION MODAL ── */}
      {selected && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.7)', display: 'flex',
          alignItems: 'flex-end',
        }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}
        >
          <div style={{
            background: 'var(--bg2)', borderRadius: '20px 20px 0 0',
            padding: '24px 20px 32px', width: '100%', maxWidth: 480,
            margin: '0 auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3>{selected.title}</h3>
              <button onClick={() => setSelected(null)} style={{
                background: 'none', border: 'none', color: 'var(--text-dim)',
                fontSize: 22, cursor: 'pointer', lineHeight: 1,
              }}>×</button>
            </div>

            <div style={{
              background: 'var(--teal-pale)', borderRadius: 8, padding: '10px 14px',
              fontSize: 14, color: 'var(--teal)', fontWeight: 600, marginBottom: 16,
            }}>
              Reward: +{selected.points_reward} CP upon approval
            </div>

            {/* Proof image upload */}
            {selected.requires_proof && (
              <div style={{ marginBottom: 14 }}>
                <div className="section-label">Proof Image *</div>
                <label style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: 8, padding: '20px',
                  background: 'var(--bg3)', border: '2px dashed var(--border)',
                  borderRadius: 12, cursor: 'pointer', minHeight: 100,
                  color: 'var(--text-dim)', fontSize: 14,
                }}>
                  {proofFile ? (
                    <span style={{ color: 'var(--teal)' }}>✅ {proofFile.name}</span>
                  ) : (
                    <>
                      <span style={{ fontSize: 28 }}>📎</span>
                      <span>Tap to attach image</span>
                      <span style={{ fontSize: 12 }}>Screenshot, photo, or video thumbnail</span>
                    </>
                  )}
                  <input
                    type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={(e) => setProofFile(e.target.files[0])}
                  />
                </label>
              </div>
            )}

            {/* Optional note */}
            <div style={{ marginBottom: 20 }}>
              <div className="section-label">Add a Note (optional)</div>
              <textarea
                value={proofNote}
                onChange={e => setProofNote(e.target.value)}
                placeholder="Any context or link to your work..."
                rows={3}
                style={{
                  width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '12px 14px', color: 'var(--text)',
                  fontSize: 14, fontFamily: 'inherit', resize: 'none',
                }}
              />
            </div>

            {/* Upload progress */}
            {submitting === selected.id && uploadPct > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: 'var(--text-dim)' }}>
                  <span>Uploading proof...</span><span>{uploadPct}%</span>
                </div>
                <div style={{ height: 4, background: 'var(--bg4)', borderRadius: 4 }}>
                  <div style={{ height: '100%', width: `${uploadPct}%`, background: 'var(--teal)', borderRadius: 4, transition: 'width 0.2s' }} />
                </div>
              </div>
            )}

            <button
              className="btn btn-primary"
              disabled={!!submitting}
              onClick={() => handleSubmit(selected)}
            >
              {submitting === selected.id ? 'Submitting...' : `Submit for +${selected.points_reward} CP`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}