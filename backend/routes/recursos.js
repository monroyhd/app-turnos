const express = require('express');
const router = express.Router();
const recursoController = require('../controllers/recursoController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Todas las rutas requieren autenticacion
router.use(authenticateToken);

// ===========================================
// RUTAS ESTATICAS (deben ir ANTES de las rutas con :id)
// ===========================================

// Listar recursos (filtrar por tipo, estado)
router.get('/', recursoController.listRecursos);

// Crear recurso (solo admin puede crear nuevos recursos)
router.post('/', requireRole(['admin']), recursoController.createRecurso);

// Lista recursos ocupados con datos paciente
router.get('/uso/ocupados', recursoController.listOcupados);

// Lista historial (filtros: recurso, doctor, fechas)
router.get('/historial/lista', recursoController.listHistorial);

// Estadisticas de uso
router.get('/historial/stats', recursoController.getStats);

// ===========================================
// RUTAS CON SUBRUTAS :id/algo (deben ir ANTES de /:id solo)
// ===========================================

// Asignar paciente a recurso (admin y admin_habitaciones pueden gestionar uso)
router.post('/:id/asignar', requireRole(['admin', 'admin_habitaciones']), recursoController.asignarPaciente);

// Actualizar datos de uso actual (admin y admin_habitaciones)
router.put('/:id/actualizar-uso', requireRole(['admin', 'admin_habitaciones']), recursoController.actualizarUso);

// Liberar recurso (mueve a historial) (admin y admin_habitaciones)
router.post('/:id/liberar', requireRole(['admin', 'admin_habitaciones']), recursoController.liberarRecurso);

// Historial de un recurso especifico
router.get('/:id/historial', recursoController.getHistorialRecurso);

// ===========================================
// RUTAS GENERICAS CON :id (deben ir AL FINAL)
// ===========================================

// Obtener recurso con estado actual
router.get('/:id', recursoController.getRecursoById);

// Actualizar/configurar recurso (solo admin)
router.put('/:id', requireRole(['admin']), recursoController.updateRecurso);

// Desactivar recurso (solo admin)
router.delete('/:id', requireRole(['admin']), recursoController.deleteRecurso);

module.exports = router;
