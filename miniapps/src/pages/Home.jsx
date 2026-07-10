import React, { useState, useEffect } from 'react';
import supabase from '../supabase';

const TIER_EMOJI = {
  Recruit: '🌱', Active: '⚡', Contributor: '🥉', Elite: '🥇', Legacy: '⭐'
};

const TIER_NEXT = {
  Recruit: { next: 'Active', needed: 50 },
  Active: { next: 'Contributor', needed: 150 },
  Contributor: { next: 'Elite', needed: 300 },
  Elite: { next: 'Legacy', needed: 500 },
  Legacy: { next: null, needed: null },
};

// ─────────────────────────────────────────────
// Home Page — member dashboard
// ─────────────────────────────────────────────
export default function Home({ member }) {
  const [recentTx, setRecentTx] = useState([]);
  const [txLoading, setTxLoading] = useState(true);

  useEffect(() => {
    if (!member?.id) return;
    fetchRecentTransactions();
  }, [member?.id]);

  async function fetchRecentTransactions() {
    setTxLoading(true);
    const { data } = await supabase
      .from('point_transactions')
      .select('points, reason, category, created_at')
      .eq('member_id', member.id)
      .order('created_at', { ascending: false })
      .limit(8);
    setRecentTx(data || []);
    setTxLoading(false);
  }

  if (!member) return <div className="loader"><div className="spinner" /></div>;

  const tierInfo  = TIER_NEXT[member.tier] || {};
  const progress  = tierInfo.needed
    ? Math.min(100, Math.round((member.monthly_points / tierInfo.needed) * 100))
    : 100;

  const catIcon = {
    task_completion:    '📋',
    task_submission:    '📤',
    referral:           '🔗',
    referral_bonus:     '🎉',
    community_activity: '💬',
    ama_attendance:     '🎙',
    milestone:          '🏅',
    manual_award:       '⚡',
    manual_deduction:   '⚠️',
    legacy_monthly_bonus:'⭐',
    reset:              '🔄',
  };

  return (
    <div className="page" style={{ padding: '0 0 80px' }}>

      {/* ── HERO CARD ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0d2218 0%, #0E1912 100%)',
        padding: '28px 20px 20px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--teal-pale)', border: '2px solid var(--teal)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 700, color: 'var(--teal)',
            flexShrink: 0,
          }}>
            {member.first_name?.[0]?.toUpperCase() || '?'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-bright)', lineHeight: 1.2 }}>
              {member.first_name} {member.last_name || ''}
            </div>
            {member.telegram_username && (
              <div style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                @{member.telegram_username}
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 2 }}>Tier</div>
            <span className={`badge badge-${member.is_legacy ? 'gold' : 'teal'}`}>
              {TIER_EMOJI[member.tier]} {member.tier}
            </span>
          </div>
        </div>

        {/* CP Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { label: 'Monthly CP', value: member.monthly_points, color: 'var(--teal)' },
            { label: 'Total CP',   value: member.total_points,   color: 'var(--text-bright)' },
            { label: 'Referrals',  value: member.referred_count || 0, color: 'var(--gold)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: 'var(--bg3)', borderRadius: 10,
              padding: '12px 10px', textAlign: 'center',
              border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>
                {value}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2, letterSpacing: '0.05em' }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Tier Progress Bar */}
        {tierInfo.next && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                Progress to {TIER_EMOJI[tierInfo.next]} {tierInfo.next}
              </span>
              <span style={{ fontSize: 11, color: 'var(--teal)', fontFamily: 'var(--font-mono)' }}>
                {member.monthly_points} / {tierInfo.needed} CP
              </span>
            </div>
            <div style={{ height: 4, background: 'var(--bg4)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${progress}%`,
                background: 'var(--teal)', borderRadius: 4,
                transition: 'width 0.6s ease',
              }} />
            </div>
          </div>
        )}

        {member.is_legacy && (
          <div style={{
            marginTop: 14, padding: '10px 14px',
            background: 'rgba(217,119,6,0.1)', borderRadius: 8,
            border: '1px solid rgba(217,119,6,0.2)',
            fontSize: 13, color: 'var(--gold)', textAlign: 'center',
          }}>
            ⭐ Legacy Tier — Your status is permanent and never resets
          </div>
        )}
      </div>

      {/* ── REFERRAL CODE ── */}
      <div style={{ padding: '16px 16px 0' }}>
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="section-label">Your Referral Code</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--bg3)', borderRadius: 8,
            padding: '12px 14px', border: '1px solid var(--border)',
          }}>
            <span style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 15, color: 'var(--teal)', fontWeight: 600 }}>
              {member.referral_code}
            </span>
            <button
              className="btn btn-ghost"
              style={{ width: 'auto', padding: '6px 14px', fontSize: 13 }}
              onClick={() => {
                const link = `https://t.me/${process.env.VITE_BOT_USERNAME}?start=ref_${member.referral_code}`;
                navigator.clipboard.writeText(link);
              }}
            >
              Copy Link
            </button>
          </div>
          <p style={{ marginTop: 8, fontSize: 12 }}>
            +10 CP per active referral · +25 CP bonus for 5 referrals/month
          </p>
        </div>
      </div>

      {/* ── RECENT ACTIVITY ── */}
      <div style={{ padding: '4px 16px 0' }}>
        <div className="section-label" style={{ marginBottom: 10 }}>Recent Activity</div>

        {txLoading ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-dim)', fontSize: 13 }}>
            Loading...
          </div>
        ) : recentTx.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🌱</div>
            <p>No activity yet. Complete a task or refer a member to earn your first CP.</p>
          </div>
        ) : (
          recentTx.map((tx, i) => {
            const isPositive = tx.points >= 0;
            const sign       = isPositive ? '+' : '';
            const date       = new Date(tx.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 0', borderBottom: i < recentTx.length - 1 ? '1px solid var(--border2)' : 'none',
              }}>
                <div style={{ fontSize: 20, width: 32, textAlign: 'center', flexShrink: 0 }}>
                  {catIcon[tx.category] || '📌'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>{tx.reason}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{date}</div>
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14,
                  color: isPositive ? 'var(--teal)' : 'var(--red)',
                }}>
                  {sign}{tx.points} CP
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}