# Sistema de Turnos Hospitalarios

Sistema de gestion de turnos hospitalarios con actualizacion en tiempo real via MQTT.

## Caracteristicas

- Gestion completa del ciclo de vida de turnos (crear, llamar, atender, finalizar)
- Actualizacion en tiempo real via MQTT
- Pantalla publica para pacientes
- Roles: Admin, Capturista, Medico, Display
- Historial completo de cambios (auditoria)

## Estructura del Proyecto

```
app-turnos/
├── backend/           # API Node.js/Express
├── frontend/          # Vue.js 3 + Tailwind
├── infra/            # Docker, Mosquitto config
└── PRD.md            # Documento de requisitos
```

## Requisitos

- Node.js 18+
- PostgreSQL 15+
- Mosquitto MQTT Broker

## Instalacion Rapida con Docker

```bash
cd infra
docker-compose up -d
```

Esto levantara:
- PostgreSQL en puerto 5432
- Mosquitto MQTT en puertos 1883 (MQTT) y 9001 (WebSocket)
- API en puerto 3000
- Frontend en puerto 8080

## Instalacion Manual

### Backend

```bash
cd backend
npm install
cp ../.env.example .env
# Editar .env con tus configuraciones

# Ejecutar migraciones
npm run migrate

# Ejecutar seeds (datos iniciales)
npm run seed

# Iniciar servidor
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Usuarios por Defecto

| Usuario | Contrasena | Rol |
|---------|------------|-----|
| admin | admin123 | Administrador |
| capturista1 | admin123 | Capturista |
| dr.lopez | admin123 | Medico |
| display | admin123 | Display |

## Endpoints API

### Autenticacion
- `POST /api/auth/login` - Iniciar sesion
- `GET /api/auth/me` - Usuario actual

### Turnos
- `POST /api/turns` - Crear turno
- `GET /api/turns/queue` - Cola de espera
- `GET /api/turns/display` - Datos para pantalla publica
- `PUT /api/turns/:id/call` - Llamar turno
- `PUT /api/turns/:id/start` - Iniciar atencion
- `PUT /api/turns/:id/finish` - Finalizar turno

### Pacientes
- `GET /api/patients` - Listar pacientes
- `POST /api/patients` - Registrar paciente

### Doctores
- `GET /api/doctors` - Listar doctores
- `POST /api/doctors` - Crear doctor

### Servicios
- `GET /api/services` - Listar servicios

## Estados del Turno

```
CREATED -> WAITING -> CALLED -> IN_SERVICE -> DONE
                   -> NO_SHOW
                   -> CANCELLED
```

## Topics MQTT

- `hospital/{id}/turns/events` - Eventos de turnos
- `hospital/{id}/display/updates` - Actualizaciones para pantalla

## Licencia

MIT
# app-trunos
