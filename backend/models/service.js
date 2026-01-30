const knex = require('knex');
const dbConfig = require('../config/database');

const db = knex(dbConfig[process.env.NODE_ENV || 'development']);

const TABLE = 'services';

const Service = {
  async findAll(filters = {}) {
    let query = db(TABLE).select('*');

    if (filters.is_active !== undefined) {
      query = query.where('is_active', filters.is_active);
    }

    if (filters.tipo) {
      query = query.where('tipo', filters.tipo);
    }

    return query.orderBy('name', 'asc');
  },

  async findById(id) {
    return db(TABLE).where({ id }).first();
  },

  async findByCode(code) {
    return db(TABLE).where({ code }).first();
  },

  async create(serviceData) {
    // Generar prefix automaticamente de la primera letra del nombre
    const prefix = serviceData.name.charAt(0).toUpperCase();

    const [id] = await db(TABLE)
      .insert({
        name: serviceData.name,
        code: serviceData.code,
        prefix: prefix,
        description: serviceData.description,
        estimated_duration: serviceData.estimated_duration || 15,
        tipo: serviceData.tipo || 'servicio',
        categoria: serviceData.categoria || null,
        is_active: true
      })
      .returning('id');

    return this.findById(typeof id === 'object' ? id.id : id);
  },

  async update(id, serviceData) {
    const updateData = {};

    if (serviceData.name) {
      updateData.name = serviceData.name;
      // Actualizar prefix automaticamente si cambia el nombre
      updateData.prefix = serviceData.name.charAt(0).toUpperCase();
    }
    if (serviceData.code) updateData.code = serviceData.code;
    if (serviceData.description !== undefined) updateData.description = serviceData.description;
    if (serviceData.estimated_duration) updateData.estimated_duration = serviceData.estimated_duration;
    if (serviceData.tipo) updateData.tipo = serviceData.tipo;
    if (serviceData.categoria !== undefined) updateData.categoria = serviceData.categoria;
    if (serviceData.is_active !== undefined) updateData.is_active = serviceData.is_active;

    await db(TABLE).where({ id }).update(updateData);

    return this.findById(id);
  },

  async delete(id) {
    return db(TABLE).where({ id }).del();
  },

  async getDoctors(serviceId) {
    return db('doctor_services')
      .join('doctors', 'doctor_services.doctor_id', 'doctors.id')
      .where('doctor_services.service_id', serviceId)
      .where('doctors.is_active', true)
      .select('doctors.*');
  }
};

module.exports = Service;
