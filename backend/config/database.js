require('dotenv').config();

// Configuración de SSL para PostgreSQL
// DB_SSL=true  -> habilita SSL (para servicios cloud como Heroku, AWS RDS)
// DB_SSL=false -> deshabilita SSL (para Docker o desarrollo local)
const sslConfig = process.env.DB_SSL === 'true'
  ? { rejectUnauthorized: false }
  : false;

const baseConfig = {
  client: 'postgresql',
  pool: {
    min: 2,
    max: 10
  },
  migrations: {
    directory: './database/migrations',
    tableName: 'knex_migrations'
  },
  seeds: {
    directory: './database/seeds'
  }
};

module.exports = {
  development: {
    ...baseConfig,
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'app_turnos',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password'
    }
  },

  production: {
    ...baseConfig,
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: sslConfig
    }
  },

  // Configuración específica para Docker (sin SSL)
  docker: {
    ...baseConfig,
    connection: {
      host: process.env.DB_HOST || 'postgres',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'app_turnos',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      ssl: false
    }
  }
};
