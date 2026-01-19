/**
 * Agrega campos tipo y categoria a la tabla services
 * - tipo: 'servicio' | 'recurso' para clasificar servicios
 * - categoria: texto libre para agrupar servicios
 */
exports.up = function(knex) {
  return knex.schema.alterTable('services', table => {
    table.enum('tipo', ['servicio', 'recurso']).defaultTo('servicio');
    table.string('categoria', 50).nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('services', table => {
    table.dropColumn('tipo');
    table.dropColumn('categoria');
  });
};
