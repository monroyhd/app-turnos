/**
 * Sincroniza todas las secuencias de PostgreSQL
 *
 * Problema: Cuando se insertan datos con IDs específicos (como en seeds),
 * PostgreSQL no actualiza automáticamente la secuencia del auto-increment.
 * Al crear nuevos registros, la secuencia devuelve un ID que ya existe,
 * causando errores de "llave duplicada" o "recurso duplicado".
 *
 * Solución: Ajustar cada secuencia al valor máximo actual de la columna id.
 *
 * Uso: npm run sync-sequences
 *      o directamente: node database/sync-sequences.js
 */

const knex = require('knex');
const config = require('../config/database');

// Tablas con columnas id auto-increment que necesitan sincronización
const TABLES_WITH_SEQUENCES = [
  'users',
  'doctors',
  'patients',
  'services',
  'turns',
  'turn_counters',
  'turn_history',
  'hospitalizaciones',
  'recursos',
  'uso_recursos',
  'historial_recursos',
  'system_settings'
];

async function syncSequences(db) {
  console.log('Sincronizando secuencias de PostgreSQL...\n');

  const results = [];

  for (const table of TABLES_WITH_SEQUENCES) {
    try {
      // Verificar si la tabla existe
      const tableExists = await db.schema.hasTable(table);
      if (!tableExists) {
        console.log(`  ⏭  ${table}: tabla no existe, omitiendo`);
        continue;
      }

      // Verificar si la columna id existe
      const hasIdColumn = await db.schema.hasColumn(table, 'id');
      if (!hasIdColumn) {
        console.log(`  ⏭  ${table}: no tiene columna 'id', omitiendo`);
        continue;
      }

      // Nombre de la secuencia en PostgreSQL (convención: tabla_id_seq)
      const sequenceName = `${table}_id_seq`;

      // Obtener el valor máximo actual de id
      const maxResult = await db(table).max('id as max_id').first();
      const maxId = maxResult?.max_id || 0;

      // Ajustar la secuencia al valor máximo + 1
      // setval con true como tercer parámetro hace que el próximo nextval devuelva maxId + 1
      await db.raw(`SELECT setval('${sequenceName}', GREATEST(?, 1), true)`, [maxId]);

      console.log(`  ✓  ${table}: secuencia ajustada a ${maxId}`);
      results.push({ table, maxId, status: 'ok' });

    } catch (error) {
      // Si la secuencia no existe, puede ser una tabla sin auto-increment
      if (error.message.includes('does not exist')) {
        console.log(`  ⏭  ${table}: secuencia no existe, omitiendo`);
        results.push({ table, status: 'skipped', reason: 'no sequence' });
      } else {
        console.error(`  ✗  ${table}: error - ${error.message}`);
        results.push({ table, status: 'error', error: error.message });
      }
    }
  }

  console.log('\n✓ Sincronización de secuencias completada');
  return results;
}

// Función exportable para usar desde otros scripts (ej: seeds)
async function syncSequencesWithKnex(knexInstance) {
  return syncSequences(knexInstance);
}

// Ejecución directa desde línea de comandos
async function main() {
  const env = process.env.NODE_ENV || 'development';
  const dbConfig = config[env] || config.development;

  console.log(`Ambiente: ${env}`);
  console.log(`Base de datos: ${dbConfig.connection.database || dbConfig.connection}\n`);

  const db = knex(dbConfig);

  try {
    await syncSequences(db);
  } finally {
    await db.destroy();
  }
}

// Si se ejecuta directamente (no como módulo)
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { syncSequences, syncSequencesWithKnex };
