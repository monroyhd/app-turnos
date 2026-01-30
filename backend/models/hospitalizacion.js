const knex = require('knex');
const dbConfig = require('../config/database');

const db = knex(dbConfig[process.env.NODE_ENV || 'development']);

const TABLE = 'hospitalizaciones';

const Hospitalizacion = {
  async findAll(filters = {}) {
    let query = db(TABLE)
      .select(
        'hospitalizaciones.*',
        'doctors.full_name as doctor_nombre'
      )
      .leftJoin('doctors', 'hospitalizaciones.doctor_id', 'doctors.id');

    if (filters.is_active !== undefined) {
      query = query.where('hospitalizaciones.is_active', filters.is_active);
    }

    if (filters.estatus) {
      query = query.where('hospitalizaciones.estatus', filters.estatus);
    }

    if (filters.habitacion) {
      query = query.where('hospitalizaciones.habitacion', filters.habitacion);
    }

    if (filters.doctor_id) {
      query = query.where('hospitalizaciones.doctor_id', filters.doctor_id);
    }

    return query.orderBy('hospitalizaciones.created_at', 'desc');
  },

  async findById(id) {
    return db(TABLE)
      .select(
        'hospitalizaciones.*',
        'doctors.full_name as doctor_nombre'
      )
      .leftJoin('doctors', 'hospitalizaciones.doctor_id', 'doctors.id')
      .where('hospitalizaciones.id', id)
      .first();
  },

  async findByHabitacion(habitacion, activeOnly = true) {
    let query = db(TABLE)
      .select(
        'hospitalizaciones.*',
        'doctors.full_name as doctor_nombre'
      )
      .leftJoin('doctors', 'hospitalizaciones.doctor_id', 'doctors.id')
      .where('hospitalizaciones.habitacion', habitacion);

    if (activeOnly) {
      query = query.where('hospitalizaciones.is_active', true)
                   .whereNot('hospitalizaciones.estatus', 'EGRESO')
                   .whereNot('hospitalizaciones.estatus', 'DESOCUPADA');
    }

    return query.first();
  },

  async create(data) {
    const [id] = await db(TABLE)
      .insert({
        paciente_nombre: data.paciente_nombre,
        paciente_apellidos: data.paciente_apellidos,
        telefono: data.telefono,
        habitacion: data.habitacion,
        doctor_id: data.doctor_id,
        fecha_ingreso: data.fecha_ingreso || new Date(),
        fecha_egreso: data.fecha_egreso,
        estatus: data.estatus || 'HOSPITALIZACION',
        notas: data.notas,
        is_active: true
      })
      .returning('id');

    const hospitalizacionId = typeof id === 'object' ? id.id : id;
    return this.findById(hospitalizacionId);
  },

  async update(id, data) {
    const updateData = {};

    if (data.paciente_nombre !== undefined) updateData.paciente_nombre = data.paciente_nombre;
    if (data.paciente_apellidos !== undefined) updateData.paciente_apellidos = data.paciente_apellidos;
    if (data.telefono !== undefined) updateData.telefono = data.telefono;
    if (data.habitacion !== undefined) updateData.habitacion = data.habitacion;
    if (data.doctor_id !== undefined) updateData.doctor_id = data.doctor_id;
    if (data.fecha_ingreso !== undefined) updateData.fecha_ingreso = data.fecha_ingreso;
    if (data.fecha_egreso !== undefined) updateData.fecha_egreso = data.fecha_egreso;
    if (data.estatus !== undefined) updateData.estatus = data.estatus;
    if (data.notas !== undefined) updateData.notas = data.notas;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    updateData.updated_at = new Date();

    await db(TABLE).where({ id }).update(updateData);
    return this.findById(id);
  },

  async delete(id) {
    return db(TABLE).where({ id }).update({
      is_active: false,
      updated_at: new Date()
    });
  },

  async getEstadisticas() {
    const stats = await db(TABLE)
      .select('estatus')
      .count('* as total')
      .where('is_active', true)
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
  }
};

module.exports = Hospitalizacion;
