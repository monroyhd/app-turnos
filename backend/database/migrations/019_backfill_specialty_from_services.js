/**
 * Backfill: Deriva doctors.specialty desde los servicios asignados en doctor_services.
 * Esto garantiza que los datos existentes sean consistentes después de eliminar
 * el campo Especialidad del formulario de doctor.
 */
exports.up = async function(knex) {
  const doctors = await knex('doctors')
    .where('is_active', true)
    .select('id');

  for (const doctor of doctors) {
    const services = await knex('doctor_services')
      .join('services', 'doctor_services.service_id', 'services.id')
      .where('doctor_services.doctor_id', doctor.id)
      .select('services.name')
      .orderBy('services.name');

    const specialty = services.map(s => s.name).join(', ').substring(0, 100) || null;
    await knex('doctors').where({ id: doctor.id }).update({ specialty });
  }

  const count = doctors.length;
  console.log(`Backfill specialty: ${count} doctores activos actualizados`);
};

exports.down = async function(knex) {
  // No-op: no se puede restaurar el valor original de specialty
};
