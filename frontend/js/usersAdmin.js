/* ── CRUD usuarios (ADMIN) — Módulo 0 ── */

let _usersCache = [];

async function loadUsersTable() {
  const body = document.getElementById('users-table-body');
  if (!body) return;
  body.innerHTML =
    '<div class="mono" style="padding:20px;text-align:center;color:var(--muted);font-size:12px">Cargando…</div>';
  try {
    _usersCache = await API.listUsers();
    renderUsersTable();
  } catch (e) {
    body.innerHTML = `<div style="padding:16px;color:var(--red);font-size:12px">${escapeHtml(e.message)}</div>`;
  }
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function renderUsersTable() {
  const body = document.getElementById('users-table-body');
  if (!body) return;
  if (!_usersCache.length) {
    body.innerHTML =
      '<div class="mono" style="padding:20px;text-align:center;color:var(--muted);font-size:12px">No hay usuarios</div>';
    return;
  }
  body.innerHTML = '';
  _usersCache.forEach((u) => {
    const row = document.createElement('div');
    row.style.cssText =
      'display:grid;grid-template-columns:1fr 1fr 140px 1fr;gap:8px;padding:10px 14px;border-bottom:1px solid var(--border-dim);align-items:center;font-size:12px';
    const fecha = u.createdAt
      ? new Date(u.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : '—';
    const roleColor =
      u.role === 'ADMIN' ? 'var(--cyan)' : u.role === 'COMERCIAL' ? 'var(--amber)' : 'var(--muted)';
    row.innerHTML = `
      <span class="mono" style="color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(u.email)}">${escapeHtml(u.email)}</span>
      <span class="mono" style="color:${roleColor};font-weight:700;font-size:11px">${escapeHtml(u.role)}</span>
      <span class="mono" style="color:var(--muted);font-size:11px">${fecha}</span>
      <div style="display:flex;justify-content:flex-end;gap:6px">
        <button type="button" class="bg1" style="padding:4px 10px;font-size:11px" data-id="${u.id}" data-act="edit">Editar</button>
        <button type="button" class="bred" style="padding:4px 10px;font-size:11px" data-id="${u.id}" data-act="del">Eliminar</button>
      </div>`;
    row.querySelector('[data-act="edit"]').onclick = () => openUserModal(u);
    row.querySelector('[data-act="del"]').onclick = () => confirmDeleteUser(u);
    body.appendChild(row);
  });
}

function openUserModal(user) {
  const isNew = !user;
  document.getElementById('modal-title').textContent = isNew ? 'NUEVO USUARIO' : 'EDITAR USUARIO';
  const idField = user ? `<input type="hidden" id="uu-id" value="${user.id}">` : '';
  document.getElementById('modal-body').innerHTML = `
    ${idField}
    <div style="display:flex;flex-direction:column;gap:12px">
      <div><label class="lm">EMAIL</label>
        <input type="text" id="uu-email" class="vi" style="text-align:left;padding:8px" placeholder="correo@dominio.com o usuario corto" value="${user ? escapeHtml(user.email) : ''}">
      </div>
      <div><label class="lm">ROL</label>
        <select id="uu-role" class="vi" style="text-align:left;padding-right:24px">
          <option value="ADMIN" ${user && user.role === 'ADMIN' ? 'selected' : ''}>ADMIN</option>
          <option value="COMERCIAL" ${user && user.role === 'COMERCIAL' ? 'selected' : ''}>COMERCIAL</option>
          <option value="VIEWER" ${user && user.role === 'VIEWER' ? 'selected' : ''}>VIEWER</option>
        </select>
      </div>
      <div><label class="lm">${isNew ? 'CONTRASEÑA *' : 'NUEVA CONTRASEÑA (opcional)'}</label>
        <input type="password" id="uu-pass" class="vi" style="text-align:left;padding:8px" placeholder="${isNew ? 'Mínimo 1 carácter' : 'Dejar vacío para no cambiar'}" ${isNew ? 'required' : ''}>
      </div>
      <div style="display:flex;gap:8px;margin-top:6px">
        <button type="button" class="bg1" style="flex:1;padding:10px" onclick="closeModal()">CANCELAR</button>
        <button type="button" class="b1" style="flex:1;padding:10px" onclick="submitUserForm(${isNew})">GUARDAR</button>
      </div>
    </div>`;
  openModal();
  setTimeout(() => document.getElementById('uu-email')?.focus(), 80);
}

async function submitUserForm(isNew) {
  const email = document.getElementById('uu-email')?.value.trim();
  const role = document.getElementById('uu-role')?.value;
  const pass = document.getElementById('uu-pass')?.value;
  if (!email) {
    toast('Email obligatorio', 'red');
    return;
  }
  if (isNew && (!pass || pass.length < 1)) {
    toast('Contraseña obligatoria', 'red');
    return;
  }
  try {
    loadingStart();
    if (isNew) {
      await API.createUser({ email, password: pass, role });
      toast('Usuario creado', 'cyan');
    } else {
      const id = document.getElementById('uu-id').value;
      const payload = { email, role };
      if (pass && pass.length > 0) payload.password = pass;
      await API.updateUser(id, payload);
      toast('Usuario actualizado', 'cyan');
    }
    closeModal();
    await loadUsersTable();
  } catch (e) {
    toast(e.message || 'Error', 'red');
  } finally {
    loadingDone();
  }
}

async function confirmDeleteUser(u) {
  if (!confirm(`¿Eliminar a ${u.email}?`)) return;
  try {
    loadingStart();
    await API.deleteUser(u.id);
    toast('Usuario eliminado', 'amber');
    await loadUsersTable();
  } catch (e) {
    toast(e.message || 'Error', 'red');
  } finally {
    loadingDone();
  }
}

window.openUserModal = openUserModal;
window.submitUserForm = submitUserForm;
window.loadUsersTable = loadUsersTable;
