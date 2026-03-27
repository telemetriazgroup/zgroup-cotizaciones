/* ── ZGROUP API Client — Auth + proyectos ── */
const API_BASE = 'http://localhost:3001/api';
const AUTH_KEY = 'zgroup_access';

let accessToken = null;
let refreshInFlight = null;

const authChannel =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('zgroup-auth') : null;

function getAccessToken() {
  if (!accessToken) accessToken = sessionStorage.getItem(AUTH_KEY);
  return accessToken;
}

function setAccessToken(token) {
  accessToken = token;
  if (token) sessionStorage.setItem(AUTH_KEY, token);
  else sessionStorage.removeItem(AUTH_KEY);
  if (authChannel) {
    if (token) authChannel.postMessage({ type: 'login', accessToken: token });
    else authChannel.postMessage({ type: 'logout' });
  }
}

async function tryRefresh() {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.accessToken) {
        setAccessToken(data.accessToken);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

function skipAuthRetry(path) {
  return path.startsWith('/auth/login') || path.startsWith('/auth/refresh');
}

async function apiFetch(path, options = {}, isRetry = false) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const t = getAccessToken();
  if (t) headers.Authorization = `Bearer ${t}`;

  const res = await fetch(API_BASE + path, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401 && !isRetry && !skipAuthRetry(path)) {
    const errBody = await res.json().catch(() => ({}));
    const refreshed = await tryRefresh();
    if (refreshed) return apiFetch(path, options, true);
    throw new Error(errBody.error || 'Sesión expirada');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function loginRequest(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Credenciales incorrectas');
  if (data.accessToken) setAccessToken(data.accessToken);
  return data;
}

async function logoutRequest() {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    setAccessToken(null);
  }
}

if (authChannel) {
  authChannel.onmessage = (ev) => {
    if (ev.data?.type === 'logout') {
      accessToken = null;
      sessionStorage.removeItem(AUTH_KEY);
      window.location.hash = '#/login';
      window.location.reload();
    }
    if (ev.data?.type === 'login' && ev.data.accessToken) {
      accessToken = ev.data.accessToken;
      sessionStorage.setItem(AUTH_KEY, ev.data.accessToken);
    }
  };
}

/* ── Projects ── */
const API = {
  login: loginRequest,
  logout: logoutRequest,
  tryRefresh,
  getAccessToken,
  setAccessToken,

  me: () => apiFetch('/auth/me'),

  getProjects: () => apiFetch('/projects'),
  getProject: (id) => apiFetch(`/projects/${id}`),
  createProject: (data) => apiFetch('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id, data) => apiFetch(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id) => apiFetch(`/projects/${id}`, { method: 'DELETE' }),

  addItem: (pid, item) => apiFetch(`/projects/${pid}/items`, { method: 'POST', body: JSON.stringify(item) }),
  updateItem: (pid, iid, data) =>
    apiFetch(`/projects/${pid}/items/${iid}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteItem: (pid, iid) => apiFetch(`/projects/${pid}/items/${iid}`, { method: 'DELETE' }),
  clearItems: (pid) => apiFetch(`/projects/${pid}/items`, { method: 'DELETE' }),

  addPlan: (pid, plan) => apiFetch(`/projects/${pid}/plans`, { method: 'POST', body: JSON.stringify(plan) }),
  deletePlan: (pid, plid) => apiFetch(`/projects/${pid}/plans/${plid}`, { method: 'DELETE' }),

  listUsers: () => apiFetch('/users'),
  getUser: (id) => apiFetch(`/users/${id}`),
  createUser: (data) => apiFetch('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => apiFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) => apiFetch(`/users/${id}`, { method: 'DELETE' }),
};
