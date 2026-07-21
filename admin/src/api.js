// ─────────────────────────────────────────────
// api.js — Admin frontend API client
//
// ALL database operations go through the secure
// Express backend. The frontend holds only a JWT
// token in memory — never the service key or password.
// ─────────────────────────────────────────────

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

// In-memory token store — never persisted to localStorage
// so it's wiped on tab close / refresh (forces re-login)
let _token = null;

export function setToken(t) { _token = t; }
export function getToken()  { return _token; }
export function clearToken(){ _token = null; }
export function isLoggedIn() { return !!_token; }

// ─── Core fetch wrapper ───
async function api(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (_token) headers['Authorization'] = `Bearer ${_token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Token expired → force logout
    if (res.status === 401) {
      clearToken();
      window.dispatchEvent(new Event('auth:expired'));
    }
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return data;
}

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────
export const auth = {
  login:  (password)  => api('POST', '/api/auth/login',  { password }),
  verify: ()          => api('POST', '/api/auth/verify'),
};

// ─────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────
export const dashboard = {
  stats:          () => api('GET', '/api/dashboard/stats'),
  growth:         () => api('GET', '/api/dashboard/growth'),
  recentActivity: () => api('GET', '/api/dashboard/recent-activity'),
};

// ─────────────────────────────────────────────
// TASKS
// ─────────────────────────────────────────────
export const tasks = {
  list:   ()         => api('GET',    '/api/tasks'),
  create: (payload)  => api('POST',   '/api/tasks',      payload),
  update: (id, data) => api('PATCH',  `/api/tasks/${id}`, data),
  delete: (id)       => api('DELETE', `/api/tasks/${id}`),
  toggle: (id, is_active) => api('PATCH', `/api/tasks/${id}`, { is_active }),
};

// ─────────────────────────────────────────────
// SUBMISSIONS
// ─────────────────────────────────────────────
export const submissions = {
  list:   (status = 'all') => api('GET', `/api/submissions?status=${status}`),
  review: (id, decision, points_override, reviewer_note) =>
    api('PATCH', `/api/submissions/${id}/review`, { decision, points_override, reviewer_note }),
};

// ─────────────────────────────────────────────
// MEMBERS
// ─────────────────────────────────────────────
export const members = {
  list:         ()           => api('GET',   '/api/members'),
  transactions: (id)         => api('GET',   `/api/members/${id}/transactions`),
  award:        (id, points, reason, category) =>
    api('POST',  `/api/members/${id}/award`, { points, reason, category }),
  activity:     (id, activity) =>
    api('POST',  `/api/members/${id}/activity`, { activity }),
  setLegacy:    (id, is_legacy) =>
    api('PATCH', `/api/members/${id}/legacy`, { is_legacy }),
};

// ─────────────────────────────────────────────
// LEADERBOARD
// ─────────────────────────────────────────────
export const leaderboard = {
  live:        ()      => api('GET',  '/api/leaderboard'),
  legacy:      ()      => api('GET',  '/api/leaderboard/legacy'),
  history:     ()      => api('GET',  '/api/leaderboard/history'),
  snapshot:    (month) => api('GET',  `/api/leaderboard/history/${month}`),
  reset:       ()      => api('POST', '/api/leaderboard/reset'),
};