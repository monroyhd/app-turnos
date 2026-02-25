exports.up = function(knex) {
  return knex.schema.alterTable('services', (table) => {
    table.string('prefix', 5).defaultTo('T').alter();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('services', (table) => {
    table.string('prefix', 1).defaultTo('T').alter();
  });
};
