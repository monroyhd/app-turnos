/**
 * Asigna el servicio "Consulta General" (service_id=7) a todos los doctores activos
 * que no tengan servicios asignados en doctor_services.
 * Esto corrige el problema donde los turnos sin doctor no aparecen en el tablero
 * porque getUnassignedForDoctor() retorna [] cuando el doctor no tiene servicios.
 */
exports.up = async function(knex) {
  // Obtener doctores activos que NO tienen ningún servicio asignado
  const doctorsWithoutServices = await knex('doctors')
    .where('doctors.is_active', true)
    .whereNotExists(
      knex('doctor_services')
        .whereRaw('doctor_services.doctor_id = doctors.id')
    )
    .select('doctors.id');

  if (doctorsWithoutServices.length === 0) return;

  // Verificar que el servicio "Consulta General" (id=7) existe
  const consultaGeneral = await knex('services').where({ id: 7 }).first();
  if (!consultaGeneral) {
    console.warn('Servicio id=7 (Consulta General) no encontrado, saltando migración');
    return;
  }

  // Insertar relación doctor_services para cada doctor activo sin servicios
  const inserts = doctorsWithoutServices.map(d => ({
    doctor_id: d.id,
    service_id: 7
  }));

  await knex('doctor_services').insert(inserts);
  console.log(`Asignado "Consulta General" a ${inserts.length} doctores: IDs ${doctorsWithoutServices.map(d => d.id).join(', ')}`);
};

exports.down = async function(knex) {
  // Remover las asignaciones creadas por esta migración
  // Solo remueve service_id=7 de doctores que SOLO tienen ese servicio
  const doctorsWithOnlyConsultaGeneral = await knex('doctor_services')
    .select('doctor_id')
    .groupBy('doctor_id')
    .havingRaw('COUNT(*) = 1')
    .whereIn('doctor_id', function() {
      this.select('doctor_id').from('doctor_services').where('service_id', 7);
    });

  if (doctorsWithOnlyConsultaGeneral.length > 0) {
    const ids = doctorsWithOnlyConsultaGeneral.map(d => d.doctor_id);
    await knex('doctor_services')
      .whereIn('doctor_id', ids)
      .where('service_id', 7)
      .del();
  }
};
