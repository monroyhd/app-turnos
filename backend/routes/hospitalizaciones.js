const express = require('express');
const router = express.Router();
const hospitalizacionController = require('../controllers/hospitalizacionController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Todas las rutas requieren autenticacion
router.use(authenticateToken);

// Listar hospitalizaciones
router.get('/', hospitalizacionController.list);

// Obtener estadisticas
router.get('/stats', hospitalizacionController.getStats);

// Obtener hospitalizacion por ID
router.get('/:id', hospitalizacionController.getById);

// Crear hospitalizacion (admin y admin_habitaciones)
router.post('/', requireRole(['admin', 'admin_habitaciones']), hospitalizacionController.create);

// Actualizar hospitalizacion (admin y admin_habitaciones)
router.put('/:id', requireRole(['admin', 'admin_habitaciones']), hospitalizacionController.update);

// Desactivar hospitalizacion (admin y admin_habitaciones)
router.delete('/:id', requireRole(['admin', 'admin_habitaciones']), hospitalizacionController.delete);

module.exports = router;
