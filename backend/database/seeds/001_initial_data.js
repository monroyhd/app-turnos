const bcrypt = require('bcryptjs');
const { syncSequencesWithKnex } = require('../sync-sequences');

exports.seed = async function(knex) {
  // Limpiar tablas
  await knex('turn_history').del();
  await knex('turn_counters').del();
  await knex('turns').del();
  await knex('patients').del();
  await knex('doctor_services').del();
  await knex('doctors').del();
  await knex('services').del();
  await knex('users').del();

  // Crear usuarios
  const passwordHash = await bcrypt.hash('admin123#', 10);

  await knex('users').insert([
    {
      id: 1,
      username: 'admin',
      email: 'admin@hospital.local',
      password_hash: passwordHash,
      role: 'admin',
      full_name: 'Administrador del Sistema'
    },
    {
      id: 2,
      username: 'capturista1',
      email: 'capturista@hospital.local',
      password_hash: passwordHash,
      role: 'capturista',
      full_name: 'Maria Garcia'
    },
    {
      id: 3,
      username: 'dr.lopez',
      email: 'dr.lopez@hospital.local',
      password_hash: passwordHash,
      role: 'medico',
      full_name: 'Dr. Juan Lopez'
    },
    {
      id: 4,
      username: 'display',
      email: 'display@hospital.local',
      password_hash: passwordHash,
      role: 'display',
      full_name: 'Pantalla Publica'
    }
  ]);

  // Crear servicios
  await knex('services').insert([
    { id: 1, name: 'Consulta General', code: 'consulta-general', prefix: 'A', description: 'Consulta medica general', estimated_duration: 15 },
    { id: 2, name: 'Urgencias', code: 'urgencias', prefix: 'U', description: 'Atencion de urgencias', estimated_duration: 30 },
    { id: 3, name: 'Laboratorio', code: 'laboratorio', prefix: 'L', description: 'Estudios de laboratorio', estimated_duration: 20 },
    { id: 4, name: 'Farmacia', code: 'farmacia', prefix: 'F', description: 'Entrega de medicamentos', estimated_duration: 10 },
    { id: 5, name: 'Rayos X', code: 'rayos-x', prefix: 'R', description: 'Estudios de rayos X', estimated_duration: 25 },
    { id: 6, name: 'Especialidades', code: 'especialidades', prefix: 'E', description: 'Consulta con especialista', estimated_duration: 30 }
  ]);

  // Crear doctores
  await knex('doctors').insert([
    { id: 1, user_id: 3, employee_number: 'EMP001', full_name: 'Dr. Juan Lopez', specialty: 'Medicina General', office_number: '101' },
    { id: 2, employee_number: 'EMP002', full_name: 'Dra. Ana Martinez', specialty: 'Medicina General', office_number: '102' },
    { id: 3, employee_number: 'EMP003', full_name: 'Dr. Carlos Hernandez', specialty: 'Urgencias', office_number: 'URG-1' }
  ]);

  // Asignar servicios a doctores
  await knex('doctor_services').insert([
    { doctor_id: 1, service_id: 1 },
    { doctor_id: 2, service_id: 1 },
    { doctor_id: 3, service_id: 2 }
  ]);

  // Crear algunos pacientes de ejemplo
  await knex('patients').insert([
    { id: 1, curp: 'GARP850101HDFRRL01', full_name: 'Pedro Garcia Rodriguez', phone: '5551234567', is_preferential: false },
    { id: 2, curp: 'LOPM900215MDFRRL02', full_name: 'Maria Lopez Perez', phone: '5557654321', is_preferential: true },
    { id: 3, full_name: 'Jose Sanchez (sin CURP)', phone: '5559876543', is_preferential: false }
  ]);

  // Sincronizar secuencias de PostgreSQL para evitar errores de "llave duplicada"
  // Esto es necesario porque insertamos registros con IDs específicos
  console.log('\n--- Sincronizando secuencias de PostgreSQL ---');
  await syncSequencesWithKnex(knex);
};
