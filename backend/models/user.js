const knex = require('knex');
const dbConfig = require('../config/database');
const bcrypt = require('bcryptjs');

const db = knex(dbConfig[process.env.NODE_ENV || 'development']);

const TABLE = 'users';

const User = {
  async findAll(filters = {}) {
    let query = db(TABLE).select('id', 'username', 'email', 'role', 'full_name', 'is_active', 'created_at', 'updated_at');

    if (filters.role) {
      query = query.where('role', filters.role);
    }
    if (filters.is_active !== undefined) {
      query = query.where('is_active', filters.is_active);
    }

    return query.orderBy('created_at', 'desc');
  },

  async findById(id) {
    return db(TABLE)
      .select('id', 'username', 'email', 'role', 'full_name', 'is_active', 'created_at', 'updated_at')
      .where({ id })
      .first();
  },

  async findByUsername(username) {
    return db(TABLE).where({ username }).first();
  },

  async findByEmail(email) {
    return db(TABLE).where({ email }).first();
  },

  async create(userData) {
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(userData.password, saltRounds);

    const [id] = await db(TABLE)
      .insert({
        username: userData.username,
        email: userData.email,
        password_hash,
        role: userData.role || 'capturista',
        full_name: userData.full_name,
        is_active: true
      })
      .returning('id');

    return this.findById(typeof id === 'object' ? id.id : id);
  },

  async update(id, userData) {
    const updateData = {};

    if (userData.username) updateData.username = userData.username;
    if (userData.email) updateData.email = userData.email;
    if (userData.full_name) updateData.full_name = userData.full_name;
    if (userData.role) updateData.role = userData.role;
    if (userData.is_active !== undefined) updateData.is_active = userData.is_active;

    if (userData.password) {
      const saltRounds = 10;
      updateData.password_hash = await bcrypt.hash(userData.password, saltRounds);
    }

    await db(TABLE).where({ id }).update(updateData);

    return this.findById(id);
  },

  async delete(id) {
    return db(TABLE).where({ id }).del();
  },

  async verifyPassword(user, password) {
    return bcrypt.compare(password, user.password_hash);
  }
};

module.exports = User;
