const knex = require('knex');
const dbConfig = require('../config/database');

const db = knex(dbConfig[process.env.NODE_ENV || 'development']);

const TABLE = 'patients';

const Patient = {
  async findAll(filters = {}) {
    let query = db(TABLE).select('*');

    if (filters.search) {
      query = query.where(function() {
        this.where('full_name', 'ilike', `%${filters.search}%`)
          .orWhere('curp', 'ilike', `%${filters.search}%`);
      });
    }

    if (filters.is_preferential !== undefined) {
      query = query.where('is_preferential', filters.is_preferential);
    }

    return query.orderBy('created_at', 'desc');
  },

  async findById(id) {
    return db(TABLE).where({ id }).first();
  },

  async findByCurp(curp) {
    return db(TABLE).where({ curp }).first();
  },

  async create(patientData) {
    const [id] = await db(TABLE)
      .insert({
        curp: patientData.curp,
        full_name: patientData.full_name,
        birth_date: patientData.birth_date,
        phone: patientData.phone,
        email: patientData.email,
        address: patientData.address,
        is_preferential: patientData.is_preferential || false,
        notes: patientData.notes
      })
      .returning('id');

    return this.findById(typeof id === 'object' ? id.id : id);
  },

  async update(id, patientData) {
    const updateData = {};

    if (patientData.curp) updateData.curp = patientData.curp;
    if (patientData.full_name) updateData.full_name = patientData.full_name;
    if (patientData.birth_date) updateData.birth_date = patientData.birth_date;
    if (patientData.phone !== undefined) updateData.phone = patientData.phone;
    if (patientData.email !== undefined) updateData.email = patientData.email;
    if (patientData.address !== undefined) updateData.address = patientData.address;
    if (patientData.is_preferential !== undefined) updateData.is_preferential = patientData.is_preferential;
    if (patientData.notes !== undefined) updateData.notes = patientData.notes;

    await db(TABLE).where({ id }).update(updateData);

    return this.findById(id);
  },

  async delete(id) {
    return db(TABLE).where({ id }).del();
  }
};

module.exports = Patient;
