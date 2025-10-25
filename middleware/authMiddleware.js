const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
  try {
    // Obtener token del header
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
      return res.status(401).json({ 
        message: 'Token no proporcionado',
        code: 'NO_TOKEN'
      });
    }

    // Extraer token (formato: Bearer <token>)
    const token = authHeader.replace('Bearer ', '');

    // Verificar y decodificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Añadir datos del usuario al request
    req.user = decoded;
    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expirado',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Token inválido',
        code: 'INVALID_TOKEN'
      });
    }

    return res.status(401).json({ 
      message: 'Error al verificar token',
      code: 'AUTH_ERROR'
    });
  }
};

module.exports = { verifyToken };
