/**
 * Tabla para gestionar hospitalizaciones y asignacion de habitaciones
 * Incluye datos del paciente, doctor responsable, fechas y estatus
 */
exports.up = function(knex) {
  return knex.schema.createTable('hospitalizaciones', table => {
    table.increments('id').primary();

    // Datos del paciente
    table.string('paciente_nombre', 100).notNullable();
    table.string('paciente_apellidos', 100).notNullable();
    table.string('telefono', 20).nullable();

    // Habitacion y doctor
    table.string('habitacion', 20).notNullable();
    table.integer('doctor_id').unsigned().references('id').inTable('doctors').nullable();

    // Fechas
    table.timestamp('fecha_ingreso').defaultTo(knex.fn.now());
    table.timestamp('fecha_egreso').nullable();

    // Estatus
    table.enum('estatus', [
      'HOSPITALIZACION',
      'QUIROFANO',
      'RECUPERACION',
      'EGRESO',
      'TERAPIA',
      'URGENCIAS',
      'MANTENIMIENTO',
      'DESOCUPADA'
    ]).defaultTo('HOSPITALIZACION');

    // Notas adicionales
    table.text('notas').nullable();

    // Control
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('hospitalizaciones');
};
