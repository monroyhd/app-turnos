const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Todas las rutas requieren autenticacion
router.use(authenticateToken);

// Listar servicios
router.get('/', serviceController.list);

// Obtener servicio por ID
router.get('/:id', serviceController.getById);

// Obtener medicos de un servicio
router.get('/:id/doctors', serviceController.getDoctors);

// Crear servicio (solo admin)
router.post('/', requireRole('admin'), serviceController.create);

// Actualizar servicio (solo admin)
router.put('/:id', requireRole('admin'), serviceController.update);

// Desactivar servicio (solo admin)
router.delete('/:id', requireRole('admin'), serviceController.delete);

module.exports = router;
