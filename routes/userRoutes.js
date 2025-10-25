const express = require('express');
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');
const router = express.Router();

// Rutas públicas para usuarios autenticados
router.get('/profile', verifyToken, userController.getProfile);
router.put('/profile', verifyToken, userController.updateProfile);

// Rutas solo para administrador
router.get('/all', verifyToken, checkRole([1]), userController.getAllUsers);
router.put('/:id', verifyToken, checkRole([1]), userController.updateUser);
router.delete('/:id', verifyToken, checkRole([1]), userController.deleteUser);
router.get('/manicurists', verifyToken, userController.getAvailableManicurists);

module.exports = router;