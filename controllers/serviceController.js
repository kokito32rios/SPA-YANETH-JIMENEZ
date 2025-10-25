const pool = require('../config/db');

// OBTENER TODOS LOS SERVICIOS
const getServices = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [services] = await connection.query(
      `SELECT service_id, name, description, price, duration_min, manicurist_commission_rate FROM Services`
    );
    await connection.release();

    res.json(services);
  } catch (error) {
    console.error('Error al obtener servicios:', error);
    res.status(500).json({ message: 'Error al obtener servicios' });
  }
};

// CREAR SERVICIO (Solo Administrador)
const createService = async (req, res) => {
  try {
    const { name, description, price, duration_min, manicurist_commission_rate } = req.body;

    if (!name || !price || !duration_min || manicurist_commission_rate === undefined) {
      return res.status(400).json({ message: 'Todos los campos requeridos deben ser completados' });
    }

    const connection = await pool.getConnection();
    await connection.query(
      `INSERT INTO Services (name, description, price, duration_min, manicurist_commission_rate) 
       VALUES (?, ?, ?, ?, ?)`,
      [name, description || null, price, duration_min, manicurist_commission_rate]
    );
    await connection.release();

    res.status(201).json({ message: 'Servicio creado exitosamente' });
  } catch (error) {
    console.error('Error al crear servicio:', error);
    res.status(500).json({ message: 'Error al crear servicio' });
  }
};

// ACTUALIZAR SERVICIO (Solo Administrador)
const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, duration_min, manicurist_commission_rate } = req.body;

    const connection = await pool.getConnection();
    await connection.query(
      `UPDATE Services 
       SET name = ?, description = ?, price = ?, duration_min = ?, manicurist_commission_rate = ? 
       WHERE service_id = ?`,
      [name, description || null, price, duration_min, manicurist_commission_rate, id]
    );
    await connection.release();

    res.json({ message: 'Servicio actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar servicio:', error);
    res.status(500).json({ message: 'Error al actualizar servicio' });
  }
};

// ⭐ NUEVO: ELIMINAR SERVICIO (Solo Admin)
const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();

    // Verificar si hay citas con este servicio
    const [appointments] = await connection.query(
      'SELECT COUNT(*) as count FROM Appointments WHERE service_id = ?',
      [id]
    );

    if (appointments[0].count > 0) {
      await connection.release();
      return res.status(400).json({ 
        message: 'No se puede eliminar. Hay citas con este servicio.' 
      });
    }

    await connection.query('DELETE FROM Services WHERE service_id = ?', [id]);
    await connection.release();

    res.json({ message: 'Servicio eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar servicio:', error);
    res.status(500).json({ message: 'Error al eliminar servicio' });
  }
};

module.exports = { 
  getServices,
  createService,
  updateService,
  deleteService
};