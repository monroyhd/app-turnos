const TurnService = require('../services/turnService');
const Turn = require('../models/turn');
const Doctor = require('../models/doctor');
const Joi = require('joi');

const createTurnSchema = Joi.object({
  patient_id: Joi.number().integer(),
  service_id: Joi.number().integer().required(),
  doctor_id: Joi.number().integer(),
  consultorio_id: Joi.number().integer().allow(null),
  priority: Joi.number().integer().min(0).max(2),
  notes: Joi.string()
});

const turnController = {
  async list(req, res, next) {
    try {
      const filters = {
        status: req.query.status,
        doctor_id: req.query.doctor_id ? parseInt(req.query.doctor_id) : undefined,
        service_id: req.query.service_id ? parseInt(req.query.service_id) : undefined,
        date: req.query.date,
        today: req.query.today === 'true'
      };

      const turns = await Turn.findAll(filters);

      res.json({
        success: true,
        data: turns
      });
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const turn = await Turn.findById(req.params.id);

      if (!turn) {
        return res.status(404).json({
          success: false,
          message: 'Turno no encontrado'
        });
      }

      res.json({
        success: true,
        data: turn
      });
    } catch (err) {
      next(err);
    }
  },

  async getQueue(req, res, next) {
    try {
      const serviceId = req.query.service_id ? parseInt(req.query.service_id) : null;
      const doctorId = req.query.doctor_id ? parseInt(req.query.doctor_id) : null;

      const queue = await TurnService.getQueue(serviceId, doctorId);

      res.json({
        success: true,
        data: queue
      });
    } catch (err) {
      next(err);
    }
  },

  async getDoctorTurns(req, res, next) {
    try {
      const doctorId = parseInt(req.params.doctorId);
      const turns = await TurnService.getDoctorTurns(doctorId);

      res.json({
        success: true,
        data: turns
      });
    } catch (err) {
      next(err);
    }
  },

  async getMyTurns(req, res, next) {
    try {
      // Obtener el doctor asociado al usuario
      const doctor = await Doctor.findByUserId(req.user.id);

      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: 'No tiene perfil de medico asociado'
        });
      }

      const turns = await TurnService.getDoctorTurns(doctor.id);

      res.json({
        success: true,
        data: turns
      });
    } catch (err) {
      next(err);
    }
  },

  async getDisplayData(req, res, next) {
    try {
      const data = await TurnService.getDisplayData();

      res.json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  },

  async getStats(req, res, next) {
    try {
      const date = req.query.date || null;
      const stats = await Turn.getStats(date);

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
      const { error, value } = createTurnSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const turn = await TurnService.createTurn(value, req.user.id);

      res.status(201).json({
        success: true,
        message: 'Turno creado exitosamente',
        data: turn
      });
    } catch (err) {
      next(err);
    }
  },

  async setWaiting(req, res, next) {
    try {
      const turn = await TurnService.setWaiting(req.params.id, req.user.id);

      res.json({
        success: true,
        message: 'Turno en espera',
        data: turn
      });
    } catch (err) {
      next(err);
    }
  },

  async call(req, res, next) {
    try {
      // Si es medico, usar su doctor_id
      let doctorId = req.body.doctor_id;

      if (req.user.role === 'medico') {
        const doctor = await Doctor.findByUserId(req.user.id);
        if (!doctor) {
          return res.status(400).json({
            success: false,
            message: 'No tiene perfil de medico asociado'
          });
        }
        doctorId = doctor.id;
      }

      if (!doctorId) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere doctor_id'
        });
      }

      const turn = await TurnService.callTurn(req.params.id, doctorId, req.user.id);

      res.json({
        success: true,
        message: 'Turno llamado',
        data: turn
      });
    } catch (err) {
      next(err);
    }
  },

  async start(req, res, next) {
    try {
      const turn = await TurnService.startService(req.params.id, req.user.id);

      res.json({
        success: true,
        message: 'Atencion iniciada',
        data: turn
      });
    } catch (err) {
      next(err);
    }
  },

  async finish(req, res, next) {
    try {
      const notes = req.body.notes || null;
      const turn = await TurnService.finishTurn(req.params.id, req.user.id, notes);

      res.json({
        success: true,
        message: 'Turno finalizado',
        data: turn
      });
    } catch (err) {
      next(err);
    }
  },

  async noShow(req, res, next) {
    try {
      const turn = await TurnService.markNoShow(req.params.id, req.user.id);

      res.json({
        success: true,
        message: 'Turno marcado como no presentado',
        data: turn
      });
    } catch (err) {
      next(err);
    }
  },

  async cancel(req, res, next) {
    try {
      const reason = req.body.reason || null;
      const turn = await TurnService.cancelTurn(req.params.id, req.user.id, reason);

      res.json({
        success: true,
        message: 'Turno cancelado',
        data: turn
      });
    } catch (err) {
      next(err);
    }
  },

  async recall(req, res, next) {
    try {
      const turn = await TurnService.recallTurn(req.params.id, req.user.id);

      res.json({
        success: true,
        message: 'Turno devuelto a espera',
        data: turn
      });
    } catch (err) {
      next(err);
    }
  },

  async getHistory(req, res, next) {
    try {
      const history = await TurnService.getHistory(req.params.id);

      res.json({
        success: true,
        data: history
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = turnController;
