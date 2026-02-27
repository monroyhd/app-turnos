/**
 * Limpieza de usuarios inactivos en produccion
 *
 * Problema: Medicos borrados ANTES del fix que renombra username/email
 * conservan sus credenciales originales. El constraint UNIQUE global
 * en la BD bloquea la re-creacion de medicos con el mismo email/username.
 *
 * Solucion: Renombrar username/email de usuarios inactivos que aun
 * tienen valores originales (sin prefijo "deleted_").
 *
 * Uso: node database/cleanup-inactive-users.js
 */

const knex = require('knex');
const config = require('../config/database');

async function cleanupInactiveUsers(db) {
  console.log('Buscando usuarios inactivos con username/email sin limpiar...\n');

  const inactiveUsers = await db('users')
    .where({ is_active: false })
    .whereNot('username', 'like', 'deleted_%')
    .orWhere(function() {
      this.where({ is_active: false })
        .whereNot('email', 'like', 'deleted_%');
    })
    .select('id', 'username', 'email', 'full_name');

  if (inactiveUsers.length === 0) {
    console.log('No se encontraron usuarios inactivos que necesiten limpieza.');
    return [];
  }

  console.log(`Encontrados ${inactiveUsers.length} usuario(s) inactivo(s) por limpiar:\n`);

  const results = [];

  for (const user of inactiveUsers) {
    const timestamp = Date.now();
    const changes = {};

    if (!user.username.startsWith('deleted_')) {
      changes.username = `deleted_${timestamp}_${user.id}`;
    }
    if (!user.email.startsWith('deleted_')) {
      changes.email = `deleted_${timestamp}_${user.id}@deleted.local`;
    }

    if (Object.keys(changes).length > 0) {
      await db('users').where({ id: user.id }).update(changes);

      const detail = {
        id: user.id,
        full_name: user.full_name,
        old_username: user.username,
        old_email: user.email,
        ...changes
      };

      console.log(`  ✓  ID ${user.id} (${user.full_name}):`);
      if (changes.username) {
        console.log(`      username: ${user.username} -> ${changes.username}`);
      }
      if (changes.email) {
        console.log(`      email: ${user.email} -> ${changes.email}`);
      }

      results.push(detail);
    }
  }

  console.log(`\n✓ Limpieza completada: ${results.length} usuario(s) actualizados`);
  return results;
}

async function main() {
  const env = process.env.NODE_ENV || 'development';
  const dbConfig = config[env] || config.development;

  console.log(`Ambiente: ${env}`);
  console.log(`Base de datos: ${dbConfig.connection.database || dbConfig.connection}\n`);

  const db = knex(dbConfig);

  try {
    await cleanupInactiveUsers(db);
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

module.exports = { cleanupInactiveUsers };
