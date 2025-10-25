const express = require('express');
const workController = require('../controllers/workController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');
const router = express.Router();

// Crear trabajo walk-in (solo manicurista)
router.post('/', verifyToken, checkRole([2]), workController.createWork);

// Crear trabajo como admin (para cualquier manicurista)
router.post('/admin', verifyToken, checkRole([1]), workController.createWorkAdmin);

// Obtener mis trabajos (solo manicurista)
router.get('/my-works', verifyToken, checkRole([2]), workController.getMyWorks);

// Obtener todos los trabajos (solo admin)
router.get('/all', verifyToken, checkRole([1]), workController.getAllWorks);

// Actualizar trabajo (manicurista o admin)
router.put('/:id', verifyToken, checkRole([1, 2]), workController.updateWork);

// Eliminar trabajo (manicurista o admin)
router.delete('/:id', verifyToken, checkRole([1, 2]), workController.deleteWork);

module.exports = router;