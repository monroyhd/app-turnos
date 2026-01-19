const Patient = require('../models/patient');
const Joi = require('joi');

const patientSchema = Joi.object({
  curp: Joi.string().length(18).uppercase(),
  full_name: Joi.string().max(100).required(),
  birth_date: Joi.date().iso(),
  phone: Joi.string().max(20),
  email: Joi.string().email(),
  address: Joi.string(),
  is_preferential: Joi.boolean(),
  notes: Joi.string()
});

const patientController = {
  async list(req, res, next) {
    try {
      const filters = {
        search: req.query.search,
        is_preferential: req.query.is_preferential === 'true' ? true :
                        req.query.is_preferential === 'false' ? false : undefined
      };

      const patients = await Patient.findAll(filters);

      res.json({
        success: true,
        data: patients
      });
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const patient = await Patient.findById(req.params.id);

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Paciente no encontrado'
        });
      }

      res.json({
        success: true,
        data: patient
      });
    } catch (err) {
      next(err);
    }
  },

  async getByCurp(req, res, next) {
    try {
      const patient = await Patient.findByCurp(req.params.curp.toUpperCase());

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Paciente no encontrado'
        });
      }

      res.json({
        success: true,
        data: patient
      });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const { error, value } = patientSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      if (value.curp) {
        const existing = await Patient.findByCurp(value.curp);
        if (existing) {
          return res.status(409).json({
            success: false,
            message: 'Ya existe un paciente con ese CURP'
          });
        }
      }

      const patient = await Patient.create(value);

      res.status(201).json({
        success: true,
        message: 'Paciente registrado exitosamente',
        data: patient
      });
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const { error, value } = patientSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const existing = await Patient.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Paciente no encontrado'
        });
      }

      if (value.curp && value.curp !== existing.curp) {
        const curpExists = await Patient.findByCurp(value.curp);
        if (curpExists) {
          return res.status(409).json({
            success: false,
            message: 'Ya existe un paciente con ese CURP'
          });
        }
      }

      const patient = await Patient.update(req.params.id, value);

      res.json({
        success: true,
        message: 'Paciente actualizado exitosamente',
        data: patient
      });
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      const existing = await Patient.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Paciente no encontrado'
        });
      }

      await Patient.delete(req.params.id);

      res.json({
        success: true,
        message: 'Paciente eliminado exitosamente'
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = patientController;
