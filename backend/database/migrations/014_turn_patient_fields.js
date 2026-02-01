/**
 * Migración: Agregar campos de paciente directamente en turnos
 *
 * Permite crear turnos sin paciente registrado, solo con nombre y teléfono
 */

exports.up = function(knex) {
  return knex.schema.alterTable('turns', function(table) {
    // Campos para cuando no hay paciente registrado
    table.string('patient_name', 100).nullable();
    table.string('patient_phone', 20).nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('turns', function(table) {
    table.dropColumn('patient_name');
    table.dropColumn('patient_phone');
  });
};
