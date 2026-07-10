import React, { useState, useEffect } from 'react';
import supabase from '../supabase';

const CAT_COLORS = {
  'Community Activity': { color: 'var(--teal)',   bg: 'var(--teal-pale)',   icon: '💬' },
  'Growth Actions':     { color: 'var(--green)',  bg: 'var(--green-pale)',  icon: '📈' },
  'Tasks':              { color: 'var(--purple)', bg: 'var(--purple-pale)', icon: '📋' },
  'Milestones':         { color: '#94a3b8',       bg: 'rgba(148,163,184,0.08)', icon: '🏅' },
  'Legacy':             { color: 'var(--gold)',   bg: 'var(--gold-pale)',   icon: '⭐' },
  'Deductions':         { color: 'var(--red)',    bg: 'var(--red-pale)',    icon: '⚠️' },
};

const TIERS = [
  { name: 'Recruit',     emoji: '🌱', range: '0–49 CP',      color: 'var(--text-dim)',  unlock: 'Read channels, post in #general, generate referral link' },
  { name: 'Active',      emoji: '⚡', range: '50–149 CP',    color: 'var(--teal)',      unlock: 'Apply for opportunities, submit tasks, priority AMA questions' },
  { name: 'Contributor', emoji: '🥉', range: '150–299 CP',   color: '#94a3b8',          unlock: 'Cash reward eligible, client bounty access, portfolio consideration' },
  { name: 'Elite',       emoji: '🥇', range: '300–499 CP',   color: 'var(--gold)',      unlock: 'First access to premium gigs, endorsed for external roles, Legacy tracking begins' },
  { name: 'Legacy',      emoji: '⭐', range: '500+ CP × 3mo', color: '#fbbf24',         unlock: 'Permanent status, never resets, first on all gigs, +30 CP monthly bonus, brand ambassador consideration' },
];

// ─────────────────────────────────────────────
// Rules Page — full points breakdown + tiers
// ─────────────────────────────────────────────
export default function Rules() {
  const [rules,       setRules]       = useState({});
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState('points');
  const [openCategory,setOpenCategory]= useState('Community Activity');

  useEffect(() => { fetchRules(); }, []);

  async function fetchRules() {
    setLoading(true);
    const { data } = await supabase
      .from('point_rules')
      .select('*')
      .order('sort_order', { ascending: true });

    // Group by category
    const grouped = {};
    (data || []).forEach(rule => {
      if (!grouped[rule.category]) grouped[rule.category] = [];
      grouped[rule.category].push(rule);
    });
    setRules(grouped);
    setLoading(false);
  }

  const tabs = [
    { id: 'points', label: '⚡ Points'  },
    { id: 'tiers',  label: '🏆 Tiers'   },
    { id: 'tips',   label: '💡 Tips'    },
    { id: 'reset',  label: '🔄 Reset'   },
  ];

  return (
    <div className="page" style={{ padding: '0 0 80px' }}>

      {/* ── PAGE HEADER ── */}
      <div style={{
        padding: '20px 16px 0',
        borderBottom: '1px solid var(--border)',
      }}>
        <h2 style={{ marginBottom: 4 }}>Points Rules</h2>
        <p style={{ fontSize: 13, marginBottom: 16 }}>Everything you need to know to maximise your CP.</p>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: '10px 16px', fontSize: 13, fontFamily: 'inherit',
              fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? 'var(--teal)' : 'var(--text-dim)',
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: activeTab === tab.id ? '2px solid var(--teal)' : '2px solid transparent',
              whiteSpace: 'nowrap', transition: 'all 0.15s',
            }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB: POINTS ── */}
      {activeTab === 'points' && (
        <div style={{ padding: '16px 16px 0' }}>
          {loading ? (
            <div className="loader"><div className="spinner" /></div>
          ) : (
            Object.entries(rules).map(([category, items]) => {
              const meta    = CAT_COLORS[category] || { color: 'var(--teal)', bg: 'var(--teal-pale)', icon: '📌' };
              const isOpen  = openCategory === category;

              return (
                <div key={category} className="card" style={{ padding: 0, marginBottom: 10, overflow: 'hidden' }}>
                  {/* Category header — toggles */}
                  <button
                    onClick={() => setOpenCategory(isOpen ? null : category)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '14px 16px', background: isOpen ? meta.bg : 'none',
                      border: 'none', cursor: 'pointer', transition: 'background 0.15s',
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{meta.icon}</span>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: meta.color, textAlign: 'left' }}>
                      {category}
                    </span>
                    <span style={{ color: 'var(--text-dim)', fontSize: 16 }}>{isOpen ? '▲' : '▼'}</span>
                  </button>

                  {/* Rules list */}
                  {isOpen && (
                    <div style={{ borderTop: `1px solid var(--border)` }}>
                      {items.map((rule, i) => (
                        <div key={rule.id} style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr auto auto',
                          gap: 8, alignItems: 'center',
                          padding: '12px 16px',
                          borderBottom: i < items.length - 1 ? '1px solid var(--border2)' : 'none',
                        }}>
                          <div>
                            <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>
                              {rule.action}
                            </div>
                            {rule.limit_note && (
                              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                                {rule.limit_note}
                              </div>
                            )}
                          </div>
                          <div style={{
                            fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
                            color: category === 'Deductions' ? 'var(--red)' : meta.color,
                            whiteSpace: 'nowrap',
                          }}>
                            {rule.points}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── TAB: TIERS ── */}
      {activeTab === 'tiers' && (
        <div style={{ padding: '16px 16px 0' }}>
          <p style={{ fontSize: 13, marginBottom: 16 }}>
            Tiers are based on CP earned <strong style={{ color: 'var(--text-bright)' }}>this month only</strong> — not all time.
            Every member competes fresh each month. Legacy Tier is the only permanent status.
          </p>
          {TIERS.map((tier, i) => (
            <div key={tier.name} className="card" style={{
              border: tier.name === 'Legacy' ? '1px solid rgba(217,119,6,0.3)' : '1px solid var(--border)',
              background: tier.name === 'Legacy' ? 'rgba(217,119,6,0.04)' : 'var(--bg2)',
              marginBottom: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <span style={{ fontSize: 28 }}>{tier.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: tier.color }}>{tier.name}</div>
                  <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                    {tier.range}
                  </div>
                </div>
                {tier.name === 'Legacy' && (
                  <span style={{
                    fontSize: 10, padding: '3px 8px', borderRadius: 4,
                    background: 'rgba(217,119,6,0.15)', color: 'var(--gold)',
                    fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
                  }}>
                    PERMANENT
                  </span>
                )}
              </div>
              <div style={{
                background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px',
                fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.7,
                borderLeft: `3px solid ${tier.color}`,
              }}>
                {tier.unlock}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: TIPS ── */}
      {activeTab === 'tips' && (
        <div style={{ padding: '16px 16px 0' }}>
          <p style={{ fontSize: 13, marginBottom: 16, color: 'var(--text-dim)' }}>
            How to maximise your CP every month:
          </p>
          {[
            { icon: '🔗', title: 'Referrals are the fastest path', body: 'Each active referral gives +10 CP passively. Hit 5 in a month and you get an extra +25 CP. That\'s 75 CP from referrals alone — enough to hit Active tier without doing anything else.' },
            { icon: '📋', title: 'Internship tasks give the most CP', body: 'Weeks 3–4 internship tasks award +25 CP each, with the top submission of the week earning a +50 CP bonus. Prioritise these over community posts.' },
            { icon: '🎙', title: 'Never miss an AMA', body: 'Attending an AMA = +5 CP. Asking a good question = another +3 CP. That\'s +8 CP in an hour with zero extra effort.' },
            { icon: '📤', title: 'Submit proof immediately', body: 'Once you complete a task, submit right away. Delayed submissions can lose priority if the task closes. Admin reviews within 48 hours.' },
            { icon: '🌱', title: 'Introduce yourself properly', body: 'Your intro in #general earns +10 CP — one time. Make it count: your name, your skills, what you want to build. Team notices quality intros.' },
            { icon: '⭐', title: 'Legacy Tier is the real goal', body: 'Hit 500+ CP in 3 separate months (not necessarily in a row) and you\'re inducted permanently. Legacy members get +30 CP every month for free and first access to every opportunity. That compounds.' },
          ].map(({ icon, title, body }) => (
            <div key={title} className="card" style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-bright)', marginBottom: 4 }}>{title}</div>
                  <p style={{ fontSize: 13, margin: 0 }}>{body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: RESET ── */}
      {activeTab === 'reset' && (
        <div style={{ padding: '16px 16px 0' }}>
          <div className="card" style={{ marginBottom: 12 }}>
            <h3 style={{ marginBottom: 10, fontSize: 15 }}>🔄 Monthly Reset Rules</h3>
            {[
              ['When does reset happen?',    'The 1st of every month at midnight.'],
              ['What resets?',               'Monthly CP scores reset to 0 for all members.'],
              ['What does NOT reset?',       'Total (all-time) CP, Legacy Tier status, your referral history, and your submission records.'],
              ['What happens to Legacy?',    'Legacy Tier members keep their ⭐ badge permanently. They also receive a +30 CP monthly bonus at the start of every new month.'],
              ['What happens to my rank?',   'Leaderboard snapshots are saved before every reset. You can see your historical rankings in the admin system.'],
              ['When are rewards paid out?', 'Within 72 hours after the reset. Top 10 members receive their cash reward based on that month\'s pool.'],
            ].map(([q, a]) => (
              <div key={q} style={{ padding: '12px 0', borderBottom: '1px solid var(--border2)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-bright)', marginBottom: 4 }}>{q}</div>
                <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{a}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ background: 'var(--gold-pale)', border: '1px solid rgba(217,119,6,0.2)' }}>
            <h3 style={{ color: 'var(--gold)', fontSize: 14, marginBottom: 8 }}>⭐ How to Qualify for Legacy Tier</h3>
            <p style={{ fontSize: 13, margin: 0 }}>
              Earn <strong style={{ color: 'var(--text-bright)' }}>500+ CP in 3 separate months</strong> — they don't have to be consecutive.
              Each qualifying month is tracked permanently. When your 3rd qualifying month ends, you're inducted at the next reset.
              The team announces your induction publicly in the community.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}