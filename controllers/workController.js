const pool = require('../config/db');

// REGISTRAR TRABAJO WALK-IN (Manicurista)
const createWork = async (req, res) => {
  try {
    const manicuristId = req.user.user_id;
    const { service_id, work_date, client_name, service_price_custom } = req.body;

    // Validaciones
    if (!service_id || !work_date) {
      return res.status(400).json({ message: 'Servicio y fecha son obligatorios' });
    }

    const connection = await pool.getConnection();

    // Obtener información del servicio
    const [services] = await connection.query(
      'SELECT duration_min, price, manicurist_commission_rate FROM services WHERE service_id = ?',
      [service_id]
    );

    if (services.length === 0) {
      await connection.release();
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }

    const durationMin = services[0].duration_min;
    const defaultPrice = services[0].price;
    const commissionRate = services[0].manicurist_commission_rate / 100;

    // Usar precio personalizado si se proporciona, sino el precio por defecto
    const finalPrice = service_price_custom || defaultPrice;
    const commissionAmount = finalPrice * commissionRate;

    const startDate = new Date(work_date);
    const endDate = new Date(startDate.getTime() + durationMin * 60000);

    // Insertar trabajo walk-in (sin client_id)
    const [result] = await connection.query(
      `INSERT INTO Appointments 
       (client_id, is_walkin, client_name_walkin, manicurist_id, service_id, start_time, end_time, status) 
       VALUES (NULL, TRUE, ?, ?, ?, ?, ?, 'Completada')`,
      [client_name || 'Cliente Walk-in', manicuristId, service_id, startDate, endDate]
    );

    const workId = result.insertId;

    // Crear comisión automáticamente
    await connection.query(
      `INSERT INTO Commissions 
       (appointment_id, manicurist_id, service_price, commission_amount, is_paid) 
       VALUES (?, ?, ?, ?, FALSE)`,
      [workId, manicuristId, finalPrice, commissionAmount]
    );

    await connection.release();

    res.status(201).json({ 
      message: 'Trabajo registrado exitosamente',
      work_id: workId,
      commission_amount: commissionAmount
    });
  } catch (error) {
    console.error('Error al registrar trabajo:', error);
    res.status(500).json({ message: 'Error al registrar trabajo' });
  }
};

// OBTENER TRABAJOS DE LA MANICURISTA
const getMyWorks = async (req, res) => {
  try {
    const manicuristId = req.user.user_id;
    const { start_date, end_date } = req.query;

    const connection = await pool.getConnection();

    let query = `
      SELECT 
        a.appointment_id as work_id,
        a.start_time as work_date,
        a.client_name_walkin as client_name,
        s.name as service_name,
        s.price as default_price,
        c.service_price as paid_price,
        c.commission_amount,
        c.is_paid,
        c.payment_date
      FROM Appointments a
      JOIN services s ON a.service_id = s.service_id
      LEFT JOIN Commissions c ON a.appointment_id = c.appointment_id
      WHERE a.manicurist_id = ? AND a.is_walkin = TRUE
    `;

    const params = [manicuristId];

    // Filtros por fecha
    if (start_date) {
      query += ` AND DATE(a.start_time) >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(a.start_time) <= ?`;
      params.push(end_date);
    }

    query += ` ORDER BY a.start_time DESC`;

    const [works] = await connection.query(query, params);
    await connection.release();

    // Calcular totales
    const totalPaid = works.reduce((sum, w) => sum + (parseFloat(w.paid_price) || 0), 0);
    const totalCommission = works.reduce((sum, w) => sum + (parseFloat(w.commission_amount) || 0), 0);
    const totalPaidCommission = works
      .filter(w => w.is_paid)
      .reduce((sum, w) => sum + (parseFloat(w.commission_amount) || 0), 0);
    const totalPendingCommission = works
      .filter(w => !w.is_paid)
      .reduce((sum, w) => sum + (parseFloat(w.commission_amount) || 0), 0);

    res.json({
      works: works,
      summary: {
        total_works: works.length,
        total_paid: totalPaid,
        total_commission: totalCommission,
        total_paid_commission: totalPaidCommission,
        total_pending_commission: totalPendingCommission
      }
    });
  } catch (error) {
    console.error('Error al obtener trabajos:', error);
    res.status(500).json({ message: 'Error al obtener trabajos' });
  }
};

// ACTUALIZAR TRABAJO
const updateWork = async (req, res) => {
  try {
    const { id } = req.params;
    const manicuristId = req.user.user_id;
    const { service_price_custom } = req.body;

    const connection = await pool.getConnection();

    // Verificar que el trabajo pertenece a la manicurista
    const [works] = await connection.query(
      'SELECT manicurist_id, service_id FROM Appointments WHERE appointment_id = ? AND is_walkin = TRUE',
      [id]
    );

    if (works.length === 0) {
      await connection.release();
      return res.status(404).json({ message: 'Trabajo no encontrado' });
    }

    if (works[0].manicurist_id !== manicuristId) {
      await connection.release();
      return res.status(403).json({ message: 'No tienes permiso para editar este trabajo' });
    }

    // Obtener tasa de comisión del servicio
    const [services] = await connection.query(
      'SELECT manicurist_commission_rate FROM services WHERE service_id = ?',
      [works[0].service_id]
    );

    const commissionRate = services[0].manicurist_commission_rate / 100;
    const newCommissionAmount = service_price_custom * commissionRate;

    // Actualizar comisión
    await connection.query(
      `UPDATE Commissions 
       SET service_price = ?, commission_amount = ? 
       WHERE appointment_id = ?`,
      [service_price_custom, newCommissionAmount, id]
    );

    await connection.release();

    res.json({ 
      message: 'Trabajo actualizado exitosamente',
      new_commission: newCommissionAmount
    });
  } catch (error) {
    console.error('Error al actualizar trabajo:', error);
    res.status(500).json({ message: 'Error al actualizar trabajo' });
  }
};

// ELIMINAR TRABAJO
const deleteWork = async (req, res) => {
  try {
    const { id } = req.params;
    const manicuristId = req.user.user_id;

    const connection = await pool.getConnection();

    // Verificar que el trabajo pertenece a la manicurista
    const [works] = await connection.query(
      'SELECT manicurist_id FROM Appointments WHERE appointment_id = ? AND is_walkin = TRUE',
      [id]
    );

    if (works.length === 0) {
      await connection.release();
      return res.status(404).json({ message: 'Trabajo no encontrado' });
    }

    if (works[0].manicurist_id !== manicuristId) {
      await connection.release();
      return res.status(403).json({ message: 'No tienes permiso para eliminar este trabajo' });
    }

    // Eliminar comisión primero
    await connection.query('DELETE FROM Commissions WHERE appointment_id = ?', [id]);
    
    // Eliminar trabajo
    await connection.query('DELETE FROM Appointments WHERE appointment_id = ?', [id]);
    
    await connection.release();

    res.json({ message: 'Trabajo eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar trabajo:', error);
    res.status(500).json({ message: 'Error al eliminar trabajo' });
  }
};

// REGISTRAR TRABAJO COMO ADMIN (para cualquier manicurista)
const createWorkAdmin = async (req, res) => {
  try {
    const { manicurist_id, service_id, work_date, client_name, service_price_custom } = req.body;

    // Validaciones
    if (!manicurist_id || !service_id || !work_date) {
      return res.status(400).json({ message: 'Manicurista, servicio y fecha son obligatorios' });
    }

    const connection = await pool.getConnection();

    // Verificar que el usuario es manicurista
    const [manicurists] = await connection.query(
      'SELECT user_id FROM users WHERE user_id = ? AND role_id = 2',
      [manicurist_id]
    );

    if (manicurists.length === 0) {
      await connection.release();
      return res.status(400).json({ message: 'Usuario no es manicurista o no existe' });
    }

    // Obtener información del servicio
    const [services] = await connection.query(
      'SELECT duration_min, price, manicurist_commission_rate FROM services WHERE service_id = ?',
      [service_id]
    );

    if (services.length === 0) {
      await connection.release();
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }

    const durationMin = services[0].duration_min;
    const defaultPrice = services[0].price;
    const commissionRate = services[0].manicurist_commission_rate / 100;

    const finalPrice = service_price_custom || defaultPrice;
    const commissionAmount = finalPrice * commissionRate;

    const startDate = new Date(work_date);
    const endDate = new Date(startDate.getTime() + durationMin * 60000);

    // Insertar trabajo walk-in
    const [result] = await connection.query(
      `INSERT INTO Appointments 
       (client_id, is_walkin, client_name_walkin, manicurist_id, service_id, start_time, end_time, status) 
       VALUES (NULL, TRUE, ?, ?, ?, ?, ?, 'Completada')`,
      [client_name || 'Cliente Walk-in', manicurist_id, service_id, startDate, endDate]
    );

    const workId = result.insertId;

    // Crear comisión automáticamente
    await connection.query(
      `INSERT INTO Commissions 
       (appointment_id, manicurist_id, service_price, commission_amount, is_paid) 
       VALUES (?, ?, ?, ?, FALSE)`,
      [workId, manicurist_id, finalPrice, commissionAmount]
    );

    await connection.release();

    res.status(201).json({ 
      message: 'Trabajo registrado exitosamente',
      work_id: workId,
      commission_amount: commissionAmount
    });
  } catch (error) {
    console.error('Error al registrar trabajo:', error);
    res.status(500).json({ message: 'Error al registrar trabajo' });
  }
};

// OBTENER TODOS LOS TRABAJOS (Admin)
const getAllWorks = async (req, res) => {
  try {
    const { manicurist_id, start_date, end_date } = req.query;

    const connection = await pool.getConnection();

    let query = `
      SELECT 
        a.appointment_id as work_id,
        a.start_time as work_date,
        a.client_name_walkin as client_name,
        a.manicurist_id,
        u.first_name as manicurist_first_name,
        u.last_name as manicurist_last_name,
        s.name as service_name,
        s.price as default_price,
        c.service_price as paid_price,
        c.commission_amount,
        c.is_paid,
        c.payment_date
      FROM Appointments a
      JOIN users u ON a.manicurist_id = u.user_id
      JOIN services s ON a.service_id = s.service_id
      LEFT JOIN Commissions c ON a.appointment_id = c.appointment_id
      WHERE a.is_walkin = TRUE
    `;

    const params = [];

    // Filtro por manicurista
    if (manicurist_id) {
      query += ` AND a.manicurist_id = ?`;
      params.push(manicurist_id);
    }

    // Filtros por fecha
    if (start_date) {
      query += ` AND DATE(a.start_time) >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(a.start_time) <= ?`;
      params.push(end_date);
    }

    query += ` ORDER BY a.start_time DESC`;

    const [works] = await connection.query(query, params);
    await connection.release();

    // Calcular totales
    const totalPaid = works.reduce((sum, w) => sum + (parseFloat(w.paid_price) || 0), 0);
    const totalCommission = works.reduce((sum, w) => sum + (parseFloat(w.commission_amount) || 0), 0);
    const totalPaidCommission = works
      .filter(w => w.is_paid)
      .reduce((sum, w) => sum + (parseFloat(w.commission_amount) || 0), 0);
    const totalPendingCommission = works
      .filter(w => !w.is_paid)
      .reduce((sum, w) => sum + (parseFloat(w.commission_amount) || 0), 0);

    res.json({
      works: works,
      summary: {
        total_works: works.length,
        total_paid: totalPaid,
        total_commission: totalCommission,
        total_paid_commission: totalPaidCommission,
        total_pending_commission: totalPendingCommission
      }
    });
  } catch (error) {
    console.error('Error al obtener trabajos:', error);
    res.status(500).json({ message: 'Error al obtener trabajos' });
  }
};

module.exports = {
  createWork,
  createWorkAdmin,
  getMyWorks,
  getAllWorks,
  updateWork,
  deleteWork
};