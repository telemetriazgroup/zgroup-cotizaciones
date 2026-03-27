/* ── ZGROUP API Client ── */
const API_BASE = 'http://localhost:3001/api';

async function apiFetch(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

/* ── Projects ── */
const API = {
  getProjects:   ()         => apiFetch('/projects'),
  getProject:    (id)       => apiFetch(`/projects/${id}`),
  createProject: (data)     => apiFetch('/projects', { method:'POST', body: JSON.stringify(data) }),
  updateProject: (id, data) => apiFetch(`/projects/${id}`, { method:'PUT',  body: JSON.stringify(data) }),
  deleteProject: (id)       => apiFetch(`/projects/${id}`, { method:'DELETE' }),

  /* Items */
  addItem:    (pid, item) => apiFetch(`/projects/${pid}/items`, { method:'POST',   body: JSON.stringify(item) }),
  updateItem: (pid, iid, data) => apiFetch(`/projects/${pid}/items/${iid}`, { method:'PUT', body: JSON.stringify(data) }),
  deleteItem: (pid, iid) => apiFetch(`/projects/${pid}/items/${iid}`, { method:'DELETE' }),
  clearItems: (pid)      => apiFetch(`/projects/${pid}/items`,        { method:'DELETE' }),

  /* Plans */
  addPlan:    (pid, plan) => apiFetch(`/projects/${pid}/plans`,        { method:'POST',   body: JSON.stringify(plan) }),
  deletePlan: (pid, plid) => apiFetch(`/projects/${pid}/plans/${plid}`,{ method:'DELETE' }),
};
