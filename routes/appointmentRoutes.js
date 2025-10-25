const express = require('express');
const appointmentController = require('../controllers/appointmentController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');
const router = express.Router();

// Crear cita (cliente)
router.post('/', verifyToken, checkRole([3]), appointmentController.createAppointment);

// Crear cita (admin)
router.post('/admin', verifyToken, checkRole([1]), appointmentController.createAppointmentAdmin);

// Obtener citas (según rol)
router.get('/client', verifyToken, checkRole([3]), appointmentController.getClientAppointments);
router.get('/manicurist', verifyToken, checkRole([2]), appointmentController.getManicuristAppointments);
router.get('/all', verifyToken, checkRole([1]), appointmentController.getAllAppointments);

// Cancelar cita
router.put('/:id/cancel', verifyToken, appointmentController.cancelAppointment);

// Actualizar estado (manicurista o admin)
router.put('/:id/status', verifyToken, appointmentController.updateAppointmentStatus);

// Eliminar cita (solo admin)
router.delete('/:id', verifyToken, checkRole([1]), appointmentController.deleteAppointment);

module.exports = router;