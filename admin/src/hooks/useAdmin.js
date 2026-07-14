import { useState, useCallback } from 'react';

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
}