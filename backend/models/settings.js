const knex = require('knex');
const dbConfig = require('../config/database');

const db = knex(dbConfig[process.env.NODE_ENV || 'development']);

const TABLE = 'system_settings';

const Settings = {
  async getSettings() {
    // Always get the first (and only) row
    let settings = await db(TABLE).where({ id: 1 }).first();

    // If no settings exist, create default
    if (!settings) {
      await db(TABLE).insert({
        hospital_name: 'Hospital General',
        logo_path: null,
        background_path: null
      });
      settings = await db(TABLE).where({ id: 1 }).first();
    }

    return settings;
  },

  async updateSettings(data) {
    const updateData = {};

    if (data.hospital_name !== undefined) {
      updateData.hospital_name = data.hospital_name;
    }
    if (data.logo_path !== undefined) {
      updateData.logo_path = data.logo_path;
    }
    if (data.background_path !== undefined) {
      updateData.background_path = data.background_path;
    }

    // Ensure a row exists
    const existing = await db(TABLE).where({ id: 1 }).first();
    if (!existing) {
      await db(TABLE).insert({
        hospital_name: data.hospital_name || 'Hospital General',
        logo_path: data.logo_path || null,
        background_path: data.background_path || null
      });
    } else {
      await db(TABLE).where({ id: 1 }).update(updateData);
    }

    return this.getSettings();
  }
};

module.exports = Settings;
