/**
 * Sincroniza el full_name de usuarios con el de sus doctores activos
 *
 * Problema: Cuando se reutiliza un user_id o se actualiza el nombre del doctor,
 * el full_name en la tabla users puede quedar desactualizado.
 *
 * Uso: node database/sync-doctor-names.js
 */

const knex = require('knex');
const config = require('../config/database');

async function syncDoctorNames(db) {
  console.log('Buscando desfaces entre doctors.full_name y users.full_name...\n');

  const mismatches = await db('doctors')
    .select('doctors.id as doctor_id', 'doctors.full_name as doctor_name',
            'doctors.user_id', 'users.full_name as user_name', 'users.username')
    .leftJoin('users', 'doctors.user_id', 'users.id')
    .where('doctors.is_active', true)
    .whereNotNull('doctors.user_id')
    .whereRaw('doctors.full_name != users.full_name');

  if (mismatches.length === 0) {
    console.log('Todos los nombres estan sincronizados.');
    return [];
  }

  console.log(`Encontrados ${mismatches.length} desfase(s):\n`);

  for (const row of mismatches) {
    await db('users').where({ id: row.user_id }).update({ full_name: row.doctor_name });

    console.log(`  ✓  User ${row.user_id} (${row.username}):`);
    console.log(`      "${row.user_name}" -> "${row.doctor_name}"`);
  }

  console.log(`\n✓ Sincronizacion completada: ${mismatches.length} usuario(s) actualizados`);
  return mismatches;
}

async function main() {
  const env = process.env.NODE_ENV || 'development';
  const dbConfig = config[env] || config.development;

  console.log(`Ambiente: ${env}`);
  console.log(`Base de datos: ${dbConfig.connection.database || dbConfig.connection}\n`);

  const db = knex(dbConfig);

  try {
    await syncDoctorNames(db);
  } finally {
    await db.destroy();
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { syncDoctorNames };
