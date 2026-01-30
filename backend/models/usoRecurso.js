const knex = require('knex');
const dbConfig = require('../config/database');

const db = knex(dbConfig[process.env.NODE_ENV || 'development']);

const TABLE = 'uso_recursos';

const UsoRecurso = {
  async findAll(filters = {}) {
    let query = db(TABLE)
      .select(
        'uso_recursos.*',
        'recursos.nombre as recurso_nombre',
        'recursos.codigo as recurso_codigo',
        'recursos.tipo as recurso_tipo',
        'recursos.ubicacion as recurso_ubicacion',
        'doctors.full_name as doctor_nombre',
        'doctors.specialty as doctor_especialidad'
      )
      .leftJoin('recursos', 'uso_recursos.recurso_id', 'recursos.id')
      .leftJoin('doctors', 'uso_recursos.doctor_id', 'doctors.id');

    if (filters.recurso_id) {
      query = query.where('uso_recursos.recurso_id', filters.recurso_id);
    }

    if (filters.tipo) {
      query = query.where('recursos.tipo', filters.tipo);
    }

    if (filters.estatus) {
      query = query.where('uso_recursos.estatus', filters.estatus);
    }

    if (filters.doctor_id) {
      query = query.where('uso_recursos.doctor_id', filters.doctor_id);
    }

    return query.orderBy('uso_recursos.fecha_inicio', 'desc');
  },

  async findById(id) {
    return db(TABLE)
      .select(
        'uso_recursos.*',
        'recursos.nombre as recurso_nombre',
        'recursos.codigo as recurso_codigo',
        'recursos.tipo as recurso_tipo',
        'recursos.ubicacion as recurso_ubicacion',
        'doctors.full_name as doctor_nombre',
        'doctors.specialty as doctor_especialidad'
      )
      .leftJoin('recursos', 'uso_recursos.recurso_id', 'recursos.id')
      .leftJoin('doctors', 'uso_recursos.doctor_id', 'doctors.id')
      .where('uso_recursos.id', id)
      .first();
  },

  async findByRecursoId(recursoId) {
    return db(TABLE)
      .select(
        'uso_recursos.*',
        'recursos.nombre as recurso_nombre',
        'recursos.codigo as recurso_codigo',
        'recursos.tipo as recurso_tipo',
        'doctors.full_name as doctor_nombre',
        'doctors.specialty as doctor_especialidad'
      )
      .leftJoin('recursos', 'uso_recursos.recurso_id', 'recursos.id')
      .leftJoin('doctors', 'uso_recursos.doctor_id', 'doctors.id')
      .where('uso_recursos.recurso_id', recursoId)
      .first();
  },

  async isRecursoOcupado(recursoId) {
    const uso = await db(TABLE).where({ recurso_id: recursoId }).first();
    return !!uso;
  },

  async create(data) {
    const [id] = await db(TABLE)
      .insert({
        recurso_id: data.recurso_id,
        paciente_nombre: data.paciente_nombre,
        paciente_apellidos: data.paciente_apellidos,
        telefono: data.telefono,
        doctor_id: data.doctor_id,
        fecha_inicio: data.fecha_inicio || new Date(),
        estatus: data.estatus || 'OCUPADO',
        notas: data.notas
      })
      .returning('id');

    const usoId = typeof id === 'object' ? id.id : id;
    return this.findById(usoId);
  },

  async update(id, data) {
    const updateData = {};

    if (data.paciente_nombre !== undefined) updateData.paciente_nombre = data.paciente_nombre;
    if (data.paciente_apellidos !== undefined) updateData.paciente_apellidos = data.paciente_apellidos;
    if (data.telefono !== undefined) updateData.telefono = data.telefono;
    if (data.doctor_id !== undefined) updateData.doctor_id = data.doctor_id;
    if (data.estatus !== undefined) updateData.estatus = data.estatus;
    if (data.notas !== undefined) updateData.notas = data.notas;

    updateData.updated_at = new Date();

    await db(TABLE).where({ id }).update(updateData);
    return this.findById(id);
  },

  async delete(id) {
    return db(TABLE).where({ id }).del();
  },

  async deleteByRecursoId(recursoId) {
    return db(TABLE).where({ recurso_id: recursoId }).del();
  },

  async getEstadisticas() {
    const stats = await db(TABLE)
      .select('estatus')
      .count('* as total')
      .groupBy('estatus');

    const result = {
      total: 0,
      por_estatus: {}
    };

    stats.forEach(stat => {
      const count = parseInt(stat.total);
      result.total += count;
      result.por_estatus[stat.estatus] = count;
    });

    return result;
  },

  async getEstadisticasPorTipo() {
    const stats = await db(TABLE)
      .select('recursos.tipo', 'uso_recursos.estatus')
      .count('* as total')
      .leftJoin('recursos', 'uso_recursos.recurso_id', 'recursos.id')
      .groupBy('recursos.tipo', 'uso_recursos.estatus');

    return stats;
  }
};

module.exports = UsoRecurso;
