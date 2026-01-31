/**
 * Migración: Cambiar restricción unique de recursos
 *
 * Antes: codigo era único globalmente
 * Después: codigo es único por tipo (permite mismo código en HABITACION y CONSULTORIO)
 */
exports.up = async function(knex) {
  // Verificar si existe la restricción antigua y eliminarla
  const oldConstraint = await knex.raw(`
    SELECT 1 FROM pg_constraint
    WHERE conname = 'recursos_codigo_unique'
  `);

  if (oldConstraint.rows.length > 0) {
    await knex.raw('ALTER TABLE recursos DROP CONSTRAINT recursos_codigo_unique');
  }

  // Verificar si ya existe la nueva restricción
  const newConstraint = await knex.raw(`
    SELECT 1 FROM pg_constraint
    WHERE conname = 'recursos_codigo_tipo_unique'
  `);

  // Solo crear si no existe
  if (newConstraint.rows.length === 0) {
    await knex.raw('ALTER TABLE recursos ADD CONSTRAINT recursos_codigo_tipo_unique UNIQUE (codigo, tipo)');
  }
};

exports.down = async function(knex) {
  // Verificar si existe la restricción nueva y eliminarla
  const newConstraint = await knex.raw(`
    SELECT 1 FROM pg_constraint
    WHERE conname = 'recursos_codigo_tipo_unique'
  `);

  if (newConstraint.rows.length > 0) {
    await knex.raw('ALTER TABLE recursos DROP CONSTRAINT recursos_codigo_tipo_unique');
  }

  // Verificar si ya existe la restricción antigua
  const oldConstraint = await knex.raw(`
    SELECT 1 FROM pg_constraint
    WHERE conname = 'recursos_codigo_unique'
  `);

  // Solo crear si no existe (y si no hay duplicados)
  if (oldConstraint.rows.length === 0) {
    await knex.raw('ALTER TABLE recursos ADD CONSTRAINT recursos_codigo_unique UNIQUE (codigo)');
  }
};
