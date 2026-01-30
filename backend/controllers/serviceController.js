const Service = require('../models/service');
const Joi = require('joi');

// Funcion para generar codigo a partir del nombre
function generateCodeFromName(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar acentos
    .replace(/[^a-z0-9\s]/g, '')     // solo alfanumericos
    .trim()
    .replace(/\s+/g, '-');           // espacios a guiones
}

const serviceSchema = Joi.object({
  name: Joi.string().max(100).required(),
  code: Joi.string().max(20).allow('', null),  // Codigo opcional, si no se proporciona se genera del nombre
  description: Joi.string().allow('', null),
  estimated_duration: Joi.number().integer().min(1).max(480),
  tipo: Joi.string().valid('servicio', 'recurso'),
  categoria: Joi.string().max(50).allow('', null),
  is_active: Joi.boolean()
}).unknown(true); // Ignorar campos extra como id, prefix, etc.

const serviceController = {
  async list(req, res, next) {
    try {
      const filters = {
        is_active: req.query.is_active === 'true' ? true :
                   req.query.is_active === 'false' ? false : undefined,
        tipo: req.query.tipo || undefined
      };

      const services = await Service.findAll(filters);

      res.json({
        success: true,
        data: services
      });
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const service = await Service.findById(req.params.id);

      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Servicio no encontrado'
        });
      }

      res.json({
        success: true,
        data: service
      });
    } catch (err) {
      next(err);
    }
  },

  async getDoctors(req, res, next) {
    try {
      const service = await Service.findById(req.params.id);

      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Servicio no encontrado'
        });
      }

      const doctors = await Service.getDoctors(req.params.id);

      res.json({
        success: true,
        data: doctors
      });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const { error, value } = serviceSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      // Usar codigo proporcionado, o generar del nombre si esta vacio
      const code = value.code?.trim() || generateCodeFromName(value.name);

      const existing = await Service.findByCode(code);
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Ya existe un servicio con ese codigo'
        });
      }

      const service = await Service.create({ ...value, code });

      res.status(201).json({
        success: true,
        message: 'Servicio creado exitosamente',
        data: service
      });
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const { error, value } = serviceSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const existing = await Service.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Servicio no encontrado'
        });
      }

      // Si se proporciona codigo, usarlo; si no, mantener el existente
      // Si no hay codigo existente y el nombre cambio, generar del nombre
      let code = value.code?.trim() || existing.code;
      if (!code && value.name && value.name !== existing.name) {
        code = generateCodeFromName(value.name);
      }

      // Verificar que el codigo no este duplicado (si cambio)
      if (code && code !== existing.code) {
        const codeExists = await Service.findByCode(code);
        if (codeExists && codeExists.id !== existing.id) {
          return res.status(409).json({
            success: false,
            message: 'Ya existe un servicio con ese codigo'
          });
        }
      }

      const service = await Service.update(req.params.id, { ...value, code });

      res.json({
        success: true,
        message: 'Servicio actualizado exitosamente',
        data: service
      });
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      const existing = await Service.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Servicio no encontrado'
        });
      }

      await Service.delete(req.params.id);

      res.json({
        success: true,
        message: 'Servicio eliminado exitosamente'
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = serviceController;
