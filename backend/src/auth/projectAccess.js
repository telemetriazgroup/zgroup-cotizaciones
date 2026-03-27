/**
 * Permisos según MODULES.md — Módulo 0 (roles).
 * ADMIN: todo. COMERCIAL: propios. VIEWER: solo lectura de propios.
 */

function isAdmin(user) {
  return user && user.role === 'ADMIN';
}

function canViewAllProjects(user) {
  return isAdmin(user);
}

/** Ver listado / detalle: ADMIN ve todo; resto solo proyectos con owner = user.id */
function canViewProject(user, projectRow) {
  if (!user || !projectRow) return false;
  if (isAdmin(user)) return true;
  if (!projectRow.owner_user_id) return false;
  return String(projectRow.owner_user_id) === String(user.sub);
}

function canCreateProject(user) {
  return user && (user.role === 'ADMIN' || user.role === 'COMERCIAL');
}

function canEditProject(user, projectRow) {
  if (!user || !projectRow) return false;
  if (user.role === 'ADMIN') return true;
  if (user.role === 'VIEWER') return false;
  if (user.role === 'COMERCIAL') {
    return projectRow.owner_user_id && String(projectRow.owner_user_id) === String(user.sub);
  }
  return false;
}

/** Eliminar: ADMIN cualquiera; COMERCIAL solo propios; VIEWER no */
function canDeleteProject(user, projectRow) {
  if (!user || !projectRow) return false;
  if (user.role === 'ADMIN') return true;
  if (user.role === 'VIEWER') return false;
  if (user.role === 'COMERCIAL') {
    return projectRow.owner_user_id && String(projectRow.owner_user_id) === String(user.sub);
  }
  return false;
}

module.exports = {
  canViewAllProjects,
  canViewProject,
  canCreateProject,
  canEditProject,
  canDeleteProject,
};
