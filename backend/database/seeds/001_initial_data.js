const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  // Limpiar tablas (respetando orden de foreign keys)
  await knex('turn_history').del();
  await knex('turn_counters').del();
  await knex('turns').del();
  await knex('patients').del();
  await knex('historial_recursos').del();
  await knex('uso_recursos').del();
  await knex('doctor_services').del();
  await knex('doctors').del();
  await knex('services').del();
  await knex('recursos').del();
  await knex('users').del();

  // Crear usuarios (uno por uno para capturar IDs)
  const passwordHash = await bcrypt.hash('admin123#', 10);

  const [admin] = await knex('users').insert({
    username: 'admin',
    email: 'admin@hospital.local',
    password_hash: passwordHash,
    role: 'admin',
    full_name: 'Administrador del Sistema'
  }).returning('*');

  const [capturista] = await knex('users').insert({
    username: 'capturista1',
    email: 'capturista@hospital.local',
    password_hash: passwordHash,
    role: 'capturista',
    full_name: 'Maria Garcia'
  }).returning('*');

  const [drLopez] = await knex('users').insert({
    username: 'dr.lopez',
    email: 'dr.lopez@hospital.local',
    password_hash: passwordHash,
    role: 'medico',
    full_name: 'Dr. Juan Lopez'
  }).returning('*');

  const [display] = await knex('users').insert({
    username: 'display',
    email: 'display@hospital.local',
    password_hash: passwordHash,
    role: 'display',
    full_name: 'Pantalla Publica'
  }).returning('*');

  // Crear servicios (uno por uno para capturar IDs)
  const [consultaGeneral] = await knex('services').insert({
    name: 'Consulta General',
    code: 'consulta-general',
    prefix: 'A',
    description: 'Consulta medica general',
    estimated_duration: 15
  }).returning('*');

  const [urgencias] = await knex('services').insert({
    name: 'Urgencias',
    code: 'urgencias',
    prefix: 'U',
    description: 'Atencion de urgencias',
    estimated_duration: 30
  }).returning('*');

  const [laboratorio] = await knex('services').insert({
    name: 'Laboratorio',
    code: 'laboratorio',
    prefix: 'L',
    description: 'Estudios de laboratorio',
    estimated_duration: 20
  }).returning('*');

  const [farmacia] = await knex('services').insert({
    name: 'Farmacia',
    code: 'farmacia',
    prefix: 'F',
    description: 'Entrega de medicamentos',
    estimated_duration: 10
  }).returning('*');

  const [rayosX] = await knex('services').insert({
    name: 'Rayos X',
    code: 'rayos-x',
    prefix: 'R',
    description: 'Estudios de rayos X',
    estimated_duration: 25
  }).returning('*');

  const [especialidades] = await knex('services').insert({
    name: 'Especialidades',
    code: 'especialidades',
    prefix: 'E',
    description: 'Consulta con especialista',
    estimated_duration: 30
  }).returning('*');

  // Crear doctores (usando user_id capturado)
  const [doctor1] = await knex('doctors').insert({
    user_id: drLopez.id,
    employee_number: 'EMP001',
    full_name: 'Dr. Juan Lopez',
    specialty: 'Medicina General',
    office_number: '101'
  }).returning('*');

  const [doctor2] = await knex('doctors').insert({
    employee_number: 'EMP002',
    full_name: 'Dra. Ana Martinez',
    specialty: 'Medicina General',
    office_number: '102'
  }).returning('*');

  const [doctor3] = await knex('doctors').insert({
    employee_number: 'EMP003',
    full_name: 'Dr. Carlos Hernandez',
    specialty: 'Urgencias',
    office_number: 'URG-1'
  }).returning('*');

  // Asignar servicios a doctores (usando IDs capturados)
  await knex('doctor_services').insert([
    { doctor_id: doctor1.id, service_id: consultaGeneral.id },
    { doctor_id: doctor2.id, service_id: consultaGeneral.id },
    { doctor_id: doctor3.id, service_id: urgencias.id }
  ]);

  // Crear algunos pacientes de ejemplo (sin IDs manuales)
  await knex('patients').insert([
    { curp: 'GARP850101HDFRRL01', full_name: 'Pedro Garcia Rodriguez', phone: '5551234567', is_preferential: false },
    { curp: 'LOPM900215MDFRRL02', full_name: 'Maria Lopez Perez', phone: '5557654321', is_preferential: true },
    { full_name: 'Jose Sanchez (sin CURP)', phone: '5559876543', is_preferential: false }
  ]);

  console.log('\n--- Seed completado exitosamente ---');
  console.log(`Usuarios creados: ${admin.id}, ${capturista.id}, ${drLopez.id}, ${display.id}`);
  console.log(`Servicios creados: ${consultaGeneral.id}, ${urgencias.id}, ${laboratorio.id}, ${farmacia.id}, ${rayosX.id}, ${especialidades.id}`);
  console.log(`Doctores creados: ${doctor1.id}, ${doctor2.id}, ${doctor3.id}`);
};
