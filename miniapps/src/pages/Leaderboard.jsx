import React, { useState, useEffect } from 'react';
import supabase from '../supabase';

const MEDALS = ['🥇','🥈','🥉'];
const TIER_EMOJI = { Recruit:'🌱', Active:'⚡', Contributor:'🥉', Elite:'🥇', Legacy:'⭐' };

// ─────────────────────────────────────────────
// Leaderboard Page — real-time monthly rankings
// ─────────────────────────────────────────────
export default function Leaderboard({ member }) {
  const [board,        setBoard]        = useState([]);
  const [legacyMembers,setLegacyMembers]= useState([]);
  const [myRank,       setMyRank]       = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [lastUpdated,  setLastUpdated]  = useState(null);

  useEffect(() => {
    fetchLeaderboard();
    fetchLegacy();

    // Real-time subscription — board updates whenever any member's points change
    const channel = supabase
      .channel('leaderboard-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'members' },
        () => {
          fetchLeaderboard();
          setLastUpdated(new Date());
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    if (member?.id && board.length > 0) {
      const myEntry = board.find(m => m.id === member.id);
      setMyRank(myEntry || null);
    }
  }, [board, member?.id]);

  async function fetchLeaderboard() {
    const { data } = await supabase
      .from('leaderboard')
      .select('*')
      .limit(50);
    setBoard(data || []);
    setLoading(false);
    setLastUpdated(new Date());
  }

  async function fetchLegacy() {
    const { data } = await supabase
      .from('members')
      .select('id, first_name, telegram_username')
      .eq('is_legacy', true);
    setLegacyMembers(data || []);
  }

  function formatTime(date) {
    if (!date) return '';
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  if (loading) return <div className="loader"><div className="spinner" /></div>;

  // Get end of current month
  const now      = new Date();
  const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const daysLeft = Math.ceil((endMonth - now) / 86400000);

  return (
    <div className="page" style={{ padding: '0 0 80px' }}>

      {/* ── HEADER ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0d2218 0%, #0E1912 100%)',
        padding: '24px 16px 16px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h2>🏆 Monthly Board</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)', animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontSize: 11, color: 'var(--teal)', fontFamily: 'var(--font-mono)' }}>LIVE</span>
          </div>
        </div>
        <p style={{ fontSize: 12 }}>
          Resets in <strong style={{ color: 'var(--gold)' }}>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong>
          {lastUpdated && <span style={{ color: 'var(--text-dim)' }}> · Updated {formatTime(lastUpdated)}</span>}
        </p>

        {/* MY RANK CARD */}
        {myRank && (
          <div style={{
            marginTop: 14, background: 'var(--teal-pale)',
            border: '1px solid rgba(13,148,136,0.3)',
            borderRadius: 10, padding: '12px 14px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--teal)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: '#fff',
            }}>
              #{myRank.rank}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-bright)' }}>You</div>
              <div style={{ fontSize: 12, color: 'var(--teal)' }}>{myRank.monthly_points} CP this month</div>
            </div>
            {myRank.is_legacy && <span style={{ fontSize: 18 }}>⭐</span>}
          </div>
        )}
      </div>

      {/* ── LEGACY TIER ── */}
      {legacyMembers.length > 0 && (
        <div style={{
          margin: '16px 16px 0',
          background: 'rgba(217,119,6,0.06)',
          border: '1px solid rgba(217,119,6,0.2)',
          borderRadius: 12, padding: '14px',
        }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.2em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 10 }}>
            ⭐ Legacy Tier — Permanent
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {legacyMembers.map(m => (
              <span key={m.id} style={{
                fontSize: 12, padding: '4px 12px',
                background: 'rgba(217,119,6,0.1)',
                border: '1px solid rgba(217,119,6,0.2)',
                borderRadius: 20, color: 'var(--gold)',
              }}>
                ⭐ {m.telegram_username ? `@${m.telegram_username}` : m.first_name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── TOP 3 PODIUM ── */}
      {board.length >= 3 && (
        <div style={{ padding: '20px 16px 0', display: 'flex', gap: 8, alignItems: 'flex-end', justifyContent: 'center' }}>
          {[board[1], board[0], board[2]].map((m, idx) => {
            const positions = [2, 1, 3];
            const heights   = [90, 110, 80];
            const pos       = positions[idx];
            const isMe      = m?.id === member?.id;

            return m ? (
              <div key={m.id} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              }}>
                <div style={{ fontSize: 22 }}>{MEDALS[pos - 1]}</div>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: isMe ? 'var(--teal)' : 'var(--bg3)',
                  border: isMe ? '2px solid var(--teal-light)' : '2px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 700, color: isMe ? '#fff' : 'var(--text)',
                }}>
                  {m.first_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-bright)', fontWeight: 600, maxWidth: 70, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.first_name}
                </div>
                <div style={{
                  width: '100%', height: heights[idx],
                  background: pos === 1 ? 'rgba(217,119,6,0.15)' : pos === 2 ? 'rgba(148,163,184,0.1)' : 'rgba(205,124,47,0.1)',
                  border: `1px solid ${pos === 1 ? 'rgba(217,119,6,0.3)' : 'var(--border)'}`,
                  borderRadius: '8px 8px 0 0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: 2,
                }}>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-bright)' }}>
                    {m.monthly_points}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>CP</div>
                </div>
              </div>
            ) : null;
          })}
        </div>
      )}

      {/* ── FULL LIST ── */}
      <div style={{ padding: '16px 16px 0' }}>
        <div className="section-label">All Rankings</div>
        {board.map((m, i) => {
          const isMe = m.id === member?.id;
          return (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 0',
              borderBottom: i < board.length - 1 ? '1px solid var(--border2)' : 'none',
              background: isMe ? 'rgba(13,148,136,0.04)' : 'transparent',
            }}>
              {/* Rank */}
              <div style={{
                width: 32, fontFamily: 'var(--font-mono)', fontSize: 13,
                fontWeight: 700, textAlign: 'center', flexShrink: 0,
                color: i < 3 ? ['var(--gold)','#94a3b8','#cd7c2f'][i] : 'var(--text-dim)',
              }}>
                {i < 3 ? MEDALS[i] : `#${m.rank}`}
              </div>

              {/* Avatar */}
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: isMe ? 'var(--teal-pale)' : 'var(--bg3)',
                border: `1px solid ${isMe ? 'var(--teal)' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700,
                color: isMe ? 'var(--teal)' : 'var(--text-dim)',
                flexShrink: 0,
              }}>
                {m.first_name?.[0]?.toUpperCase() || '?'}
              </div>

              {/* Name */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14, fontWeight: isMe ? 600 : 400,
                  color: isMe ? 'var(--text-bright)' : 'var(--text)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  {m.first_name} {m.last_name || ''}
                  {isMe && <span style={{ fontSize: 10, color: 'var(--teal)', fontFamily: 'var(--font-mono)' }}>YOU</span>}
                  {m.is_legacy && <span>⭐</span>}
                </div>
                {m.telegram_username && (
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                    @{m.telegram_username}
                  </div>
                )}
              </div>

              {/* Points */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{
                  fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono)',
                  color: i < 3 ? ['var(--gold)','#94a3b8','#cd7c2f'][i] : 'var(--text-bright)',
                }}>
                  {m.monthly_points}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>CP</div>
              </div>
            </div>
          );
        })}

        {board.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🏆</div>
            <p>No one on the board yet. Be the first to earn CP!</p>
          </div>
        )}
      </div>
    </div>
  );
}