const Hospitalizacion = require('../models/hospitalizacion');
const Joi = require('joi');

const ESTATUS_VALIDOS = [
  'HOSPITALIZACION',
  'QUIROFANO',
  'RECUPERACION',
  'EGRESO',
  'TERAPIA',
  'URGENCIAS',
  'MANTENIMIENTO',
  'DESOCUPADA'
];

const hospitalizacionCreateSchema = Joi.object({
  paciente_nombre: Joi.string().max(100).required(),
  paciente_apellidos: Joi.string().max(100).required(),
  telefono: Joi.string().max(20).allow('', null),
  habitacion: Joi.string().max(20).required(),
  doctor_id: Joi.number().integer().allow(null, ''),
  fecha_ingreso: Joi.date().allow(null, ''),
  fecha_egreso: Joi.date().allow(null, ''),
  estatus: Joi.string().valid(...ESTATUS_VALIDOS).default('HOSPITALIZACION'),
  notas: Joi.string().allow('', null)
});

const hospitalizacionUpdateSchema = Joi.object({
  paciente_nombre: Joi.string().max(100),
  paciente_apellidos: Joi.string().max(100),
  telefono: Joi.string().max(20).allow('', null),
  habitacion: Joi.string().max(20),
  doctor_id: Joi.number().integer().allow(null, ''),
  fecha_ingreso: Joi.date().allow(null, ''),
  fecha_egreso: Joi.date().allow(null, ''),
  estatus: Joi.string().valid(...ESTATUS_VALIDOS),
  notas: Joi.string().allow('', null),
  is_active: Joi.boolean()
});

// Limpiar valores vacios a null
function cleanEmptyValues(data) {
  const cleaned = { ...data };
  if (cleaned.fecha_ingreso === '') cleaned.fecha_ingreso = null;
  if (cleaned.fecha_egreso === '') cleaned.fecha_egreso = null;
  if (cleaned.doctor_id === '') cleaned.doctor_id = null;
  return cleaned;
}

const hospitalizacionController = {
  async list(req, res, next) {
    try {
      const filters = {
        is_active: req.query.is_active === 'true' ? true :
                   req.query.is_active === 'false' ? false : undefined,
        estatus: req.query.estatus,
        habitacion: req.query.habitacion,
        doctor_id: req.query.doctor_id ? parseInt(req.query.doctor_id) : undefined
      };

      const hospitalizaciones = await Hospitalizacion.findAll(filters);

      res.json({
        success: true,
        data: hospitalizaciones
      });
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const hospitalizacion = await Hospitalizacion.findById(req.params.id);

      if (!hospitalizacion) {
        return res.status(404).json({
          success: false,
          message: 'Hospitalizacion no encontrada'
        });
      }

      res.json({
        success: true,
        data: hospitalizacion
      });
    } catch (err) {
      next(err);
    }
  },

  async getStats(req, res, next) {
    try {
      const stats = await Hospitalizacion.getEstadisticas();

      res.json({
        success: true,
        data: stats
      });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const { error, value } = hospitalizacionCreateSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      // Limpiar valores vacios
      const cleanedValue = cleanEmptyValues(value);

      // Verificar si la habitacion ya esta ocupada (si no es DESOCUPADA o EGRESO)
      if (cleanedValue.estatus !== 'DESOCUPADA' && cleanedValue.estatus !== 'EGRESO') {
        const existente = await Hospitalizacion.findByHabitacion(cleanedValue.habitacion);
        if (existente) {
          return res.status(409).json({
            success: false,
            message: `La habitacion ${cleanedValue.habitacion} ya esta ocupada por ${existente.paciente_nombre} ${existente.paciente_apellidos}`
          });
        }
      }

      const hospitalizacion = await Hospitalizacion.create(cleanedValue);

      res.status(201).json({
        success: true,
        message: 'Hospitalizacion registrada exitosamente',
        data: hospitalizacion
      });
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const { error, value } = hospitalizacionUpdateSchema.validate(req.body, { stripUnknown: true });
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      // Limpiar valores vacios
      const cleanedValue = cleanEmptyValues(value);

      const existing = await Hospitalizacion.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Hospitalizacion no encontrada'
        });
      }

      // Si cambia la habitacion, verificar que no este ocupada
      if (cleanedValue.habitacion && cleanedValue.habitacion !== existing.habitacion) {
        const ocupada = await Hospitalizacion.findByHabitacion(cleanedValue.habitacion);
        if (ocupada && ocupada.id !== parseInt(req.params.id)) {
          return res.status(409).json({
            success: false,
            message: `La habitacion ${cleanedValue.habitacion} ya esta ocupada`
          });
        }
      }

      const hospitalizacion = await Hospitalizacion.update(req.params.id, cleanedValue);

      res.json({
        success: true,
        message: 'Hospitalizacion actualizada exitosamente',
        data: hospitalizacion
      });
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      const existing = await Hospitalizacion.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Hospitalizacion no encontrada'
        });
      }

      await Hospitalizacion.delete(req.params.id);

      res.json({
        success: true,
        message: 'Hospitalizacion desactivada exitosamente'
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = hospitalizacionController;
