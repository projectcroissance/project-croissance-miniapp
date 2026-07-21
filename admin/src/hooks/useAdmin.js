import { useState, useCallback, useEffect } from 'react';
import { auth as authApi, setToken, clearToken } from '../api';

// ─────────────────────────────────────────────
// useToast
// ─────────────────────────────────────────────
export function useToast() {
  const [toast, setToast] = useState(null);

  const show = useCallback((msg, type = 'success', duration = 3500) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), duration);
  }, []);

  const ToastEl = toast ? (
    <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
  ) : null;

  return { show, ToastEl };
}

// ─────────────────────────────────────────────
// useAdminAuth — JWT in memory only
// Password and service key never reach the browser
// ─────────────────────────────────────────────
export function useAdminAuth() {
  const [authed,   setAuthed]   = useState(false);
  const [checking, setChecking] = useState(false);

  // When JWT expires, api.js fires this event
  useEffect(() => {
    function handleExpiry() { setAuthed(false); }
    window.addEventListener('auth:expired', handleExpiry);
    return () => window.removeEventListener('auth:expired', handleExpiry);
  }, []);

  async function login(password) {
    setChecking(true);
    try {
      const { token } = await authApi.login(password);
      setToken(token);  // memory only — never localStorage
      setAuthed(true);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setChecking(false);
    }
  }

  function logout() {
    clearToken();
    setAuthed(false);
  }

  return { authed, checking, login, logout };
}

/*import { useState, useCallback } from 'react';

// ─────────────────────────────────────────────
// useToast — global notification system
// ─────────────────────────────────────────────
export function useToast() {
  const [toast, setToast] = useState(null);

  const show = useCallback((msg, type = 'success', duration = 3000) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), duration);
  }, []);

  const ToastEl = toast ? (
    <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
  ) : null;

  return { show, ToastEl };
}

// ─────────────────────────────────────────────
// useAdminAuth — simple password-based gate
// Stores auth state in sessionStorage so it
// persists across refreshes in the same tab
// ─────────────────────────────────────────────
export function useAdminAuth() {
  const [authed, setAuthed] = useState(() => {
    return sessionStorage.getItem('croi_admin_auth') === 'true';
  });

  function login(password) {
    const correct = process.env.REACT_APP_ADMIN_PASSWORD;
    if (password === correct) {
      sessionStorage.setItem('croi_admin_auth', 'true');
      setAuthed(true);
      return true;
    }
    return false;
  }

  function logout() {
    sessionStorage.removeItem('croi_admin_auth');
    setAuthed(false);
  }

  return { authed, login, logout };
}*/