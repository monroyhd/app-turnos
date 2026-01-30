/**
 * Migracion de datos de hospitalizaciones al nuevo sistema de recursos unificados
 * 1. Crea recursos desde habitaciones unicas
 * 2. Migra registros activos a uso_recursos
 * 3. Migra registros historicos a historial_recursos
 */
exports.up = async function(knex) {
  // Verificar si hay datos en hospitalizaciones
  const hospitalizaciones = await knex('hospitalizaciones').select('*');

  if (hospitalizaciones.length === 0) {
    console.log('No hay hospitalizaciones para migrar');
    return;
  }

  // 1. Crear recursos desde habitaciones unicas
  const habitacionesUnicas = [...new Set(hospitalizaciones.map(h => h.habitacion))];

  for (const habitacion of habitacionesUnicas) {
    // Verificar si ya existe el recurso
    const existe = await knex('recursos').where('codigo', habitacion).first();
    if (!existe) {
      await knex('recursos').insert({
        nombre: `Habitación ${habitacion}`,
        codigo: habitacion,
        tipo: 'HABITACION',
        ubicacion: null,
        capacidad: 1,
        descripcion: 'Migrado desde hospitalizaciones',
        is_active: true
      });
    }
  }

  // Obtener mapa de recursos creados
  const recursos = await knex('recursos').whereIn('codigo', habitacionesUnicas);
  const recursoMap = {};
  recursos.forEach(r => {
    recursoMap[r.codigo] = r;
  });

  // Obtener doctores para desnormalizacion
  const doctores = await knex('doctors').select('*');
  const doctorMap = {};
  doctores.forEach(d => {
    doctorMap[d.id] = d;
  });

  // 2. Migrar registros activos (que no sean EGRESO ni DESOCUPADA) a uso_recursos
  const activos = hospitalizaciones.filter(h =>
    h.is_active === true &&
    h.estatus !== 'EGRESO' &&
    h.estatus !== 'DESOCUPADA'
  );

  for (const hosp of activos) {
    const recurso = recursoMap[hosp.habitacion];
    if (!recurso) continue;

    // Verificar si ya existe un uso para este recurso
    const usoExiste = await knex('uso_recursos').where('recurso_id', recurso.id).first();
    if (!usoExiste) {
      // Mapear estatus - 'DESOCUPADA' no aplica aqui
      const estatus = hosp.estatus === 'EGRESO' ? 'OCUPADO' : hosp.estatus;

      await knex('uso_recursos').insert({
        recurso_id: recurso.id,
        paciente_nombre: hosp.paciente_nombre,
        paciente_apellidos: hosp.paciente_apellidos,
        telefono: hosp.telefono,
        doctor_id: hosp.doctor_id,
        fecha_inicio: hosp.fecha_ingreso,
        estatus: estatus,
        notas: hosp.notas
      });
    }
  }

  // 3. Migrar registros historicos (EGRESO, DESOCUPADA o is_active=false) a historial_recursos
  const historicos = hospitalizaciones.filter(h =>
    h.is_active === false ||
    h.estatus === 'EGRESO' ||
    h.estatus === 'DESOCUPADA'
  );

  for (const hosp of historicos) {
    const recurso = recursoMap[hosp.habitacion];
    const doctor = hosp.doctor_id ? doctorMap[hosp.doctor_id] : null;

    // Calcular duracion si hay fecha_egreso
    let duracionMinutos = null;
    const fechaFin = hosp.fecha_egreso || hosp.updated_at || new Date();
    if (hosp.fecha_ingreso && fechaFin) {
      const inicio = new Date(hosp.fecha_ingreso);
      const fin = new Date(fechaFin);
      duracionMinutos = Math.round((fin - inicio) / (1000 * 60));
    }

    await knex('historial_recursos').insert({
      recurso_id: recurso ? recurso.id : null,
      recurso_nombre: recurso ? recurso.nombre : `Habitación ${hosp.habitacion}`,
      recurso_tipo: 'HABITACION',
      paciente_nombre: hosp.paciente_nombre,
      paciente_apellidos: hosp.paciente_apellidos,
      telefono: hosp.telefono,
      doctor_id: hosp.doctor_id,
      doctor_nombre: doctor ? doctor.full_name : null,
      especialidad: doctor ? doctor.specialty : null,
      fecha_inicio: hosp.fecha_ingreso,
      fecha_fin: fechaFin,
      duracion_minutos: duracionMinutos,
      estatus_final: hosp.estatus,
      notas: hosp.notas
    });
  }

  console.log(`Migracion completada: ${habitacionesUnicas.length} recursos, ${activos.length} activos, ${historicos.length} historicos`);
};

exports.down = async function(knex) {
  // No eliminar los recursos creados, ya que podrian tener nuevos datos
  // Solo limpiar lo que claramente fue migrado
  console.log('Rollback: Los datos migrados permaneceran en las nuevas tablas');
};
