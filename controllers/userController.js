const pool = require('../config/db');

// OBTENER PERFIL DEL USUARIO
const getProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const connection = await pool.getConnection();
    const [users] = await connection.query(
      `SELECT user_id, role_id, first_name, last_name, email, phone_number, created_at 
       FROM users WHERE user_id = ?`,
      [userId]
    );
    await connection.release();

    if (users.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json(users[0]);
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ message: 'Error al obtener perfil' });
  }
};

// ACTUALIZAR PERFIL DEL USUARIO
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { first_name, last_name, phone_number } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({ message: 'Nombre y apellido son obligatorios' });
    }

    const connection = await pool.getConnection();
    await connection.query(
      `UPDATE users SET first_name = ?, last_name = ?, phone_number = ? WHERE user_id = ?`,
      [first_name, last_name, phone_number || null, userId]
    );
    await connection.release();

    res.json({ message: 'Perfil actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ message: 'Error al actualizar perfil' });
  }
};

// OBTENER TODOS LOS USUARIOS (Solo Administrador)
const getAllusers = async (req, res) => {
  try {
    const { role_id } = req.query;
    const connection = await pool.getConnection();

    let query = `SELECT user_id, role_id, first_name, last_name, email, phone_number, created_at FROM users`;
    let params = [];

    if (role_id) {
      query += ` WHERE role_id = ?`;
      params.push(role_id);
    }

    const [users] = await connection.query(query, params);
    await connection.release();

    res.json(users);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
};

// ⭐ NUEVO: ACTUALIZAR USUARIO (Solo Admin)
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, phone_number, role_id } = req.body;

    if (!first_name || !last_name || !role_id) {
      return res.status(400).json({ message: 'Datos incompletos' });
    }

    const connection = await pool.getConnection();
    await connection.query(
      `UPDATE users SET first_name = ?, last_name = ?, phone_number = ?, role_id = ? WHERE user_id = ?`,
      [first_name, last_name, phone_number || null, role_id, id]
    );
    await connection.release();

    res.json({ message: 'Usuario actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ message: 'Error al actualizar usuario' });
  }
};

// ⭐ NUEVO: ELIMINAR USUARIO (Solo Admin)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // No permitir eliminar al propio usuario
    if (parseInt(id) === req.user.user_id) {
      return res.status(400).json({ message: 'No puedes eliminarte a ti mismo' });
    }

    const connection = await pool.getConnection();

    // Verificar si el usuario tiene citas
    const [appointments] = await connection.query(
      'SELECT COUNT(*) as count FROM appointments WHERE client_id = ? OR manicurist_id = ?',
      [id, id]
    );

    if (appointments[0].count > 0) {
      await connection.release();
      return res.status(400).json({ 
        message: 'No se puede eliminar. El usuario tiene citas asociadas.' 
      });
    }

    await connection.query('DELETE FROM users WHERE user_id = ?', [id]);
    await connection.release();

    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ message: 'Error al eliminar usuario' });
  }
};

// OBTENER MANICURISTAS DISPONIBLES
const getAvailableManicurists = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [manicurists] = await connection.query(
      `SELECT user_id, first_name, last_name, phone_number FROM users WHERE role_id = 2`
    );
    await connection.release();

    res.json(manicurists);
  } catch (error) {
    console.error('Error al obtener manicuristas:', error);
    res.status(500).json({ message: 'Error al obtener manicuristas' });
  }
};

module.exports = { 
  getProfile, 
  updateProfile, 
  getAllusers,
  updateUser,
  deleteUser,
  getAvailableManicurists
};

