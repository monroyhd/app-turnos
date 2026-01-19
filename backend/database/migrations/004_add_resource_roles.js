exports.up = function(knex) {
  return knex.raw(`
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin_recurso';
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'pan_recurso';
  `);
};

exports.down = function(knex) {
  // PostgreSQL no permite eliminar valores de un ENUM facilmente
  // Se requiere recrear el tipo, lo cual es complejo con datos existentes
  return Promise.resolve();
};
