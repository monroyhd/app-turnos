/**
 * Migration: Add email and phone fields to doctors table
 * These replace the office_number and employee_number fields in the UI
 */
exports.up = function(knex) {
  return knex.schema.alterTable('doctors', (table) => {
    table.string('email', 100);
    table.string('phone', 20);
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('doctors', (table) => {
    table.dropColumn('email');
    table.dropColumn('phone');
  });
};
