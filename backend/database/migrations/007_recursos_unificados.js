/**
 * Sistema unificado de gestion de recursos fisicos (consultorios, habitaciones)
 * Crea las tablas: recursos, uso_recursos, historial_recursos
 */
exports.up = function(knex) {
  return knex.schema
    // Tabla 1: Catalogo de recursos fisicos
    .createTable('recursos', table => {
      table.increments('id').primary();
      table.string('nombre', 100).notNullable();           // "Consultorio 101", "Habitación A-205"
      table.string('codigo', 20);                          // "C101", "H-A205"
      table.enum('tipo', ['CONSULTORIO', 'HABITACION']).notNullable();
      table.string('ubicacion', 100).nullable();            // "Piso 1", "Ala Norte"
      table.integer('capacidad').defaultTo(1);
      table.text('descripcion').nullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);

      // Código único por tipo (permite mismo código en diferentes tipos)
      table.unique(['codigo', 'tipo']);
    })
    // Tabla 2: Estado actual - un registro por recurso ocupado
    .createTable('uso_recursos', table => {
      table.increments('id').primary();
      table.integer('recurso_id').unsigned().references('id').inTable('recursos').notNullable();
      table.string('paciente_nombre', 100).notNullable();
      table.string('paciente_apellidos', 100).notNullable();
      table.string('telefono', 20).nullable();
      table.integer('doctor_id').unsigned().references('id').inTable('doctors').nullable();
      table.timestamp('fecha_inicio').defaultTo(knex.fn.now());
      table.enum('estatus', [
        'HOSPITALIZACION',
        'QUIROFANO',
        'RECUPERACION',
        'TERAPIA',
        'URGENCIAS',
        'MANTENIMIENTO',
        'OCUPADO'
      ]).defaultTo('OCUPADO');
      table.text('notas').nullable();
      table.timestamps(true, true);

      // Solo 1 uso activo por recurso
      table.unique(['recurso_id']);
    })
    // Tabla 3: Registro historico permanente
    .createTable('historial_recursos', table => {
      table.increments('id').primary();
      table.integer('recurso_id').unsigned().references('id').inTable('recursos').nullable();
      table.string('recurso_nombre', 100).nullable();       // Desnormalizado para reportes
      table.string('recurso_tipo', 20).nullable();
      table.string('paciente_nombre', 100).notNullable();
      table.string('paciente_apellidos', 100).notNullable();
      table.string('telefono', 20).nullable();
      table.integer('doctor_id').unsigned().references('id').inTable('doctors').nullable();
      table.string('doctor_nombre', 100).nullable();        // Desnormalizado
      table.string('especialidad', 100).nullable();         // Desnormalizado
      table.timestamp('fecha_inicio').notNullable();
      table.timestamp('fecha_fin').notNullable();
      table.integer('duracion_minutos').nullable();         // Calculado automaticamente
      table.string('estatus_final', 50).nullable();         // Estado al liberar
      table.text('notas').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('historial_recursos')
    .dropTableIfExists('uso_recursos')
    .dropTableIfExists('recursos');
};
