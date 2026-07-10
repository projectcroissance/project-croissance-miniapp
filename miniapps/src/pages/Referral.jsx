import React, { useState, useEffect } from 'react';
import supabase from '../supabase';

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || 'CroissanceGuildBot';

// ─────────────────────────────────────────────
// Referral Page — generate link, share, stats
// ─────────────────────────────────────────────
export default function Referral({ member }) {
  const [referrals, setReferrals] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [copied,    setCopied]    = useState(false);

  const referralLink = member
    ? `https://t.me/${BOT_USERNAME}?start=ref_${member.referral_code}`
    : '';

  useEffect(() => {
    if (member?.id) fetchReferrals();
  }, [member?.id]);

  async function fetchReferrals() {
    setLoading(true);
    const { data } = await supabase
      .from('referrals')
      .select(`
        id,
        joined_at,
        active_7_days,
        points_awarded,
        members!referrals_referred_id_fkey (
          first_name,
          telegram_username,
          monthly_points,
          tier
        )
      `)
      .eq('referrer_id', member.id)
      .order('joined_at', { ascending: false });
    setReferrals(data || []);
    setLoading(false);
  }

  function copyLink() {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function shareLink() {
    const text = encodeURIComponent(
      'Join Project Croissance — Africa\'s fastest-growing Web3 guild. Earn CP for every contribution, climb the leaderboard, and get paid. 🌱'
    );
    const url = encodeURIComponent(referralLink);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
  }

  const activeCount = referrals.filter(r => r.active_7_days).length;
  const pendingCount = referrals.filter(r => !r.active_7_days).length;
  const earnedCP = referrals.filter(r => r.points_awarded).length * 10;

  // Check if bonus was earned this month
  const bonusUnlocked = activeCount >= 5;

  const TIER_EMOJI = { Recruit:'🌱', Active:'⚡', Contributor:'🥉', Elite:'🥇', Legacy:'⭐' };

  if (!member) return <div className="loader"><div className="spinner" /></div>;

  return (
    <div className="page" style={{ padding: '20px 16px 80px' }}>

      {/* ── HERO ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0d2218 0%, #0E1912 100%)',
        border: '1px solid var(--border)',
        borderRadius: 16, padding: '24px 20px', marginBottom: 16,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🔗</div>
        <h2 style={{ marginBottom: 6 }}>Your Referral Link</h2>
        <p style={{ fontSize: 13, marginBottom: 20 }}>
          Earn <strong style={{ color: 'var(--teal)' }}>+10 CP</strong> for every member
          who stays active for 7+ days. Hit 5 referrals in a month for a
          <strong style={{ color: 'var(--gold)' }}> +25 CP bonus</strong>.
        </p>

        {/* Link display */}
        <div style={{
          background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
        }}>
          <span style={{
            flex: 1, fontFamily: 'var(--font-mono)', fontSize: 12,
            color: 'var(--teal)', wordBreak: 'break-all', textAlign: 'left',
          }}>
            {referralLink}
          </span>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={copyLink} style={{ flex: 1 }}>
            {copied ? '✅ Copied!' : '📋 Copy Link'}
          </button>
          <button className="btn btn-secondary" onClick={shareLink} style={{ flex: 1 }}>
            📤 Share
          </button>
        </div>
      </div>

      {/* ── STATS ROW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total Referred', value: referrals.length, color: 'var(--text-bright)' },
          { label: 'Active (7d+)',   value: activeCount,       color: 'var(--teal)'        },
          { label: 'CP Earned',      value: earnedCP,          color: 'var(--gold)'        },
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ textAlign: 'center', padding: '14px 10px' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>
              {value}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 3 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── BONUS PROGRESS ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--text)' }}>Monthly 5-Referral Bonus</span>
          <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--gold)' }}>
            {bonusUnlocked ? '✅ Earned!' : `${activeCount}/5`}
          </span>
        </div>
        <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${Math.min(100, (activeCount / 5) * 100)}%`,
            background: bonusUnlocked ? 'var(--gold)' : 'var(--teal)',
            borderRadius: 4, transition: 'width 0.5s ease',
          }} />
        </div>
        <p style={{ marginTop: 8, fontSize: 12 }}>
          {bonusUnlocked
            ? '+25 CP bonus has been awarded to you this month 🎉'
            : `${5 - activeCount} more active referral${5 - activeCount !== 1 ? 's' : ''} needed for the +25 CP bonus`}
        </p>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-label">How It Works</div>
        {[
          ['01', 'Share your link with friends or your audience'],
          ['02', 'They tap the link and open the Croissance bot'],
          ['03', 'They join the community and start participating'],
          ['04', 'After 7 days of activity → you earn +10 CP automatically'],
          ['05', 'Get 5 active referrals in one month → +25 CP bonus'],
        ].map(([num, text]) => (
          <div key={num} style={{
            display: 'flex', gap: 12, padding: '8px 0',
            borderBottom: num !== '05' ? '1px solid var(--border2)' : 'none',
            fontSize: 13,
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--teal)', fontSize: 11, minWidth: 24, paddingTop: 1 }}>{num}</span>
            <span style={{ color: 'var(--text)' }}>{text}</span>
          </div>
        ))}
      </div>

      {/* ── REFERRALS LIST ── */}
      <div className="section-label">People You've Referred</div>

      {loading ? (
        <div className="loader"><div className="spinner" /></div>
      ) : referrals.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>👥</div>
          <p>You haven't referred anyone yet.<br />Share your link above to start earning.</p>
        </div>
      ) : (
        referrals.map((ref, i) => {
          const m        = ref.members;
          const isActive = ref.active_7_days;
          const date     = new Date(ref.joined_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

          return (
            <div key={ref.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 0',
              borderBottom: i < referrals.length - 1 ? '1px solid var(--border2)' : 'none',
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: isActive ? 'var(--teal-pale)' : 'var(--bg3)',
                border: `1px solid ${isActive ? 'var(--teal)' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 700,
                color: isActive ? 'var(--teal)' : 'var(--text-dim)',
                flexShrink: 0,
              }}>
                {m?.first_name?.[0]?.toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: 'var(--text-bright)', fontWeight: 500 }}>
                  {m?.first_name || 'Member'}
                  {m?.tier && <span style={{ marginLeft: 6 }}>{TIER_EMOJI[m.tier]}</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  Joined {date}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  fontSize: 11, padding: '3px 8px', borderRadius: 6,
                  fontFamily: 'var(--font-mono)',
                  background: isActive ? 'var(--teal-pale)' : 'var(--bg3)',
                  color: isActive ? 'var(--teal)' : 'var(--text-dim)',
                  border: `1px solid ${isActive ? 'rgba(13,148,136,0.3)' : 'var(--border)'}`,
                }}>
                  {isActive ? '+10 CP ✓' : 'Pending'}
                </span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}