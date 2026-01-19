const express = require('express');
const router = express.Router();
const turnController = require('../controllers/turnController');
const { authenticateToken, optionalAuth, requireRole } = require('../middleware/auth');

// Rutas publicas para pantalla
router.get('/display', optionalAuth, turnController.getDisplayData);

// Todas las demas rutas requieren autenticacion
router.use(authenticateToken);

// Listar turnos
router.get('/', turnController.list);

// Cola de espera
router.get('/queue', turnController.getQueue);

// Estadisticas
router.get('/stats', turnController.getStats);

// Mis turnos (para medicos)
router.get('/my-turns', requireRole('medico'), turnController.getMyTurns);

// Turnos de un doctor especifico
router.get('/doctor/:doctorId', turnController.getDoctorTurns);

// Obtener turno por ID
router.get('/:id', turnController.getById);

// Historial de un turno
router.get('/:id/history', turnController.getHistory);

// Crear turno (capturista o admin)
router.post('/', requireRole(['admin', 'capturista']), turnController.create);

// Poner en espera
router.put('/:id/waiting', requireRole(['admin', 'capturista']), turnController.setWaiting);

// Llamar turno (medico o admin)
router.put('/:id/call', requireRole(['admin', 'medico']), turnController.call);

// Iniciar atencion
router.put('/:id/start', requireRole(['admin', 'medico']), turnController.start);

// Finalizar turno
router.put('/:id/finish', requireRole(['admin', 'medico']), turnController.finish);

// Marcar como no presentado
router.put('/:id/no-show', requireRole(['admin', 'medico']), turnController.noShow);

// Cancelar turno
router.put('/:id/cancel', requireRole(['admin', 'capturista', 'medico']), turnController.cancel);

// Volver a poner en espera (para volver a llamar)
router.put('/:id/recall', requireRole(['admin', 'medico']), turnController.recall);

module.exports = router;
