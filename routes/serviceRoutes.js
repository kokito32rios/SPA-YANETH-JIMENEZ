const express = require('express');
const serviceController = require('../controllers/serviceController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');
const router = express.Router();

// Obtener servicios (público)
router.get('/', serviceController.getServices);

// Crear servicio (solo administrador)
router.post('/', verifyToken, checkRole([1]), serviceController.createService);

// Actualizar servicio (solo administrador)
router.put('/:id', verifyToken, checkRole([1]), serviceController.updateService);

// Eliminar servicio (solo administrador)
router.delete('/:id', verifyToken, checkRole([1]), serviceController.deleteService);

module.exports = router;