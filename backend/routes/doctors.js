const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Todas las rutas requieren autenticacion
router.use(authenticateToken);

// Listar medicos
router.get('/', doctorController.list);

// Perfil del medico autenticado (con services y consultorio)
router.get('/me', requireRole('medico'), doctorController.getMe);

// Actualizar consultorio del medico autenticado
router.put('/my-consultorio', requireRole('medico'), doctorController.updateMyConsultorio);

// Obtener medico por ID
router.get('/:id', doctorController.getById);

// Crear medico (solo admin)
router.post('/', requireRole('admin'), doctorController.create);

// Actualizar medico (solo admin)
router.put('/:id', requireRole('admin'), doctorController.update);

// Desactivar medico (solo admin)
router.delete('/:id', requireRole('admin'), doctorController.delete);

// Restablecer contrasena de medico (solo admin)
router.post('/:id/reset-password', requireRole('admin'), doctorController.resetPassword);

module.exports = router;
