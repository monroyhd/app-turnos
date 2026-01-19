const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Todas las rutas requieren autenticacion
router.use(authenticateToken);

// Listar y buscar pacientes
router.get('/', patientController.list);

// Buscar por CURP
router.get('/curp/:curp', patientController.getByCurp);

// Obtener paciente por ID
router.get('/:id', patientController.getById);

// Crear paciente (capturista o admin)
router.post('/', requireRole(['admin', 'capturista']), patientController.create);

// Actualizar paciente (capturista o admin)
router.put('/:id', requireRole(['admin', 'capturista']), patientController.update);

// Eliminar paciente (solo admin)
router.delete('/:id', requireRole('admin'), patientController.delete);

module.exports = router;
