exports.up = async function(knex) {
  // Eliminar el indice unico global que bloquea reutilizacion de codigos
  await knex.schema.raw('DROP INDEX IF EXISTS idx_turns_code_date');
  // Crear indice unico parcial: solo para turnos activos
  await knex.schema.raw(`
    CREATE UNIQUE INDEX idx_turns_code_date_active
      ON turns(code)
      WHERE status IN ('CREATED', 'WAITING', 'CALLED', 'IN_SERVICE')
  `);
};

exports.down = async function(knex) {
  await knex.schema.raw('DROP INDEX IF EXISTS idx_turns_code_date_active');
};
