const knex = require('knex');
const dbConfig = require('../config/database');

const db = knex(dbConfig[process.env.NODE_ENV || 'development']);

async function generateTurnCode(serviceId, servicePrefix = 'T') {
  const today = new Date().toISOString().split('T')[0];

  // Intentar obtener o crear el contador para este servicio/dia
  let counter = await db('turn_counters')
    .where({
      service_id: serviceId,
      counter_date: today
    })
    .first();

  if (!counter) {
    // Crear nuevo contador para hoy
    try {
      await db('turn_counters').insert({
        service_id: serviceId,
        counter_date: today,
        last_number: 0
      });
      counter = { last_number: 0 };
    } catch (err) {
      // En caso de conflicto, otro proceso lo creo primero
      counter = await db('turn_counters')
        .where({
          service_id: serviceId,
          counter_date: today
        })
        .first();
    }
  }

  // Incrementar contador atomicamente
  const nextNumber = counter.last_number + 1;

  await db('turn_counters')
    .where({
      service_id: serviceId,
      counter_date: today
    })
    .update({ last_number: nextNumber });

  // Formatear codigo: A001, U002, etc.
  const code = `${servicePrefix}${String(nextNumber).padStart(3, '0')}`;

  return code;
}

module.exports = { generateTurnCode };
