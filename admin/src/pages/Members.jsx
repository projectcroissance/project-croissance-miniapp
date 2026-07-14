import React, { useState, useEffect } from 'react';
import supabase from '../supabase';
import { useToast } from '../hooks/useAdmin';

const TIER_EMOJI  = { Recruit:'🌱', Active:'⚡', Contributor:'🥉', Elite:'🥇', Legacy:'⭐' };
const ACTIVITIES  = [
  { value: 'general_post',    label: 'Quality post in #general (+2 CP)'    },
  { value: 'ama_attendance',  label: 'Attended AMA (+5 CP)'                },
  { value: 'ama_question',    label: 'Asked AMA question (+3 CP)'          },
  { value: 'space_attendance',label: 'Attended X Space (+5 CP)'            },
  { value: 'introduction',    label: 'Proper introduction (+10 CP)'        },
  { value: 'help_member',     label: 'Helped another member (+3 CP)'       },
];

const ACT_PTS = {
  general_post: 2, ama_attendance: 5, ama_question: 3,
  space_attendance: 5, introduction: 10, help_member: 3,
};

export default function Members() {
  const [members,   setMembers]   = useState([]);
  const [search,    setSearch]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState(null); // member in modal
  const [modal,     setModal]     = useState(null); // 'profile' | 'award' | 'activity'
  const [awardForm, setAwardForm] = useState({ points: '', reason: '', category: 'manual_award' });
  const [actForm,   setActForm]   = useState({ activity: 'general_post' });
  const [saving,    setSaving]    = useState(false);
  const [txHistory, setTxHistory] = useState([]);
  const { show, ToastEl }         = useToast();

  useEffect(() => { fetchMembers(); }, []);

  async function fetchMembers() {
    setLoading(true);
    const { data } = await supabase
      .from('member_stats')
      .select('*')
      .order('monthly_points', { ascending: false });
    setMembers(data || []);
    setLoading(false);
  }

  async function openProfile(member) {
    setSelected(member);
    setModal('profile');
    // Fetch transaction history
    const { data } = await supabase
      .from('point_transactions')
      .select('points, reason, category, created_at, awarded_by')
      .eq('member_id', member.id)
      .order('created_at', { ascending: false })
      .limit(15);
    setTxHistory(data || []);
  }

  async function handleAward() {
    if (!awardForm.points || !awardForm.reason.trim()) {
      show('Points and reason are required', 'error'); return;
    }
    setSaving(true);
    try {
      const pts = parseInt(awardForm.points);
      const { error } = await supabase.rpc('award_points', {
        p_member_id:  selected.id,
        p_points:     pts,
        p_reason:     awardForm.reason.trim(),
        p_category:   awardForm.category,
        p_awarded_by: 'admin',
      });
      if (error) throw error;
      show(`${pts > 0 ? '+' : ''}${pts} CP ${pts > 0 ? 'awarded' : 'deducted'} ✓`);
      setModal(null);
      setAwardForm({ points: '', reason: '', category: 'manual_award' });
      fetchMembers();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleActivity() {
    setSaving(true);
    try {
      const act = actForm.activity;
      const pts = ACT_PTS[act] || 2;

      // Log community activity
      await supabase.from('community_activity').insert({
        member_id:   selected.id,
        activity:    act,
        points:      pts,
        recorded_by: 'admin',
      });

      const { error } = await supabase.rpc('award_points', {
        p_member_id:  selected.id,
        p_points:     pts,
        p_reason:     ACTIVITIES.find(a => a.value === act)?.label.split(' (')[0] || act,
        p_category:   'community_activity',
        p_awarded_by: 'admin',
      });
      if (error) throw error;

      show(`+${pts} CP awarded for community activity ✓`);
      setModal(null);
      fetchMembers();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function toggleLegacy(member) {
    const newStatus = !member.is_legacy;
    const { error } = await supabase
      .from('members')
      .update({ is_legacy: newStatus, tier: newStatus ? 'Legacy' : member.tier })
      .eq('id', member.id);
    if (error) { show(error.message, 'error'); return; }
    show(`Legacy status ${newStatus ? 'granted' : 'removed'} ✓`);
    fetchMembers();
    if (selected?.id === member.id) setSelected(prev => ({ ...prev, is_legacy: newStatus }));
  }

  const filtered = members.filter(m => {
    const q = search.toLowerCase();
    return !q
      || m.first_name?.toLowerCase().includes(q)
      || m.telegram_username?.toLowerCase().includes(q)
      || m.referral_code?.toLowerCase().includes(q);
  });

  const catIcon = {
    task_completion:'📋', referral:'🔗', referral_bonus:'🎉',
    community_activity:'💬', milestone:'🏅', manual_award:'⚡',
    manual_deduction:'⚠️', legacy_monthly_bonus:'⭐', reset:'🔄',
  };

  return (
    <div className="page-content">
      {ToastEl}

      {/* ── SEARCH ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div className="search-bar" style={{ flex: 1 }}>
          <span style={{ color: 'var(--text-dim)' }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, username or referral code..."
          />
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
          {filtered.length} member{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {loading ? (
        <div className="loader"><div className="spinner" /></div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Tier</th>
                  <th>Monthly CP</th>
                  <th>Total CP</th>
                  <th>Referrals</th>
                  <th>Submissions</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar">{m.first_name?.[0]?.toUpperCase() || '?'}</div>
                        <div>
                          <div style={{ fontWeight: 500, color: 'var(--text-bright)' }}>
                            {m.first_name} {m.last_name || ''}
                            {m.is_legacy && <span style={{ marginLeft: 5 }}>⭐</span>}
                          </div>
                          {m.telegram_username && (
                            <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
                              @{m.telegram_username}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: 13 }}>{TIER_EMOJI[m.tier]} {m.tier}</span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--teal)' }}>
                        {m.monthly_points}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--mono)', color: 'var(--text-bright)' }}>
                        {m.total_points}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>
                      {m.active_referrals || 0} / {m.total_referrals || 0}
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>
                      {m.approved_submissions || 0}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
                      {new Date(m.joined_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button className="btn btn-xs btn-secondary" onClick={() => openProfile(m)}>Profile</button>
                        <button className="btn btn-xs btn-primary" onClick={() => { setSelected(m); setModal('award'); }}>⚡ Points</button>
                        <button className="btn btn-xs" style={{ background: 'var(--purple-pale)', color: 'var(--purple)', border: '1px solid rgba(124,58,237,0.2)' }} onClick={() => { setSelected(m); setModal('activity'); }}>💬 Activity</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PROFILE MODAL ── */}
      {modal === 'profile' && selected && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="avatar" style={{ width: 40, height: 40, fontSize: 16 }}>
                  {selected.first_name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="modal-title">{selected.first_name} {selected.last_name || ''}</div>
                  {selected.telegram_username && (
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
                      @{selected.telegram_username}
                    </div>
                  )}
                </div>
              </div>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">

              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
                {[
                  { label: 'Monthly CP', value: selected.monthly_points, color: 'var(--teal)' },
                  { label: 'Total CP',   value: selected.total_points,   color: 'var(--text-bright)' },
                  { label: 'Tier',       value: `${TIER_EMOJI[selected.tier]} ${selected.tier}`, color: 'var(--text-bright)' },
                  { label: 'Referrals',  value: `${selected.active_referrals||0} active`, color: 'var(--text-bright)' },
                  { label: 'Approved',   value: selected.approved_submissions||0, color: 'var(--green)' },
                  { label: 'Legacy',     value: selected.is_legacy ? '⭐ Yes' : 'No', color: selected.is_legacy ? 'var(--gold)' : 'var(--text-dim)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '12px 14px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--mono)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Referral code */}
              <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Referral Code</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--teal)' }}>{selected.referral_code}</span>
              </div>

              {/* Legacy toggle */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <button className="btn btn-sm btn-primary" onClick={() => { setModal('award'); }}>⚡ Award / Deduct Points</button>
                <button className="btn btn-sm" style={{ background: 'var(--gold-pale)', color: 'var(--gold)', border: '1px solid rgba(217,119,6,0.2)' }} onClick={() => toggleLegacy(selected)}>
                  {selected.is_legacy ? '⭐ Remove Legacy' : '⭐ Grant Legacy'}
                </button>
              </div>

              {/* Transaction history */}
              <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--mono)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>Recent Transactions</div>
              {txHistory.length === 0 ? (
                <p style={{ fontSize: 13 }}>No transactions yet.</p>
              ) : (
                txHistory.map((tx, i) => {
                  const isPos = tx.points >= 0;
                  const date  = new Date(tx.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < txHistory.length - 1 ? '1px solid var(--border2)' : 'none' }}>
                      <span style={{ fontSize: 16, width: 24, textAlign: 'center', flexShrink: 0 }}>{catIcon[tx.category] || '📌'}</span>
                      <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{tx.reason}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>{date}</span>
                      <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13, color: isPos ? 'var(--teal)' : 'var(--red)', minWidth: 56, textAlign: 'right' }}>
                        {isPos ? '+' : ''}{tx.points} CP
                      </span>
                    </div>
                  );
                })
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── AWARD POINTS MODAL ── */}
      {modal === 'award' && selected && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Award / Deduct Points — {selected.first_name}</div>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Points (use negative to deduct)</label>
                <input type="number" value={awardForm.points} onChange={e => setAwardForm(f => ({ ...f, points: e.target.value }))} placeholder="e.g. 25 or -10" />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select value={awardForm.category} onChange={e => setAwardForm(f => ({ ...f, category: e.target.value }))}>
                  <option value="manual_award">Manual Award</option>
                  <option value="manual_deduction">Manual Deduction</option>
                  <option value="milestone">Milestone</option>
                  <option value="community_activity">Community Activity</option>
                </select>
              </div>
              <div className="form-group">
                <label>Reason *</label>
                <input value={awardForm.reason} onChange={e => setAwardForm(f => ({ ...f, reason: e.target.value }))} placeholder="e.g. Exceptional thread on Web3 community building" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAward} disabled={saving}>
                {saving ? 'Saving...' : 'Award Points'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── COMMUNITY ACTIVITY MODAL ── */}
      {modal === 'activity' && selected && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Log Community Activity — {selected.first_name}</div>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 16 }}>Select the activity this member completed to award the correct CP automatically.</p>
              <div className="form-group">
                <label>Activity</label>
                <select value={actForm.activity} onChange={e => setActForm({ activity: e.target.value })}>
                  {ACTIVITIES.map(a => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ background: 'var(--teal-pale)', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: 'var(--teal)' }}>
                This will award <strong>+{ACT_PTS[actForm.activity]} CP</strong> to {selected.first_name}.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleActivity} disabled={saving}>
                {saving ? 'Saving...' : `Award +${ACT_PTS[actForm.activity]} CP`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}