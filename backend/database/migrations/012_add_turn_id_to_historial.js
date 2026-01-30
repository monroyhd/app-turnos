exports.up = function(knex) {
  return knex.schema.alterTable('historial_recursos', table => {
    table.integer('turn_id').unsigned().nullable();
    table.foreign('turn_id').references('id').inTable('turns').onDelete('SET NULL');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('historial_recursos', table => {
    table.dropForeign(['turn_id']);
    table.dropColumn('turn_id');
  });
};
