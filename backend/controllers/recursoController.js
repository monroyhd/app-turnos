const Recurso = require('../models/recurso');
const UsoRecurso = require('../models/usoRecurso');
const HistorialRecurso = require('../models/historialRecurso');
const Joi = require('joi');

const TIPOS_VALIDOS = ['CONSULTORIO', 'HABITACION'];
const ESTATUS_VALIDOS = [
  'HOSPITALIZACION',
  'QUIROFANO',
  'RECUPERACION',
  'TERAPIA',
  'URGENCIAS',
  'MANTENIMIENTO',
  'OCUPADO'
];

// Esquemas de validacion
const recursoCreateSchema = Joi.object({
  nombre: Joi.string().max(100).required(),
  codigo: Joi.string().max(20).required(),
  tipo: Joi.string().valid(...TIPOS_VALIDOS).required(),
  ubicacion: Joi.string().max(100).allow('', null),
  capacidad: Joi.number().integer().min(1).default(1),
  descripcion: Joi.string().allow('', null),
  is_active: Joi.boolean().default(true)
});

const recursoUpdateSchema = Joi.object({
  nombre: Joi.string().max(100),
  codigo: Joi.string().max(20),
  tipo: Joi.string().valid(...TIPOS_VALIDOS),
  ubicacion: Joi.string().max(100).allow('', null),
  capacidad: Joi.number().integer().min(1),
  descripcion: Joi.string().allow('', null),
  is_active: Joi.boolean()
});

const asignarPacienteSchema = Joi.object({
  paciente_nombre: Joi.string().max(100).required(),
  paciente_apellidos: Joi.string().max(100).required(),
  telefono: Joi.string().max(20).allow('', null),
  doctor_id: Joi.number().integer().allow(null, ''),
  fecha_inicio: Joi.date().allow(null, ''),
  estatus: Joi.string().valid(...ESTATUS_VALIDOS).default('OCUPADO'),
  notas: Joi.string().allow('', null)
});

const actualizarUsoSchema = Joi.object({
  paciente_nombre: Joi.string().max(100),
  paciente_apellidos: Joi.string().max(100),
  telefono: Joi.string().max(20).allow('', null),
  doctor_id: Joi.number().integer().allow(null, ''),
  estatus: Joi.string().valid(...ESTATUS_VALIDOS),
  notas: Joi.string().allow('', null)
});

const liberarRecursoSchema = Joi.object({
  notas_finales: Joi.string().allow('', null),
  resultado: Joi.string().valid('ATENDIDO', 'CANCELADO', 'NO_SE_PRESENTO').default('ATENDIDO')
});

// Utilidades
function cleanEmptyValues(data) {
  const cleaned = { ...data };
  if (cleaned.fecha_inicio === '') cleaned.fecha_inicio = null;
  if (cleaned.doctor_id === '') cleaned.doctor_id = null;
  return cleaned;
}

const recursoController = {
  // ===========================================
  // CATALOGO DE RECURSOS
  // ===========================================

  async listRecursos(req, res, next) {
    try {
      const filters = {
        tipo: req.query.tipo,
        is_active: req.query.is_active === 'true' ? true :
                   req.query.is_active === 'false' ? false : undefined,
        search: req.query.search
      };

      const recursos = await Recurso.findAll(filters);

      // Agregar estado de ocupacion a cada recurso
      const recursosConEstado = await Promise.all(
        recursos.map(async (recurso) => {
          const uso = await UsoRecurso.findByRecursoId(recurso.id);
          return {
            ...recurso,
            ocupado: !!uso,
            uso_actual: uso || null
          };
        })
      );

      res.json({
        success: true,
        data: recursosConEstado
      });
    } catch (err) {
      next(err);
    }
  },

  async getRecursoById(req, res, next) {
    try {
      const recurso = await Recurso.findById(req.params.id);

      if (!recurso) {
        return res.status(404).json({
          success: false,
          message: 'Recurso no encontrado'
        });
      }

      // Agregar estado de ocupacion
      const uso = await UsoRecurso.findByRecursoId(recurso.id);

      res.json({
        success: true,
        data: {
          ...recurso,
          ocupado: !!uso,
          uso_actual: uso || null
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async createRecurso(req, res, next) {
    try {
      const { error, value } = recursoCreateSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      // Verificar que el codigo no exista para el mismo tipo
      const existente = await Recurso.findByCodigo(value.codigo, value.tipo);
      if (existente) {
        return res.status(409).json({
          success: false,
          message: `Ya existe un ${value.tipo.toLowerCase()} con el codigo ${value.codigo}`
        });
      }

      const recurso = await Recurso.create(value);

      res.status(201).json({
        success: true,
        message: 'Recurso creado exitosamente',
        data: recurso
      });
    } catch (err) {
      next(err);
    }
  },

  async updateRecurso(req, res, next) {
    try {
      const { error, value } = recursoUpdateSchema.validate(req.body, { stripUnknown: true });
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const existing = await Recurso.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Recurso no encontrado'
        });
      }

      // Si cambia el codigo, verificar que no exista para el mismo tipo
      if (value.codigo && value.codigo !== existing.codigo) {
        const tipo = value.tipo || existing.tipo;
        const existente = await Recurso.findByCodigo(value.codigo, tipo);
        if (existente) {
          return res.status(409).json({
            success: false,
            message: `Ya existe un ${tipo.toLowerCase()} con el codigo ${value.codigo}`
          });
        }
      }

      const recurso = await Recurso.update(req.params.id, value);

      res.json({
        success: true,
        message: 'Recurso actualizado exitosamente',
        data: recurso
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteRecurso(req, res, next) {
    try {
      const existing = await Recurso.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Recurso no encontrado'
        });
      }

      // Verificar que no este ocupado
      const ocupado = await UsoRecurso.isRecursoOcupado(req.params.id);
      if (ocupado) {
        return res.status(409).json({
          success: false,
          message: 'No se puede desactivar un recurso que esta ocupado. Libere el recurso primero.'
        });
      }

      await Recurso.delete(req.params.id);

      res.json({
        success: true,
        message: 'Recurso desactivado exitosamente'
      });
    } catch (err) {
      next(err);
    }
  },

  // ===========================================
  // GESTION DE USO (OCUPACION)
  // ===========================================

  async listOcupados(req, res, next) {
    try {
      const filters = {
        tipo: req.query.tipo,
        estatus: req.query.estatus,
        doctor_id: req.query.doctor_id ? parseInt(req.query.doctor_id) : undefined
      };

      const ocupados = await UsoRecurso.findAll(filters);

      res.json({
        success: true,
        data: ocupados
      });
    } catch (err) {
      next(err);
    }
  },

  async asignarPaciente(req, res, next) {
    try {
      const { error, value } = asignarPacienteSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const cleanedValue = cleanEmptyValues(value);

      // Verificar que el recurso existe y esta activo
      const recurso = await Recurso.findById(req.params.id);
      if (!recurso) {
        return res.status(404).json({
          success: false,
          message: 'Recurso no encontrado'
        });
      }

      if (!recurso.is_active) {
        return res.status(409).json({
          success: false,
          message: 'No se puede asignar un paciente a un recurso inactivo'
        });
      }

      // Verificar que el recurso este libre
      const ocupado = await UsoRecurso.isRecursoOcupado(req.params.id);
      if (ocupado) {
        return res.status(409).json({
          success: false,
          message: `El recurso ${recurso.nombre} ya esta ocupado`
        });
      }

      const uso = await UsoRecurso.create({
        recurso_id: parseInt(req.params.id),
        ...cleanedValue
      });

      res.status(201).json({
        success: true,
        message: `Paciente asignado exitosamente a ${recurso.nombre}`,
        data: uso
      });
    } catch (err) {
      next(err);
    }
  },

  async actualizarUso(req, res, next) {
    try {
      const { error, value } = actualizarUsoSchema.validate(req.body, { stripUnknown: true });
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const cleanedValue = cleanEmptyValues(value);

      // Verificar que el recurso existe
      const recurso = await Recurso.findById(req.params.id);
      if (!recurso) {
        return res.status(404).json({
          success: false,
          message: 'Recurso no encontrado'
        });
      }

      // Obtener uso actual
      const usoActual = await UsoRecurso.findByRecursoId(req.params.id);
      if (!usoActual) {
        return res.status(404).json({
          success: false,
          message: `El recurso ${recurso.nombre} no esta ocupado`
        });
      }

      const uso = await UsoRecurso.update(usoActual.id, cleanedValue);

      res.json({
        success: true,
        message: 'Datos de uso actualizados exitosamente',
        data: uso
      });
    } catch (err) {
      next(err);
    }
  },

  async liberarRecurso(req, res, next) {
    try {
      const { error, value } = liberarRecursoSchema.validate(req.body, { stripUnknown: true });
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      // Verificar que el recurso existe
      const recurso = await Recurso.findById(req.params.id);
      if (!recurso) {
        return res.status(404).json({
          success: false,
          message: 'Recurso no encontrado'
        });
      }

      // Obtener uso actual
      const usoActual = await UsoRecurso.findByRecursoId(req.params.id);
      if (!usoActual) {
        return res.status(404).json({
          success: false,
          message: `El recurso ${recurso.nombre} no esta ocupado`
        });
      }

      const fechaFin = new Date();

      // Crear registro en historial
      await HistorialRecurso.create({
        recurso_id: recurso.id,
        recurso_nombre: recurso.nombre,
        recurso_tipo: recurso.tipo,
        paciente_nombre: usoActual.paciente_nombre,
        paciente_apellidos: usoActual.paciente_apellidos,
        telefono: usoActual.telefono,
        doctor_id: usoActual.doctor_id,
        doctor_nombre: usoActual.doctor_nombre,
        especialidad: usoActual.doctor_especialidad,
        fecha_inicio: usoActual.fecha_inicio,
        fecha_fin: fechaFin,
        estatus_final: value.resultado || 'ATENDIDO',
        notas: value.notas_finales || usoActual.notas
      });

      // Eliminar uso actual
      await UsoRecurso.delete(usoActual.id);

      res.json({
        success: true,
        message: `Recurso ${recurso.nombre} liberado exitosamente. Registro agregado al historial.`
      });
    } catch (err) {
      next(err);
    }
  },

  // ===========================================
  // HISTORIAL Y REPORTES
  // ===========================================

  async listHistorial(req, res, next) {
    try {
      const filters = {
        recurso_id: req.query.recurso_id ? parseInt(req.query.recurso_id) : undefined,
        recurso_tipo: req.query.tipo,
        doctor_id: req.query.doctor_id ? parseInt(req.query.doctor_id) : undefined,
        fecha_inicio: req.query.fecha_inicio,
        fecha_fin: req.query.fecha_fin,
        search: req.query.search,
        limit: req.query.limit ? parseInt(req.query.limit) : 100,
        offset: req.query.offset ? parseInt(req.query.offset) : 0
      };

      const historial = await HistorialRecurso.findAll(filters);
      const total = await HistorialRecurso.count(filters);

      res.json({
        success: true,
        data: historial,
        pagination: {
          total,
          limit: filters.limit,
          offset: filters.offset
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async getHistorialRecurso(req, res, next) {
    try {
      const recurso = await Recurso.findById(req.params.id);
      if (!recurso) {
        return res.status(404).json({
          success: false,
          message: 'Recurso no encontrado'
        });
      }

      const limit = req.query.limit ? parseInt(req.query.limit) : 50;
      const historial = await HistorialRecurso.findByRecursoId(req.params.id, limit);

      res.json({
        success: true,
        data: {
          recurso,
          historial
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async getStats(req, res, next) {
    try {
      const filters = {
        fecha_inicio: req.query.fecha_inicio,
        fecha_fin: req.query.fecha_fin,
        recurso_tipo: req.query.tipo
      };

      // Estadisticas del historial
      const statsHistorial = await HistorialRecurso.getStats(filters);

      // Estadisticas de uso actual
      const statsUsoActual = await UsoRecurso.getEstadisticas();

      // Total de recursos
      const statsPorTipo = await Recurso.getEstadisticasPorTipo();

      res.json({
        success: true,
        data: {
          recursos_totales: statsPorTipo,
          uso_actual: statsUsoActual,
          historial: statsHistorial
        }
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = recursoController;
