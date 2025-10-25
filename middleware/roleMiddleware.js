const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    // Verificar que el usuario tenga un rol
    if (!req.user || !req.user.role_id) {
      return res.status(401).json({ 
        message: 'Usuario no autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Verificar si el rol del usuario está en los permitidos
    if (!allowedRoles.includes(req.user.role_id)) {
      return res.status(403).json({ 
        message: 'No tienes permisos para acceder a este recurso',
        code: 'INSUFFICIENT_PERMISSIONS',
        userRole: req.user.role_id,
        allowedRoles: allowedRoles
      });
    }

    next();
  };
};

const checkRoleAndOwnership = (getOwnerId) => {
  return async (req, res, next) => {
    try {
      // Primero verificar autenticación
      if (!req.user) {
        return res.status(401).json({ message: 'No autenticado' });
      }

      // Obtener ID del propietario del recurso
      const ownerId = await getOwnerId(req);

      // Verificar si es propietario o admin
      if (req.user.user_id !== ownerId && req.user.role_id !== 1) {
        return res.status(403).json({ 
          message: 'No tienes permiso para acceder a este recurso'
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ message: 'Error al verificar permisos' });
    }
  };
};

module.exports = { checkRole, checkRoleAndOwnership };