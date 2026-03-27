/** Solo rol ADMIN (Módulo 0 — gestión de usuarios / catálogo). */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Solo administradores' });
  }
  next();
}

module.exports = requireAdmin;
