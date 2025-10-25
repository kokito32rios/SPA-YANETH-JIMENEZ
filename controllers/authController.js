const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// REGISTRO DE USUARIO
const register = async (req, res) => {
  try {
    const { first_name, last_name, email, password, phone_number } = req.body;

    // Validar datos
    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ 
        message: 'Todos los campos son obligatorios' 
      });
    }

    // Validar formato email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: 'Email inválido' 
      });
    }

    const connection = await pool.getConnection();

    // Verificar si el email ya existe
    const [existingUser] = await connection.query(
      'SELECT email FROM Users WHERE email = ?',
      [email]
    );

    if (existingUser.length > 0) {
      await connection.release();
      return res.status(400).json({ 
        message: 'El email ya está registrado' 
      });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar usuario (role_id = 3 para cliente por defecto)
    await connection.query(
      'INSERT INTO Users (role_id, first_name, last_name, email, password_hash, phone_number) VALUES (?, ?, ?, ?, ?, ?)',
      [3, first_name, last_name, email, hashedPassword, phone_number || null]
    );

    await connection.release();

    res.status(201).json({ 
      message: 'Usuario registrado exitosamente' 
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ 
      message: 'Error al registrar usuario' 
    });
  }
};

// LOGIN DE USUARIO
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar datos
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email y contraseña son obligatorios' 
      });
    }

    const connection = await pool.getConnection();

    // Buscar usuario por email
    const [users] = await connection.query(
      'SELECT user_id, role_id, first_name, last_name, email, password_hash FROM Users WHERE email = ?',
      [email]
    );

    await connection.release();

    if (users.length === 0) {
      return res.status(401).json({ 
        message: 'Email o contraseña incorrectos' 
      });
    }

    const user = users[0];

    // Verificar contraseña
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ 
        message: 'Email o contraseña incorrectos' 
      });
    }

    // Crear token JWT
    const token = jwt.sign(
      {
        user_id: user.user_id,
        role_id: user.role_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login exitoso',
      token: token,
      user: {
        user_id: user.user_id,
        role_id: user.role_id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ 
      message: 'Error al iniciar sesión' 
    });
  }
};

module.exports = { register, login };