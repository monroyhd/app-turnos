const knex = require('knex');
const dbConfig = require('../config/database');

const db = knex(dbConfig[process.env.NODE_ENV || 'development']);

const TABLE = 'historial_recursos';

const HistorialRecurso = {
  async findAll(filters = {}) {
    let query = db(TABLE).select('*');

    if (filters.recurso_id) {
      query = query.where('recurso_id', filters.recurso_id);
    }

    if (filters.recurso_tipo) {
      query = query.where('recurso_tipo', filters.recurso_tipo);
    }

    if (filters.doctor_id) {
      query = query.where('doctor_id', filters.doctor_id);
    }

    if (filters.fecha_inicio) {
      query = query.where('fecha_inicio', '>=', filters.fecha_inicio);
    }

    if (filters.fecha_fin) {
      query = query.where('fecha_fin', '<=', filters.fecha_fin);
    }

    if (filters.search) {
      query = query.where(function() {
        this.where('paciente_nombre', 'ilike', `%${filters.search}%`)
          .orWhere('paciente_apellidos', 'ilike', `%${filters.search}%`)
          .orWhere('recurso_nombre', 'ilike', `%${filters.search}%`);
      });
    }

    // Paginacion
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    return query.orderBy('fecha_fin', 'desc');
  },

  async findById(id) {
    return db(TABLE).where({ id }).first();
  },

  async findByRecursoId(recursoId, limit = 50) {
    return db(TABLE)
      .where('recurso_id', recursoId)
      .orderBy('fecha_fin', 'desc')
      .limit(limit);
  },

  async create(data) {
    // Calcular duracion si no viene
    let duracionMinutos = data.duracion_minutos;
    if (!duracionMinutos && data.fecha_inicio && data.fecha_fin) {
      const inicio = new Date(data.fecha_inicio);
      const fin = new Date(data.fecha_fin);
      duracionMinutos = Math.round((fin - inicio) / (1000 * 60));
    }

    const [id] = await db(TABLE)
      .insert({
        turn_id: data.turn_id || null,
        recurso_id: data.recurso_id,
        recurso_nombre: data.recurso_nombre,
        recurso_tipo: data.recurso_tipo,
        paciente_nombre: data.paciente_nombre,
        paciente_apellidos: data.paciente_apellidos,
        telefono: data.telefono,
        doctor_id: data.doctor_id,
        doctor_nombre: data.doctor_nombre,
        especialidad: data.especialidad,
        fecha_inicio: data.fecha_inicio,
        fecha_fin: data.fecha_fin || new Date(),
        duracion_minutos: duracionMinutos,
        estatus_final: data.estatus_final,
        notas: data.notas
      })
      .returning('id');

    const historialId = typeof id === 'object' ? id.id : id;
    return this.findById(historialId);
  },

  async getStats(filters = {}) {
    let query = db(TABLE);

    if (filters.fecha_inicio) {
      query = query.where('fecha_inicio', '>=', filters.fecha_inicio);
    }

    if (filters.fecha_fin) {
      query = query.where('fecha_fin', '<=', filters.fecha_fin);
    }

    if (filters.recurso_tipo) {
      query = query.where('recurso_tipo', filters.recurso_tipo);
    }

    // Total de usos
    const totalResult = await query.clone().count('* as total').first();

    // Promedio de duracion
    const promedioResult = await query.clone().avg('duracion_minutos as promedio').first();

    // Por estatus final
    const porEstatus = await query.clone()
      .select('estatus_final')
      .count('* as total')
      .groupBy('estatus_final');

    // Por tipo de recurso
    const porTipo = await query.clone()
      .select('recurso_tipo')
      .count('* as total')
      .groupBy('recurso_tipo');

    // Por doctor
    const porDoctor = await query.clone()
      .select('doctor_id', 'doctor_nombre', 'especialidad')
      .count('* as total')
      .whereNotNull('doctor_id')
      .groupBy('doctor_id', 'doctor_nombre', 'especialidad')
      .orderBy('total', 'desc')
      .limit(10);

    return {
      total: parseInt(totalResult?.total || 0),
      duracion_promedio_minutos: Math.round(parseFloat(promedioResult?.promedio || 0)),
      por_estatus: porEstatus.reduce((acc, item) => {
        acc[item.estatus_final || 'SIN_ESTATUS'] = parseInt(item.total);
        return acc;
      }, {}),
      por_tipo: porTipo.reduce((acc, item) => {
        acc[item.recurso_tipo || 'SIN_TIPO'] = parseInt(item.total);
        return acc;
      }, {}),
      por_doctor: porDoctor.map(d => ({
        doctor_id: d.doctor_id,
        doctor_nombre: d.doctor_nombre,
        especialidad: d.especialidad,
        total: parseInt(d.total)
      }))
    };
  },

  async count(filters = {}) {
    let query = db(TABLE);

    if (filters.recurso_id) {
      query = query.where('recurso_id', filters.recurso_id);
    }

    if (filters.recurso_tipo) {
      query = query.where('recurso_tipo', filters.recurso_tipo);
    }

    const result = await query.count('* as total').first();
    return parseInt(result?.total || 0);
  }
};

module.exports = HistorialRecurso;
