require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

const config = require('./config/app');
const { errorHandler, notFoundHandler, validateJSON } = require('./middleware/errorHandler');

// Crear directorios necesarios
const requiredDirs = ['logs', 'public/uploads'];

requiredDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Crear aplicacion Express
const app = express();

// Middlewares basicos
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Logger de requests
app.use(morgan('combined', {
  stream: fs.createWriteStream(path.join('logs', 'access.log'), { flags: 'a' })
}));
app.use(morgan('dev'));

// Parser de JSON con validacion
app.use(express.json({ limit: '10mb' }));
app.use(validateJSON);
app.use(express.urlencoded({ extended: true }));

// Servir archivos estaticos (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Rutas de la API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/turns', require('./routes/turns'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/services', require('./routes/services'));
app.use('/api/settings', require('./routes/settings'));

// Ruta de health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API Sistema de Turnos funcionando correctamente',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Ruta raiz con informacion de la API
app.get('/', (req, res) => {
  res.json({
    name: 'API Sistema de Turnos Hospitalarios',
    description: 'API para gestion de turnos con actualizacion en tiempo real via MQTT',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /api/auth/login': 'Iniciar sesion',
        'POST /api/auth/logout': 'Cerrar sesion',
        'GET /api/auth/me': 'Obtener usuario actual'
      },
      turns: {
        'POST /api/turns': 'Crear turno',
        'GET /api/turns': 'Listar turnos',
        'GET /api/turns/queue': 'Cola de espera',
        'GET /api/turns/doctor/:doctorId': 'Turnos del doctor',
        'PUT /api/turns/:id/call': 'Llamar turno',
        'PUT /api/turns/:id/start': 'Iniciar atencion',
        'PUT /api/turns/:id/finish': 'Finalizar turno',
        'PUT /api/turns/:id/no-show': 'Marcar como no presentado',
        'PUT /api/turns/:id/cancel': 'Cancelar turno'
      },
      patients: {
        'POST /api/patients': 'Registrar paciente',
        'GET /api/patients': 'Listar pacientes',
        'GET /api/patients/:id': 'Obtener paciente',
        'PUT /api/patients/:id': 'Actualizar paciente'
      },
      doctors: {
        'POST /api/doctors': 'Registrar medico',
        'GET /api/doctors': 'Listar medicos',
        'GET /api/doctors/:id': 'Obtener medico',
        'PUT /api/doctors/:id': 'Actualizar medico'
      },
      services: {
        'POST /api/services': 'Crear servicio',
        'GET /api/services': 'Listar servicios',
        'GET /api/services/:id': 'Obtener servicio',
        'PUT /api/services/:id': 'Actualizar servicio'
      },
      settings: {
        'GET /api/settings': 'Obtener configuracion del sistema',
        'PUT /api/settings': 'Actualizar configuracion (admin, multipart/form-data)'
      }
    }
  });
});

// Middlewares de manejo de errores
app.use(notFoundHandler);
app.use(errorHandler);

// Iniciar servidor
const PORT = config.port;

// Inicializar servicio MQTT
const mqttService = require('./services/mqttService');
mqttService.connect();

const server = app.listen(PORT, () => {
  console.log('========================================');
  console.log('  SISTEMA DE TURNOS HOSPITALARIOS');
  console.log('========================================');
  console.log(`Servidor ejecutandose en puerto: ${PORT}`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Entorno: ${config.nodeEnv}`);
  console.log('========================================');
});

// Manejo de cierre graceful
process.on('SIGTERM', () => {
  console.log('Cerrando servidor...');
  mqttService.disconnect();
  server.close(() => {
    console.log('Servidor cerrado correctamente');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Cerrando servidor...');
  mqttService.disconnect();
  server.close(() => {
    console.log('Servidor cerrado correctamente');
    process.exit(0);
  });
});

module.exports = app;
