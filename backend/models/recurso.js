const knex = require('knex');
const dbConfig = require('../config/database');

const db = knex(dbConfig[process.env.NODE_ENV || 'development']);

const TABLE = 'recursos';

const Recurso = {
  async findAll(filters = {}) {
    let query = db(TABLE).select('*');

    if (filters.tipo) {
      query = query.where('tipo', filters.tipo);
    }

    if (filters.is_active !== undefined) {
      query = query.where('is_active', filters.is_active);
    }

    if (filters.search) {
      query = query.where(function() {
        this.where('nombre', 'ilike', `%${filters.search}%`)
          .orWhere('codigo', 'ilike', `%${filters.search}%`);
      });
    }

    return query.orderBy('tipo').orderBy('nombre');
  },

  async findById(id) {
    return db(TABLE).where({ id }).first();
  },

  async findByCodigo(codigo) {
    return db(TABLE).where({ codigo }).first();
  },

  async create(data) {
    const [id] = await db(TABLE)
      .insert({
        nombre: data.nombre,
        codigo: data.codigo,
        tipo: data.tipo,
        ubicacion: data.ubicacion,
        capacidad: data.capacidad || 1,
        descripcion: data.descripcion,
        is_active: data.is_active !== undefined ? data.is_active : true
      })
      .returning('id');

    const recursoId = typeof id === 'object' ? id.id : id;
    return this.findById(recursoId);
  },

  async update(id, data) {
    const updateData = {};

    if (data.nombre !== undefined) updateData.nombre = data.nombre;
    if (data.codigo !== undefined) updateData.codigo = data.codigo;
    if (data.tipo !== undefined) updateData.tipo = data.tipo;
    if (data.ubicacion !== undefined) updateData.ubicacion = data.ubicacion;
    if (data.capacidad !== undefined) updateData.capacidad = data.capacidad;
    if (data.descripcion !== undefined) updateData.descripcion = data.descripcion;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    updateData.updated_at = new Date();

    await db(TABLE).where({ id }).update(updateData);
    return this.findById(id);
  },

  async delete(id) {
    // Soft delete
    return db(TABLE).where({ id }).update({
      is_active: false,
      updated_at: new Date()
    });
  },

  async getEstadisticasPorTipo() {
    const stats = await db(TABLE)
      .select('tipo')
      .count('* as total')
      .where('is_active', true)
      .groupBy('tipo');

    return stats;
  }
};

module.exports = Recurso;
