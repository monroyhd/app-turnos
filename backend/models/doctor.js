const knex = require('knex');
const dbConfig = require('../config/database');

const db = knex(dbConfig[process.env.NODE_ENV || 'development']);

const TABLE = 'doctors';

const Doctor = {
  async findAll(filters = {}) {
    let query = db(TABLE)
      .select('doctors.*', 'users.username')
      .leftJoin('users', 'doctors.user_id', 'users.id');

    if (filters.is_active !== undefined) {
      query = query.where('doctors.is_active', filters.is_active);
    }

    if (filters.specialty) {
      query = query.where('specialty', 'ilike', `%${filters.specialty}%`);
    }

    if (filters.service_id) {
      query = query
        .join('doctor_services', 'doctors.id', 'doctor_services.doctor_id')
        .where('doctor_services.service_id', filters.service_id);
    }

    return query.orderBy('doctors.full_name', 'asc');
  },

  async findById(id) {
    const doctor = await db(TABLE).where({ id }).first();

    if (doctor) {
      doctor.services = await db('doctor_services')
        .join('services', 'doctor_services.service_id', 'services.id')
        .where('doctor_services.doctor_id', id)
        .select('services.*');
    }

    return doctor;
  },

  async findByUserId(userId) {
    return db(TABLE).where({ user_id: userId }).first();
  },

  async findByEmployeeNumber(employeeNumber) {
    return db(TABLE).where({ employee_number: employeeNumber }).first();
  },

  async create(doctorData) {
    const [id] = await db(TABLE)
      .insert({
        user_id: doctorData.user_id,
        full_name: doctorData.full_name,
        specialty: doctorData.specialty,
        email: doctorData.email,
        phone: doctorData.phone,
        is_active: true
      })
      .returning('id');

    const doctorId = typeof id === 'object' ? id.id : id;

    if (doctorData.service_ids && doctorData.service_ids.length > 0) {
      await this.setServices(doctorId, doctorData.service_ids);
    }

    return this.findById(doctorId);
  },

  async update(id, doctorData) {
    const updateData = {};

    if (doctorData.full_name) updateData.full_name = doctorData.full_name;
    if (doctorData.specialty !== undefined) updateData.specialty = doctorData.specialty;
    if (doctorData.email !== undefined) updateData.email = doctorData.email;
    if (doctorData.phone !== undefined) updateData.phone = doctorData.phone;
    if (doctorData.is_active !== undefined) updateData.is_active = doctorData.is_active;

    await db(TABLE).where({ id }).update(updateData);

    if (doctorData.service_ids) {
      await this.setServices(id, doctorData.service_ids);
    }

    return this.findById(id);
  },

  async setServices(doctorId, serviceIds) {
    await db('doctor_services').where({ doctor_id: doctorId }).del();

    if (serviceIds.length > 0) {
      const inserts = serviceIds.map(serviceId => ({
        doctor_id: doctorId,
        service_id: serviceId
      }));
      await db('doctor_services').insert(inserts);
    }
  },

  async delete(id) {
    return db(TABLE).where({ id }).update({ is_active: false });
  }
};

module.exports = Doctor;
