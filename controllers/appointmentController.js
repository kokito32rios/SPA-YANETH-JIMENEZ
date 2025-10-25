const pool = require('../config/db');

// CREAR CITA
const createAppointment = async (req, res) => {
  try {
    const clientId = req.user.user_id;
    const { manicurist_id, service_id, start_time } = req.body;

    if (!manicurist_id || !service_id || !start_time) {
      return res.status(400).json({ message: 'Faltan campos requeridos' });
    }

    const connection = await pool.getConnection();

    const [services] = await connection.query(
      'SELECT duration_min, price, manicurist_commission_rate FROM services WHERE service_id = ?',
      [service_id]
    );

    if (services.length === 0) {
      await connection.release();
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }

    const durationMin = services[0].duration_min;
    const servicePrice = services[0].price;

    const startDate = new Date(start_time);
    const endDate = new Date(startDate.getTime() + durationMin * 60000);

    // Verificar disponibilidad
    const [conflicts] = await connection.query(
      `SELECT appointment_id FROM appointments 
       WHERE manicurist_id = ? AND status != 'Cancelada'
       AND ((start_time < ? AND end_time > ?) OR
            (start_time < ? AND end_time > ?) OR
            (start_time >= ? AND end_time <= ?))`,
      [manicurist_id, endDate, startDate, endDate, startDate, startDate, endDate]
    );

    if (conflicts.length > 0) {
      await connection.release();
      return res.status(400).json({ message: 'La manicurista no está disponible en esa fecha y hora' });
    }

    // Crear la cita
    const [result] = await connection.query(
      `INSERT INTO appointments (client_id, manicurist_id, service_id, start_time, end_time, status) 
       VALUES (?, ?, ?, ?, ?, 'Agendada')`,
      [clientId, manicurist_id, service_id, startDate, endDate]
    );

    const appointmentId = result.insertId;

    // Crear comisión automáticamente
    const commissionRate = services[0].manicurist_commission_rate / 100;
    const commissionAmount = servicePrice * commissionRate;

    await connection.query(
      `INSERT INTO commissions (appointment_id, manicurist_id, service_price, commission_amount) 
       VALUES (?, ?, ?, ?)`,
      [appointmentId, manicurist_id, servicePrice, commissionAmount]
    );

    await connection.release();

    res.status(201).json({ 
      message: 'Cita agendada exitosamente',
      appointment_id: appointmentId
    });
  } catch (error) {
    console.error('Error al crear cita:', error);
    res.status(500).json({ message: 'Error al agendar cita' });
  }
};

// ⭐ NUEVO: CREAR CITA DESDE ADMIN
const createAppointmentAdmin = async (req, res) => {
  try {
    const { client_id, manicurist_id, service_id, start_time } = req.body;

    if (!client_id || !manicurist_id || !service_id || !start_time) {
      return res.status(400).json({ message: 'Faltan campos requeridos' });
    }

    const connection = await pool.getConnection();

    const [services] = await connection.query(
      'SELECT duration_min, price, manicurist_commission_rate FROM services WHERE service_id = ?',
      [service_id]
    );

    if (services.length === 0) {
      await connection.release();
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }

    const durationMin = services[0].duration_min;
    const servicePrice = services[0].price;

    const startDate = new Date(start_time);
    const endDate = new Date(startDate.getTime() + durationMin * 60000);

    // Verificar disponibilidad
    const [conflicts] = await connection.query(
      `SELECT appointment_id FROM appointments 
       WHERE manicurist_id = ? AND status != 'Cancelada'
       AND ((start_time < ? AND end_time > ?) OR
            (start_time < ? AND end_time > ?) OR
            (start_time >= ? AND end_time <= ?))`,
      [manicurist_id, endDate, startDate, endDate, startDate, startDate, endDate]
    );

    if (conflicts.length > 0) {
      await connection.release();
      return res.status(400).json({ message: 'La manicurista no está disponible en esa fecha y hora' });
    }

    // Crear la cita
    const [result] = await connection.query(
      `INSERT INTO appointments (client_id, manicurist_id, service_id, start_time, end_time, status) 
       VALUES (?, ?, ?, ?, ?, 'Agendada')`,
      [client_id, manicurist_id, service_id, startDate, endDate]
    );

    const appointmentId = result.insertId;

    // Crear comisión automáticamente
    const commissionRate = services[0].manicurist_commission_rate / 100;
    const commissionAmount = servicePrice * commissionRate;

    await connection.query(
      `INSERT INTO commissions (appointment_id, manicurist_id, service_price, commission_amount) 
       VALUES (?, ?, ?, ?)`,
      [appointmentId, manicurist_id, servicePrice, commissionAmount]
    );

    await connection.release();

    res.status(201).json({ 
      message: 'Cita creada exitosamente',
      appointment_id: appointmentId
    });
  } catch (error) {
    console.error('Error al crear cita:', error);
    res.status(500).json({ message: 'Error al agendar cita' });
  }
};

// OBTENER CITAS DEL CLIENTE
const getClientAppointments = async (req, res) => {
  try {
    const clientId = req.user.user_id;
    const connection = await pool.getConnection();

    const [appointments] = await connection.query(
      `SELECT a.appointment_id, a.start_time, a.end_time, a.status, a.client_comments,
              s.name as service_name, s.price,
              u.first_name, u.last_name
       FROM appointments a
       JOIN services s ON a.service_id = s.service_id
       JOIN users u ON a.manicurist_id = u.user_id
       WHERE a.client_id = ?
       ORDER BY a.start_time DESC`,
      [clientId]
    );

    await connection.release();
    res.json(appointments);
  } catch (error) {
    console.error('Error al obtener citas:', error);
    res.status(500).json({ message: 'Error al obtener citas' });
  }
};

// OBTENER CITAS DE LA MANICURISTA
const getManicuristAppointments = async (req, res) => {
  try {
    const manicuristId = req.user.user_id;
    const connection = await pool.getConnection();

    const [appointments] = await connection.query(
      `SELECT a.appointment_id, a.start_time, a.end_time, a.status, a.client_comments,
              s.name as service_name, s.price,
              u.first_name, u.last_name, u.phone_number,
              c.commission_amount, c.is_paid
       FROM appointments a
       JOIN services s ON a.service_id = s.service_id
       JOIN users u ON a.client_id = u.user_id
       LEFT JOIN commissions c ON a.appointment_id = c.appointment_id
       WHERE a.manicurist_id = ?
       ORDER BY a.start_time DESC`,
      [manicuristId]
    );

    await connection.release();
    res.json(appointments);
  } catch (error) {
    console.error('Error al obtener citas:', error);
    res.status(500).json({ message: 'Error al obtener citas' });
  }
};

// OBTENER TODAS LAS CITAS (Solo Administrador)
const getAllAppointments = async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [appointments] = await connection.query(
      `SELECT a.appointment_id, a.start_time, a.end_time, a.status,
              s.name as service_name, s.price,
              c.first_name as client_name, c.last_name as client_lastname,
              m.first_name as manicurist_name, m.last_name as manicurist_lastname
       FROM appointments a
       JOIN services s ON a.service_id = s.service_id
       JOIN users c ON a.client_id = c.user_id
       JOIN users m ON a.manicurist_id = m.user_id
       ORDER BY a.start_time DESC`
    );

    await connection.release();
    res.json(appointments);
  } catch (error) {
    console.error('Error al obtener citas:', error);
    res.status(500).json({ message: 'Error al obtener citas' });
  }
};

// CANCELAR CITA
const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    const connection = await pool.getConnection();

    const [appointments] = await connection.query(
      'SELECT client_id, manicurist_id FROM appointments WHERE appointment_id = ?',
      [id]
    );

    if (appointments.length === 0) {
      await connection.release();
      return res.status(404).json({ message: 'Cita no encontrada' });
    }

    const { client_id, manicurist_id } = appointments[0];

    if (userId !== client_id && userId !== manicurist_id && req.user.role_id !== 1) {
      await connection.release();
      return res.status(403).json({ message: 'No tienes permiso para cancelar esta cita' });
    }

    await connection.query(
      'UPDATE appointments SET status = ? WHERE appointment_id = ?',
      ['Cancelada', id]
    );

    await connection.release();
    res.json({ message: 'Cita cancelada exitosamente' });
  } catch (error) {
    console.error('Error al cancelar cita:', error);
    res.status(500).json({ message: 'Error al cancelar cita' });
  }
};

// ACTUALIZAR ESTADO DE CITA (Manicurista)
const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const manicuristId = req.user.user_id;

    const validStatuses = ['Agendada', 'Completada', 'Cancelada'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Estado inválido' });
    }

    const connection = await pool.getConnection();

    const [appointments] = await connection.query(
      'SELECT manicurist_id FROM appointments WHERE appointment_id = ?',
      [id]
    );

    if (appointments.length === 0) {
      await connection.release();
      return res.status(404).json({ message: 'Cita no encontrada' });
    }

    if (appointments[0].manicurist_id !== manicuristId && req.user.role_id !== 1) {
      await connection.release();
      return res.status(403).json({ message: 'No tienes permiso para actualizar esta cita' });
    }

    await connection.query(
      'UPDATE appointments SET status = ? WHERE appointment_id = ?',
      [status, id]
    );

    await connection.release();
    res.json({ message: 'Estado de cita actualizado' });
  } catch (error) {
    console.error('Error al actualizar cita:', error);
    res.status(500).json({ message: 'Error al actualizar cita' });
  }
};

// ⭐ NUEVO: ELIMINAR CITA (Solo Admin)
const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();

    // Eliminar comisión primero (FK constraint)
    await connection.query('DELETE FROM commissions WHERE appointment_id = ?', [id]);
    
    // Eliminar cita
    await connection.query('DELETE FROM appointments WHERE appointment_id = ?', [id]);
    
    await connection.release();
    res.json({ message: 'Cita eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar cita:', error);
    res.status(500).json({ message: 'Error al eliminar cita' });
  }
};

module.exports = {
  createAppointment,
  createAppointmentAdmin,
  getClientAppointments,
  getManicuristAppointments,
  getAllAppointments,
  cancelAppointment,
  updateAppointmentStatus,
  deleteAppointment
};
