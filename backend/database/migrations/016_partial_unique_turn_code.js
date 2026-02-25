exports.up = async function(knex) {
  await knex.schema.raw('DROP INDEX IF EXISTS idx_turns_code_date');

  // Cancelar turnos activos de dias anteriores (no deberian existir)
  await knex.raw(`
    UPDATE turns SET status = 'CANCELLED'
    WHERE status IN ('CREATED', 'WAITING', 'CALLED', 'IN_SERVICE')
    AND DATE(created_at) < CURRENT_DATE
  `);

  await knex.schema.raw(`
    CREATE UNIQUE INDEX idx_turns_code_date_active
      ON turns(code)
      WHERE status IN ('CREATED', 'WAITING', 'CALLED', 'IN_SERVICE')
  `);
};

exports.down = async function(knex) {
  await knex.schema.raw('DROP INDEX IF EXISTS idx_turns_code_date_active');
};
