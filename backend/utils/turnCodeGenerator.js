const knex = require('knex');
const dbConfig = require('../config/database');

const db = knex(dbConfig[process.env.NODE_ENV || 'development']);

// Estados activos: turnos que estan en uso y no deben repetir codigo
const ACTIVE_STATUSES = ['CREATED', 'WAITING', 'CALLED', 'IN_SERVICE'];

async function generateTurnCode(serviceId, servicePrefix = 'T') {
  const today = new Date().toISOString().split('T')[0];

  // Contar TODOS los turnos del dia para este servicio (secuencia del dia)
  const totalToday = await db('turns')
    .whereRaw('DATE(created_at) = ?', [today])
    .where('service_id', serviceId)
    .count('id as total')
    .first();

  const nextNumber = (parseInt(totalToday.total) || 0) + 1;

  // Verificar que el codigo no este en uso por un turno activo
  let code = `${servicePrefix}${String(nextNumber).padStart(3, '0')}`;

  const conflict = await db('turns')
    .whereRaw('DATE(created_at) = ?', [today])
    .where('code', code)
    .whereIn('status', ACTIVE_STATUSES)
    .first();

  // Si hay conflicto, buscar el primer numero libre entre los activos
  if (conflict) {
    const activeTurns = await db('turns')
      .whereRaw('DATE(created_at) = ?', [today])
      .where('service_id', serviceId)
      .whereIn('status', ACTIVE_STATUSES)
      .select('code');

    const usedNumbers = new Set();
    for (const turn of activeTurns) {
      const num = parseInt(turn.code.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(num)) usedNumbers.add(num);
    }

    let freeNumber = 1;
    while (usedNumbers.has(freeNumber)) {
      freeNumber++;
    }
    code = `${servicePrefix}${String(freeNumber).padStart(3, '0')}`;
  }

  return code;
}

module.exports = { generateTurnCode };
