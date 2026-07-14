import React, { useState } from 'react';
import './index.css';
import { useAdminAuth } from './hooks/useAdmin';
import Dashboard  from './pages/Dashboard';
import Tasks      from './pages/Tasks';
import Submissions from './pages/Submissions';
import Members    from './pages/Members';
import Leaderboard from './pages/Leaderboard';

// ── Nav icons ──
const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const NAV_ITEMS = [
  {
    id: 'dashboard', label: 'Dashboard',
    icon: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10',
  },
  {
    id: 'submissions', label: 'Submissions',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2 M9 12l2 2 4-4 M9 5a2 2 0 002 2h2a2 2 0 002-2 2 2 0 00-2-2h-2a2 2 0 00-2 2',
  },
  {
    id: 'tasks', label: 'Tasks',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2 M9 5a2 2 0 002 2h2a2 2 0 002-2 2 2 0 00-2-2h-2a2 2 0 00-2 2',
  },
  {
    id: 'members', label: 'Members',
    icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75 M9 7a4 4 0 100 8 4 4 0 000-8z',
  },
  {
    id: 'leaderboard', label: 'Leaderboard',
    icon: 'M22 12h-4l-3 9L9 3l-3 9H2',
  },
];

const PAGE_TITLES = {
  dashboard:   'Dashboard',
  submissions: 'Submission Reviews',
  tasks:       'Task Management',
  members:     'Members',
  leaderboard: 'Leaderboard',
};

// ─────────────────────────────────────────────
// Login Gate
// ─────────────────────────────────────────────
function LoginGate({ onLogin }) {
  const [pw,    setPw]    = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!onLogin(pw)) {
      setError('Incorrect password. Try again.');
      setPw('');
    }
  }

  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)',
    }}>
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '40px 36px', width: '100%', maxWidth: 380,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🌱</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-bright)', marginBottom: 4 }}>
            Project Croissance
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--mono)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Admin Panel
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Admin Password</label>
            <input
              type="password"
              value={pw}
              onChange={e => { setPw(e.target.value); setError(''); }}
              placeholder="Enter password..."
              autoFocus
            />
          </div>
          {error && (
            <div style={{ fontSize: 13, color: 'var(--red)', marginBottom: 14, textAlign: 'center' }}>
              {error}
            </div>
          )}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Enter Admin Panel
          </button>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────
export default function App() {
  const [page,  setPage]  = useState('dashboard');
  const { authed, login, logout } = useAdminAuth();

  if (!authed) return <LoginGate onLogin={login} />;

  return (
    <div className="admin-layout">

      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div style={{ fontSize: 20, marginBottom: 4 }}>🌱</div>
          <div className="brand-name">Croissance</div>
          <div className="brand-tag">Admin Panel</div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Main</div>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`nav-link ${page === item.id ? 'active' : ''}`}
              onClick={() => setPage(item.id)}
            >
              <Icon d={item.icon} />
              {item.label}
              {/* Pending badge on submissions */}
            </button>
          ))}

          <div className="divider" style={{ margin: '16px 0' }} />

          <button className="nav-link" onClick={logout} style={{ color: 'var(--red)' }}>
            <Icon d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            Sign Out
          </button>
        </nav>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="main">
        <div className="topbar">
          <div className="page-title">{PAGE_TITLES[page]}</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>

        {page === 'dashboard'   && <Dashboard />}
        {page === 'submissions' && <Submissions />}
        {page === 'tasks'       && <Tasks />}
        {page === 'members'     && <Members />}
        {page === 'leaderboard' && <Leaderboard />}
      </main>

    </div>
  );
}