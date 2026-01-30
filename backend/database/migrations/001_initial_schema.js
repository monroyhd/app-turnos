exports.up = function(knex) {
  return knex.schema
    // Users table
    .createTable('users', (table) => {
      table.increments('id').primary();
      table.string('username', 50).unique().notNullable();
      table.string('email', 100).unique().notNullable();
      table.string('password_hash', 255).notNullable();
      table.enu('role', ['admin', 'capturista', 'medico', 'display']).defaultTo('capturista');
      table.string('full_name', 100);
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    })
    // Services table
    .createTable('services', (table) => {
      table.increments('id').primary();
      table.string('name', 100).notNullable();
      table.string('code', 20).unique().notNullable();
      table.string('prefix', 1).defaultTo('T');
      table.text('description');
      table.integer('estimated_duration').defaultTo(15);
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    })
    // Doctors table
    .createTable('doctors', (table) => {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('users');
      table.string('employee_number', 50).unique();
      table.string('full_name', 100).notNullable();
      table.string('specialty', 100);
      table.string('office_number', 20);
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    })
    // Doctor-Services junction table
    .createTable('doctor_services', (table) => {
      table.integer('doctor_id').references('id').inTable('doctors').onDelete('CASCADE');
      table.integer('service_id').references('id').inTable('services').onDelete('CASCADE');
      table.primary(['doctor_id', 'service_id']);
    })
    // Patients table
    .createTable('patients', (table) => {
      table.increments('id').primary();
      table.string('curp', 18).unique();
      table.string('full_name', 100).notNullable();
      table.date('birth_date');
      table.string('phone', 20);
      table.string('email', 100);
      table.text('address');
      table.boolean('is_preferential').defaultTo(false);
      table.text('notes');
      table.timestamps(true, true);
    })
    // Turns table
    .createTable('turns', (table) => {
      table.increments('id').primary();
      table.string('code', 10).notNullable();
      table.integer('patient_id').references('id').inTable('patients');
      table.integer('service_id').references('id').inTable('services');
      table.integer('doctor_id').references('id').inTable('doctors');
      table.enu('status', ['CREATED', 'WAITING', 'CALLED', 'IN_SERVICE', 'DONE', 'NO_SHOW', 'CANCELLED']).defaultTo('CREATED');
      table.integer('priority').defaultTo(0);
      table.text('notes');
      table.timestamp('waiting_at');
      table.timestamp('called_at');
      table.timestamp('service_started_at');
      table.timestamp('finished_at');
      table.integer('created_by').references('id').inTable('users');
      table.timestamps(true, true);
    })
    // Turn history table
    .createTable('turn_history', (table) => {
      table.increments('id').primary();
      table.integer('turn_id').references('id').inTable('turns').onDelete('CASCADE');
      table.enu('previous_status', ['CREATED', 'WAITING', 'CALLED', 'IN_SERVICE', 'DONE', 'NO_SHOW', 'CANCELLED']);
      table.enu('new_status', ['CREATED', 'WAITING', 'CALLED', 'IN_SERVICE', 'DONE', 'NO_SHOW', 'CANCELLED']).notNullable();
      table.integer('changed_by').references('id').inTable('users');
      table.text('notes');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    // Turn counters table
    .createTable('turn_counters', (table) => {
      table.increments('id').primary();
      table.integer('service_id').references('id').inTable('services');
      table.date('counter_date').defaultTo(knex.fn.now());
      table.integer('last_number').defaultTo(0);
      table.unique(['service_id', 'counter_date']);
    })
    // Create indexes
    .then(() => knex.schema.raw('CREATE INDEX idx_turns_status ON turns(status)'))
    .then(() => knex.schema.raw('CREATE INDEX idx_turns_created_at ON turns(created_at)'))
    .then(() => knex.schema.raw('CREATE INDEX idx_turns_doctor_id ON turns(doctor_id)'))
    .then(() => knex.schema.raw('CREATE INDEX idx_turns_service_id ON turns(service_id)'))
    .then(() => knex.schema.raw('CREATE UNIQUE INDEX idx_turns_code_date ON turns(code, ((created_at AT TIME ZONE $$UTC$$)::date))'));
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('turn_history')
    .dropTableIfExists('turn_counters')
    .dropTableIfExists('turns')
    .dropTableIfExists('patients')
    .dropTableIfExists('doctor_services')
    .dropTableIfExists('doctors')
    .dropTableIfExists('services')
    .dropTableIfExists('users');
};
