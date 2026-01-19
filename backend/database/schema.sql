-- Schema para Sistema de Turnos Hospitalarios

-- Tipos ENUM
CREATE TYPE user_role AS ENUM ('admin', 'capturista', 'medico', 'display');
CREATE TYPE turn_status AS ENUM ('CREATED', 'WAITING', 'CALLED', 'IN_SERVICE', 'DONE', 'NO_SHOW', 'CANCELLED');

-- Tabla de usuarios
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'capturista',
    full_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de servicios (tipos de atencion)
CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    prefix CHAR(1) NOT NULL DEFAULT 'T',
    description TEXT,
    estimated_duration INTEGER DEFAULT 15, -- minutos
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de doctores/personal medico
CREATE TABLE doctors (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    employee_number VARCHAR(50) UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    specialty VARCHAR(100),
    office_number VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Relacion doctores-servicios
CREATE TABLE doctor_services (
    doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
    PRIMARY KEY (doctor_id, service_id)
);

-- Tabla de pacientes
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    curp VARCHAR(18) UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    birth_date DATE,
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    is_preferential BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de turnos
CREATE TABLE turns (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL,
    patient_id INTEGER REFERENCES patients(id),
    service_id INTEGER REFERENCES services(id),
    doctor_id INTEGER REFERENCES doctors(id),
    status turn_status NOT NULL DEFAULT 'CREATED',
    priority INTEGER DEFAULT 0, -- 0=normal, 1=preferente, 2=urgente
    notes TEXT,

    -- Timestamps de cada etapa
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    waiting_at TIMESTAMP,
    called_at TIMESTAMP,
    service_started_at TIMESTAMP,
    finished_at TIMESTAMP,

    -- Usuario que creo el turno
    created_by INTEGER REFERENCES users(id)
);

-- Tabla de historial de turnos (auditoria)
CREATE TABLE turn_history (
    id SERIAL PRIMARY KEY,
    turn_id INTEGER REFERENCES turns(id) ON DELETE CASCADE,
    previous_status turn_status,
    new_status turn_status NOT NULL,
    changed_by INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indices para optimizar consultas
CREATE INDEX idx_turns_status ON turns(status);
CREATE INDEX idx_turns_created_at ON turns(created_at);
CREATE INDEX idx_turns_doctor_id ON turns(doctor_id);
CREATE INDEX idx_turns_service_id ON turns(service_id);
CREATE INDEX idx_turns_patient_id ON turns(patient_id);
CREATE INDEX idx_turn_history_turn_id ON turn_history(turn_id);

-- Indice unico para codigo de turno por dia
CREATE UNIQUE INDEX idx_turns_code_date ON turns(code, (created_at::date));

-- Contador de turnos por servicio por dia
CREATE TABLE turn_counters (
    id SERIAL PRIMARY KEY,
    service_id INTEGER REFERENCES services(id),
    counter_date DATE NOT NULL DEFAULT CURRENT_DATE,
    last_number INTEGER DEFAULT 0,
    UNIQUE(service_id, counter_date)
);

-- Funcion para actualizar timestamp updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_doctors_updated_at
    BEFORE UPDATE ON doctors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at
    BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Datos iniciales
INSERT INTO services (name, code, prefix, description, estimated_duration) VALUES
    ('Consulta General', 'consulta-general', 'A', 'Consulta medica general', 15),
    ('Urgencias', 'urgencias', 'U', 'Atencion de urgencias', 30),
    ('Laboratorio', 'laboratorio', 'L', 'Estudios de laboratorio', 20),
    ('Farmacia', 'farmacia', 'F', 'Entrega de medicamentos', 10),
    ('Rayos X', 'rayos-x', 'R', 'Estudios de rayos X', 25),
    ('Especialidades', 'especialidades', 'E', 'Consulta con especialista', 30);

-- Usuario admin por defecto (password: admin123)
INSERT INTO users (username, email, password_hash, role, full_name) VALUES
    ('admin', 'admin@hospital.local', '$2a$10$fYnlh7QJUjcz.i1P0wy3luWbXMKsf6DWLXyyTWd04BuMeihLzusVS', 'admin', 'Administrador del Sistema');
