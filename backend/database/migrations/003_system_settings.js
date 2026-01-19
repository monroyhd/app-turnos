exports.up = function(knex) {
  return knex.schema.createTable('system_settings', (table) => {
    table.increments('id').primary();
    table.string('hospital_name', 255).defaultTo('Hospital General');
    table.string('logo_path', 500);
    table.string('background_path', 500);
    table.timestamps(true, true);
  }).then(() => {
    // Insert default row
    return knex('system_settings').insert({
      hospital_name: 'Hospital General',
      logo_path: null,
      background_path: null
    });
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('system_settings');
};
