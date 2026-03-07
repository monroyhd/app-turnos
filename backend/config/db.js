const knex = require('knex');
const dbConfig = require('./database');

const db = knex(dbConfig[process.env.NODE_ENV || 'development']);

module.exports = db;
