import React, { useState } from 'react';
import './index.css';
import { useTelegram } from './hooks/useTelegram';
import { useMember }   from './hooks/useMember';
import Home        from './pages/Home';
import Tasks       from './pages/Tasks';
import Leaderboard from './pages/Leaderboard';
import Referral    from './pages/Referral';
import Rules       from './pages/Rules';

// ─── Nav icons ───
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const TaskIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2" width="6" height="4" rx="1"/><path d="M4 7h16v14a1 1 0 01-1 1H5a1 1 0 01-1-1z"/>
    <path d="M9 12l2 2 4-4"/>
  </svg>
);
const BoardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);
const RefIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
  </svg>
);
const RulesIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>
  </svg>
);

const NAV = [
  { id: 'home',      label: 'Home',      Icon: HomeIcon  },
  { id: 'tasks',     label: 'Tasks',     Icon: TaskIcon  },
  { id: 'board',     label: 'Board',     Icon: BoardIcon },
  { id: 'referral',  label: 'Refer',     Icon: RefIcon   },
  { id: 'rules',     label: 'Rules',     Icon: RulesIcon },
];

// ─────────────────────────────────────────────
// App root
// ─────────────────────────────────────────────
export default function App() {
  const [activePage, setActivePage] = useState('home');
  const { tgUser, ready, haptic }   = useTelegram();
  const { member, loading }         = useMember(tgUser);

  // ── Loading screen ──
  if (!ready || loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)', gap: 16,
      }}>
        <div style={{ fontSize: 48 }}>🌱</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-bright)' }}>
          Project Croissance
        </div>
        <div className="spinner" />
        <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Loading your guild...</div>
      </div>
    );
  }

  // ── Error — no user data from Telegram ──
  if (!tgUser) {
    return (
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 24px', textAlign: 'center', gap: 12,
      }}>
        <div style={{ fontSize: 40 }}>⚠️</div>
        <h2>Open from Telegram</h2>
        <p>This app must be opened through the Croissance bot on Telegram.</p>
      </div>
    );
  }

  function navigate(page) {
    haptic('light');
    setActivePage(page);
  }

  return (
    <div className="app">

      {/* ── PAGE CONTENT ── */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activePage === 'home'     && <Home        member={member} />}
        {activePage === 'tasks'    && <Tasks       member={member} />}
        {activePage === 'board'    && <Leaderboard member={member} />}
        {activePage === 'referral' && <Referral    member={member} />}
        {activePage === 'rules'    && <Rules />}
      </div>

      {/* ── BOTTOM NAV ── */}
      <nav className="bottom-nav">
        {NAV.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`nav-item ${activePage === id ? 'active' : ''}`}
            onClick={() => navigate(id)}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </nav>

    </div>
  );
}