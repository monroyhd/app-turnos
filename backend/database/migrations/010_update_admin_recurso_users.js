/**
 * Migration: Actualizar usuarios admin_recurso a admin_habitaciones
 *
 * Migra usuarios existentes con rol admin_recurso al nuevo rol admin_habitaciones.
 */

exports.up = function(knex) {
  return knex('users')
    .where('role', 'admin_recurso')
    .update({ role: 'admin_habitaciones' });
};

exports.down = function(knex) {
  return knex('users')
    .where('role', 'admin_habitaciones')
    .update({ role: 'admin_recurso' });
};
