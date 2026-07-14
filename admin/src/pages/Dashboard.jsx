import React, { useState, useEffect } from 'react';
import supabase from '../supabase';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts';

export default function Dashboard() {
  const [stats,    setStats]    = useState(null);
  const [growth,   setGrowth]   = useState([]);
  const [recent,   setRecent]   = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    await Promise.all([fetchStats(), fetchGrowth(), fetchRecent()]);
    setLoading(false);
  }

  async function fetchStats() {
    const [members, pending, tasks, txToday] = await Promise.all([
      supabase.from('members').select('id', { count: 'exact' }),
      supabase.from('submissions').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('tasks').select('id', { count: 'exact' }).eq('is_active', true),
      supabase.from('point_transactions').select('points')
        .gte('created_at', new Date(Date.now() - 86400000).toISOString())
        .gt('points', 0),
    ]);

    const cpToday = (txToday.data || []).reduce((s, t) => s + t.points, 0);

    setStats({
      members:  members.count  || 0,
      pending:  pending.count  || 0,
      tasks:    tasks.count    || 0,
      cpToday,
    });
  }

  async function fetchGrowth() {
    // Members joined per day over last 14 days
    const since = new Date(Date.now() - 14 * 86400000).toISOString();
    const { data } = await supabase
      .from('members')
      .select('joined_at')
      .gte('joined_at', since)
      .order('joined_at', { ascending: true });

    // Group by date
    const byDate = {};
    (data || []).forEach(m => {
      const d = m.joined_at.split('T')[0];
      byDate[d] = (byDate[d] || 0) + 1;
    });

    // Fill in missing dates
    const result = [];
    for (let i = 13; i >= 0; i--) {
      const d   = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().split('T')[0];
      result.push({
        date:    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        members: byDate[key] || 0,
      });
    }
    setGrowth(result);
  }

  async function fetchRecent() {
    const { data } = await supabase
      .from('point_transactions')
      .select(`
        points, reason, category, created_at,
        members ( first_name, telegram_username )
      `)
      .order('created_at', { ascending: false })
      .limit(8);
    setRecent(data || []);
  }

  const catIcon = {
    task_completion:    '📋',
    task_submission:    '📤',
    referral:           '🔗',
    referral_bonus:     '🎉',
    community_activity: '💬',
    milestone:          '🏅',
    manual_award:       '⚡',
    manual_deduction:   '⚠️',
    legacy_monthly_bonus:'⭐',
    reset:              '🔄',
  };

  if (loading) return <div className="loader"><div className="spinner" /></div>;

  return (
    <div className="page-content">

      {/* ── STAT CARDS ── */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total Members</div>
          <div className="stat-value">{stats?.members}</div>
          <div className="stat-sub">Guild members registered</div>
        </div>
        <div className="stat-card" style={{ borderColor: stats?.pending > 0 ? 'rgba(217,119,6,0.3)' : 'var(--border)' }}>
          <div className="stat-label" style={{ color: stats?.pending > 0 ? 'var(--gold)' : 'var(--text-dim)' }}>Pending Reviews</div>
          <div className="stat-value" style={{ color: stats?.pending > 0 ? 'var(--gold)' : 'var(--text-bright)' }}>
            {stats?.pending}
          </div>
          <div className="stat-sub">Submissions awaiting review</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Tasks</div>
          <div className="stat-value">{stats?.tasks}</div>
          <div className="stat-sub">Open for submission</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">CP Awarded Today</div>
          <div className="stat-value" style={{ color: 'var(--teal)' }}>{stats?.cpToday}</div>
          <div className="stat-sub">Points given in last 24hrs</div>
        </div>
      </div>

      {/* ── GROWTH CHART ── */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Member Growth — Last 14 Days</div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={growth} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" tick={{ fill: '#4a5568', fontSize: 11 }} />
            <YAxis tick={{ fill: '#4a5568', fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: 'var(--text-bright)' }}
              itemStyle={{ color: 'var(--teal)' }}
            />
            <Line
              type="monotone" dataKey="members" stroke="var(--teal)"
              strokeWidth={2} dot={{ fill: 'var(--teal)', r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── RECENT ACTIVITY ── */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Recent Point Activity</div>
        </div>
        {recent.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📊</div>
            <p>No activity yet</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Action</th>
                  <th>Points</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((tx, i) => {
                  const m    = tx.members;
                  const name = m?.first_name || 'Unknown';
                  const sign = tx.points >= 0 ? '+' : '';
                  const time = new Date(tx.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                  const date = new Date(tx.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                  return (
                    <tr key={i}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="avatar">{name[0]?.toUpperCase()}</div>
                          <div>
                            <div style={{ color: 'var(--text-bright)', fontWeight: 500 }}>{name}</div>
                            {m?.telegram_username && (
                              <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
                                @{m.telegram_username}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ marginRight: 6 }}>{catIcon[tx.category] || '📌'}</span>
                        {tx.reason}
                      </td>
                      <td>
                        <span style={{
                          fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13,
                          color: tx.points >= 0 ? 'var(--teal)' : 'var(--red)',
                        }}>
                          {sign}{tx.points} CP
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-dim)', fontFamily: 'var(--mono)', fontSize: 12 }}>
                        {time} · {date}
                      </td>
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