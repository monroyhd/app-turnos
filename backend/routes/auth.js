const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Rutas publicas
router.post('/login', authController.login);

// Rutas protegidas
router.get('/me', authenticateToken, authController.me);
router.post('/logout', authenticateToken, authController.logout);

// Solo admin puede registrar usuarios
router.post('/register', authenticateToken, requireRole('admin'), authController.register);

// Solo admin puede listar usuarios
router.get('/users', authenticateToken, requireRole('admin'), authController.list);

// Solo admin puede actualizar usuarios
router.put('/users/:id', authenticateToken, requireRole('admin'), authController.update);

// Solo admin puede eliminar usuarios
router.delete('/users/:id', authenticateToken, requireRole('admin'), authController.delete);

// Solo admin puede resetear password
router.post('/users/:id/reset-password', authenticateToken, requireRole('admin'), authController.resetPassword);

module.exports = router;
