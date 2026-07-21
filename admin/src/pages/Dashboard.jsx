import React, { useState, useEffect } from 'react';
import { dashboard as api } from '../api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function Dashboard() {
  const [stats,   setStats]   = useState(null);
  const [growth,  setGrowth]  = useState([]);
  const [recent,  setRecent]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [s, g, r] = await Promise.all([
      api.stats().catch(() => null),
      api.growth().catch(() => []),
      api.recentActivity().catch(() => []),
    ]);
    setStats(s);
    setGrowth(g || []);
    setRecent(r || []);
    setLoading(false);
  }

  const catIcon = {
    task_completion:'📋', task_submission:'📤', referral:'🔗',
    referral_bonus:'🎉', community_activity:'💬', milestone:'🏅',
    manual_award:'⚡', manual_deduction:'⚠️', legacy_monthly_bonus:'⭐', reset:'🔄',
  };

  if (loading) return <div className="loader"><div className="spinner" /></div>;

  return (
    <div className="page-content">
      <div className="stat-grid">
        {[
          { label: 'Total Members',    value: stats?.members,  color: 'var(--text-bright)', sub: 'Guild members registered' },
          { label: 'Pending Reviews',  value: stats?.pending,  color: stats?.pending > 0 ? 'var(--gold)' : 'var(--text-bright)', sub: 'Submissions awaiting review', warn: stats?.pending > 0 },
          { label: 'Active Tasks',     value: stats?.tasks,    color: 'var(--text-bright)', sub: 'Open for submission' },
          { label: 'CP Awarded Today', value: stats?.cpToday,  color: 'var(--teal)',        sub: 'Points given in last 24hrs' },
        ].map(({ label, value, color, sub, warn }) => (
          <div className="stat-card" key={label} style={{ borderColor: warn ? 'rgba(217,119,6,0.3)' : 'var(--border)' }}>
            <div className="stat-label" style={{ color: warn ? 'var(--gold)' : 'var(--text-dim)' }}>{label}</div>
            <div className="stat-value" style={{ color }}>{value ?? '—'}</div>
            <div className="stat-sub">{sub}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Member Growth — Last 14 Days</div></div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={growth} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" tick={{ fill: '#4a5568', fontSize: 11 }} />
            <YAxis tick={{ fill: '#4a5568', fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: 'var(--text-bright)' }} itemStyle={{ color: 'var(--teal)' }} />
            <Line type="monotone" dataKey="members" stroke="var(--teal)" strokeWidth={2} dot={{ fill: 'var(--teal)', r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Recent Point Activity</div></div>
        {recent.length === 0 ? (
          <div className="empty"><div className="empty-icon">📊</div><p>No activity yet</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Member</th><th>Action</th><th>Points</th><th>Time</th></tr></thead>
              <tbody>
                {recent.map((tx, i) => {
                  const m    = tx.members;
                  const sign = tx.points >= 0 ? '+' : '';
                  const time = new Date(tx.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                  const date = new Date(tx.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                  return (
                    <tr key={i}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="avatar">{m?.first_name?.[0]?.toUpperCase()}</div>
                          <div>
                            <div style={{ color: 'var(--text-bright)', fontWeight: 500 }}>{m?.first_name || 'Member'}</div>
                            {m?.telegram_username && <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>@{m.telegram_username}</div>}
                          </div>
                        </div>
                      </td>
                      <td><span style={{ marginRight: 6 }}>{catIcon[tx.category] || '📌'}</span>{tx.reason}</td>
                      <td><span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13, color: tx.points >= 0 ? 'var(--teal)' : 'var(--red)' }}>{sign}{tx.points} CP</span></td>
                      <td style={{ color: 'var(--text-dim)', fontFamily: 'var(--mono)', fontSize: 12 }}>{time} · {date}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}