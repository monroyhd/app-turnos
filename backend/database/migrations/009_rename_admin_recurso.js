/**
 * Migration: Agregar rol admin_habitaciones
 *
 * Agrega el nuevo rol admin_habitaciones al enum user_role y migra usuarios
 * existentes con rol admin_recurso al nuevo rol.
 *
 * NOTA: PostgreSQL requiere que el ALTER TYPE para agregar valores de enum
 * se ejecute fuera de una transaccion, o que se haga commit antes de usar
 * el nuevo valor. Por eso usamos knex.raw con el flag para no transaccionar.
 */

exports.up = async function(knex) {
  // Agregar el nuevo valor al enum (esto requiere estar fuera de transaccion)
  await knex.raw(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin_habitaciones';`);
};

exports.down = function(knex) {
  // PostgreSQL no permite eliminar valores de ENUM facilmente,
  // solo revertimos los usuarios al rol anterior
  return knex('users')
    .where('role', 'admin_habitaciones')
    .update({ role: 'admin_recurso' });
};

// Ejecutar fuera de transaccion para que el ALTER TYPE funcione
exports.config = { transaction: false };
