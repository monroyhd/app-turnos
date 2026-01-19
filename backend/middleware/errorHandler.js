const winston = require('winston');

const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

const errorHandler = (err, req, res, next) => {
  logger.error('Error en la aplicacion:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  let statusCode = 500;
  let message = 'Error interno del servidor';

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message || 'Datos invalidos';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'ID invalido';
  } else if (err.code === '23505') {
    statusCode = 409;
    message = 'Recurso duplicado';
  } else if (err.code === '23503') {
    statusCode = 400;
    message = 'Referencia invalida';
  } else if (err.message.includes('jwt')) {
    statusCode = 401;
    message = 'Token invalido';
  } else if (err.statusCode) {
    statusCode = err.statusCode;
    message = err.message;
  }

  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  if (process.env.NODE_ENV === 'development') {
    response.error = err.message;
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.url}`,
    timestamp: new Date().toISOString()
  });
};

const validateJSON = (err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'JSON invalido'
    });
  }
  next(err);
};

module.exports = {
  errorHandler,
  notFoundHandler,
  validateJSON,
  logger
};
