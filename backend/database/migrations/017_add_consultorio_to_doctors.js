exports.up = function(knex) {
  return knex.schema.alterTable('doctors', (table) => {
    table.integer('consultorio_id').unsigned().nullable()
      .references('id').inTable('recursos')
      .onDelete('SET NULL');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('doctors', (table) => {
    table.dropColumn('consultorio_id');
  });
};
