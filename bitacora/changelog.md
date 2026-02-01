# Changelog - Sistema de Turnos Hospitalarios

## [2026-01-31] - Fix: Ordenamiento Chrome + WebSocket Safari

### Problemas Corregidos

#### 1. Ordenamiento no funciona en Chrome (pero sí en Safari)
- **Causa**: Chrome es más estricto con la reevaluación de `computed()` cuando arrays se modifican con `unshift()`
- **Solución**: Cambiar `unshift()` por reasignación completa del array para forzar reactividad

#### 2. WebSocket cerrado en Safari ("closed due to suspension")
- **Causa**: Safari suspende WebSockets en pestañas inactivas
- **Solución**: Agregar keepalive, Page Visibility API para reconectar al reactivar pestaña

### Archivos Modificados

#### `frontend/src/services/mqttClient.js`
- Agregado **Page Visibility API** en constructor para reconectar cuando Safari reactiva la pestaña
- Cambiado `reconnectPeriod: 1000` → `5000` (menos agresivo)
- Agregado `keepalive: 30` (heartbeat cada 30 segundos)
- Agregado `connectTimeout: 10000`
- Agregado `resubscribe: true` (re-suscribir automáticamente al reconectar)

#### `frontend/src/stores/turns.js`
- Línea 88 `createTurn()`: `turns.value.unshift(...)` → `turns.value = [newTurn, ...turns.value]`
- Línea 123 `handleMqttMessage()`: `turns.value.unshift(turn)` → `turns.value = [turn, ...turns.value]`

#### `frontend/src/views/CapturistaView.vue`
- Ordenamiento cambiado de `b.id - a.id` a comparación por `created_at` parseado
- Más robusto para casos donde IDs no sean secuenciales

### Verificación
1. **Chrome**: Crear turnos → verificar que aparecen arriba de la lista ✓
2. **Safari**: Abrir pestaña → dejar inactiva 2+ min → reactivar → verificar reconexión MQTT
3. **Ambos navegadores**: Verificar que turnos se ordenan igual (más nuevo primero)

---

## [2026-01-31] - Ordenar turnos del más nuevo al más antiguo

### Cambio
- Modificado `CapturistaView.vue`: Agregada computed property `sortedTurns` para ordenar turnos por fecha de creación descendente
- **Antes**: `v-for="turn in turnsStore.turns"` (sin orden definido)
- **Después**: `v-for="turn in sortedTurns"` (ordenados por `created_at` DESC)

### Resultado
- Los turnos más recientes aparecen primero en la lista "Turnos del Día"
- Las actualizaciones en tiempo real vía MQTT ya estaban implementadas y funcionan correctamente

---

## [2026-01-31] - Ampliar área de Turnos del Día

### Cambio
- Modificado `CapturistaView.vue` línea 115: altura máxima del contenedor de turnos
- **Antes**: `max-h-96` (384px fijo, ~3 turnos visibles)
- **Después**: `max-h-[calc(100vh-300px)]` (adaptable al viewport)

### Resultado
- Mayor visibilidad de turnos sin necesidad de scroll
- Interfaz se adapta al tamaño de pantalla

---

## [2026-01-31] - Mejoras al Panel de Capturista y Visualización de Turnos

### Resumen
Se implementaron mejoras al flujo de creación de turnos para hacer el paciente registrado opcional, permitir cancelar turnos desde cualquier estado, cambiar búsqueda de CURP a teléfono, y mostrar el nombre del paciente en la pantalla pública.

### Cambios Realizados

#### 1. Paciente registrado opcional
- Migración `014_turn_patient_fields.js`: Agregados campos `patient_name` y `patient_phone` a tabla `turns`
- Los campos `patient_name` y `patient_phone` son ahora obligatorios en la creación del turno
- El campo `patient_id` es opcional (para vincular a paciente registrado)
- Se usa COALESCE en las queries para priorizar datos del turno sobre datos del paciente vinculado

#### 2. Cancelar turnos desde cualquier estado
- Actualizado `backend/utils/constants.js`: Estado CALLED ahora permite transición a CANCELLED
- Estados que permiten cancelación: CREATED, WAITING, CALLED, IN_SERVICE
- Botón "Cancelar Turno" visible en panel capturista para todos los estados activos

#### 3. Búsqueda por teléfono
- Modificado `backend/models/patient.js`: Búsqueda ahora usa teléfono en lugar de CURP
- Actualizado placeholder en CapturistaView: "Buscar por nombre o teléfono"

#### 4. Mostrar nombre del paciente
- Actualizado `PublicDisplayView.vue`: Muestra nombre del paciente en cola de espera y turnos en atención

### Archivos Modificados
```
backend/
├── database/migrations/014_turn_patient_fields.js (nuevo)
├── models/patient.js
├── models/turn.js
├── services/turnService.js
├── controllers/turnController.js
└── utils/constants.js

frontend/src/views/
├── CapturistaView.vue
└── PublicDisplayView.vue
```

### Verificación
- ✅ Crear turno sin paciente registrado (solo nombre y teléfono)
- ✅ Crear turno con paciente registrado
- ✅ Búsqueda de pacientes por teléfono
- ✅ Cancelar turno en estado WAITING
- ✅ Cancelar turno en estado CALLED
- ✅ Nombre del paciente visible en pantalla pública

---

## [2026-01-30] - Limpieza: Eliminación de directorio infra/ obsoleto

### Resumen
Se eliminó el directorio `infra/` que contenía archivos Docker legacy duplicados.

### Archivos Eliminados
```
infra/
├── Caddyfile
├── docker-compose.yml
├── Dockerfile.api
├── Dockerfile.frontend
└── mosquitto.conf
```

### Motivo
Los archivos en `infra/` estaban desactualizados y duplicados. La configuración mejorada y mantenida activamente se encuentra en `setup_hp/setup_docker/`.

### Cambios Asociados
- Actualizado README.md: referencia a Docker ahora apunta a `setup_hp/setup_docker/`
- Estructura del proyecto actualizada

### Ubicación Actual de Configuración Docker
```
setup_hp/setup_docker/
├── Caddyfile                # Configuración de Caddy actualizada
├── docker-compose.yml       # Docker Compose mejorado
├── config/
│   ├── Caddyfile
│   └── mosquitto.conf
└── ...
```

---

## [2026-01-30] - Fix: PostgreSQL Enum user_role en Servidor Nuevo

### Problema
Error en migración `004_add_resource_roles.js`:
```
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin_recurso' - type "user_role" does not exist
```

### Causa Raíz
El tipo `user_role` no se creaba explícitamente en la migración 001. Knex usaba `enu()` que no crea el tipo PostgreSQL, solo la restricción.

### Solución (commit cc4c8e8)
**Modificado `backend/database/migrations/001_initial_schema.js`:**

1. **Creación explícita del enum** (línea 3):
   ```javascript
   return knex.raw("CREATE TYPE user_role AS ENUM ('admin', 'capturista', 'medico', 'display')")
   ```

2. **Uso de specificType** (línea 11):
   ```javascript
   table.specificType('role', 'user_role').defaultTo('capturista');
   ```

3. **Rollback limpio** (línea 110):
   ```javascript
   .then(() => knex.raw('DROP TYPE IF EXISTS user_role'));
   ```

### Para Servidores Nuevos
Si el servidor clonó el repo antes del fix:

```bash
# 1. Actualizar código
cd /apps-node/app-turnos
git pull origin main

# 2. Limpiar BD si existe (instalación fallida previa)
sudo -u postgres psql -c "DROP DATABASE IF EXISTS app_turnos;"
sudo -u postgres psql -c "DROP USER IF EXISTS app_turnos_user;"

# 3. Ejecutar instalación
cd /apps-node/app-turnos/setup_hp/setup_nativo
sudo ./install.sh
```

### Verificación
```bash
# Verificar tablas
sudo -u postgres psql -d app_turnos -c "\dt"

# Verificar enum
sudo -u postgres psql -d app_turnos -c "SELECT enumlabel FROM pg_enum WHERE enumtypid = 'user_role'::regtype;"
```

---

## [2026-01-30] - Mejora: Backups consistentes en instalación nativa

### Cambios
Actualizado `setup-services.sh` para crear backups con timestamp de todos los archivos de configuración antes de sobrescribirlos.

### Archivos afectados
- **Mosquitto** (`/etc/mosquitto/conf.d/app-turnos.conf`)
- **Caddy** (`/etc/caddy/Caddyfile`)
- **PM2** (`backend/ecosystem.config.js`)

### Comportamiento
1. Si el archivo existe → crea backup con timestamp (ej: `archivo.backup.20260130_142500`)
2. Si el archivo no existe → crea el nuevo archivo directamente
3. Si el archivo de origen en el repo no existe → crea configuración básica inline

### Formato de backup
```
archivo.conf.backup.YYYYMMDD_HHMMSS
```

---

## [2026-01-30] - Fix: Duplicate persistence_location en Mosquitto

### Problema
Error al iniciar Mosquitto en servidor nuevo:
```
Duplicate persistence_location value in configuration.
Error found at /etc/mosquitto/conf.d/app-turnos.conf:42.
Error found at /etc/mosquitto/mosquitto.conf:13.
```

### Causa
El archivo `mosquitto.conf` de la app incluía configuración de persistencia y logging que ya existe en el archivo principal del sistema `/etc/mosquitto/mosquitto.conf`.

### Solución
Simplificado `setup_hp/setup_nativo/config/mosquitto.conf` para incluir **solo**:
- Listeners (TCP en 1883, WebSocket en 9001)
- Autenticación (allow_anonymous)

Removidas las configuraciones duplicadas:
- persistence, persistence_location
- log_dest, log_type
- max_connections, message_size_limit
- pid_file, user

### Archivo corregido
```conf
# Solo listeners y autenticación
listener 1883 127.0.0.1
protocol mqtt

listener 9001
protocol websockets

allow_anonymous true
```

---

## [2026-01-30] - Fix: Scripts Instalación Nativa (Permisos Root y Migraciones)

### Problema
Al ejecutar la instalación nativa como root:
1. Servicios no corrían correctamente
2. Base de datos y tablas no se creaban
3. Migraciones fallaban silenciosamente

### Causa Raíz
1. `npm install` como root puede fallar sin `--unsafe-perm`
2. Migraciones usaban entorno `development` que tiene credenciales por defecto diferentes
3. Archivo `.env` se creaba después de las dependencias pero las migraciones necesitaban las variables
4. Falta de verificación de conexión antes de migrar

### Correcciones

#### setup-database.sh - Reestructuración completa
1. **Archivo .env se crea ANTES de npm install**
   - Asegura que las variables estén disponibles para knex

2. **npm install con --unsafe-perm**
   ```bash
   npm install --unsafe-perm
   ```

3. **NODE_ENV=production explícito**
   - Se exportan todas las variables de DB antes de migrar
   - Migraciones usan `--env production`

4. **Verificación de conexión antes de migrar**
   ```bash
   PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;"
   ```

5. **Mejor manejo de errores**
   - Mensajes más descriptivos
   - Fallbacks si un método falla

#### install.sh - Frontend npm
- Agregado `--unsafe-perm` para npm install del frontend
- Fallback si falla

#### .env.production template
- Agregado `DB_SSL=false` para evitar errores SSL en instalación nativa

### Verificación
Para verificar que las migraciones se ejecutaron:
```bash
sudo -u postgres psql -d app_turnos -c "\\dt"
```

---

## [2026-01-30] - Fix: Error SSL en Instalación Docker

### Problema
Error al ejecutar seeds en instalación Docker:
```
Error: The server does not support SSL connections
```

### Causa
- `NODE_ENV=production` activa SSL en la conexión a PostgreSQL
- El contenedor PostgreSQL de Docker no tiene SSL habilitado

### Solución

#### backend/config/database.js
- SSL ahora es configurable via variable `DB_SSL`
- `DB_SSL=true` → habilita SSL (para cloud: Heroku, AWS RDS)
- `DB_SSL=false` → deshabilita SSL (para Docker)
- Agregada configuración `docker` específica

#### docker-compose.yml
- Agregado `DB_SSL: "false"` en environment del contenedor API

### Uso
```yaml
# Docker (sin SSL)
DB_SSL: "false"

# Cloud con SSL
DB_SSL: "true"
```

---

## [2026-01-30] - Correcciones Script Instalación Nativa

### Problema
El script de instalación nativa mostraba fallos en verificación de:
- Mosquitto servicio/MQTT
- PM2 proceso
- API /api/health
- Puertos MQTT

### Correcciones

#### mosquitto.conf (`setup_hp/setup_nativo/config/mosquitto.conf`)
- WebSocket listener ya no usa `127.0.0.1` (no funciona en Mosquitto 2.0.x)
- Seguridad manejada via firewall UFW
```conf
listener 1883 127.0.0.1  # TCP solo localhost
listener 9001            # WebSocket (protegido por UFW)
```

#### Backend server.js
- Agregado endpoint `/api/health` además de `/health`
- Respuesta incluye `status: "healthy"` para verificación

#### verify-installation.sh
- Corregido grep de PM2: busca "app-turnos" o "online"

#### setup-services.sh - Configuración Caddy mejorada
- **Siempre respalda** Caddyfile existente con timestamp (ej: `Caddyfile.backup.20260130_123456`)
- **Siempre crea** nueva configuración completa (no depende de archivo en config/)
- Configuración incluye todas las características:
  - Proxy `/api/*` para backend
  - Proxy `/uploads/*` para archivos
  - Proxy `/mqtt-ws` para WebSocket MQTT
  - Headers de seguridad (X-Frame-Options, X-Content-Type-Options, etc.)
  - Compresión gzip/zstd
  - Cache para assets estáticos
  - Manejo SPA (try_files)

#### setup_docker/config/Caddyfile
- Verificado que incluye todas las características necesarias
- Usa nombres de contenedores Docker (api:3000, mosquitto:9001, frontend:80)

---

## [2026-01-30] - Mejora Pantalla Pública: Turnos en Atención

### Resumen
La pantalla pública ahora muestra los turnos que están siendo atendidos (IN_SERVICE) además de los llamados.

### Backend (`services/turnService.js`)
- `getDisplayData()` ahora incluye array `inService` con turnos en estado IN_SERVICE

### Frontend (`views/PublicDisplayView.vue`)
- Nueva sección "En Atención" con tarjetas verdes para turnos IN_SERVICE
- Sección "Llamando" para turnos CALLED (esperando al paciente)
- Cada tarjeta muestra: código, consultorio y nombre del doctor

### Estructura de Respuesta API
```json
{
  "called": [],      // Turnos llamados (esperando paciente)
  "inService": [],   // Turnos en atención (nuevo)
  "waiting": [],     // Próximos en cola
  "stats": {}
}
```

### Diseño Visual
| Sección | Color | Estado |
|---------|-------|--------|
| En Atención | Verde (emerald) | IN_SERVICE |
| Llamando | Cyan | CALLED |
| Próximos | Naranja | WAITING |

---

## [2026-01-30] - Arquitectura de Red via Localhost

### Resumen
Todas las comunicaciones internas ahora usan localhost, permitiendo que el sistema funcione con IP dinámica sin configuración adicional. Solo el puerto 80 está expuesto.

### Arquitectura
```
[Usuario Externo] → IP:80 → Caddy
                              ├── /api/*      → localhost:3000 (Backend)
                              ├── /uploads/*  → localhost:3000 (Archivos)
                              ├── /mqtt-ws    → localhost:9001 (MQTT WebSocket)
                              └── /*          → frontend estático
```

### Cambios Realizados

#### Caddyfile Nativo (`setup_hp/setup_nativo/config/Caddyfile`)
- Agregado handler `/mqtt-ws` que proxia a `localhost:9001`

#### Caddyfile Docker (`setup_hp/setup_docker/config/Caddyfile`)
- Agregado handler `/mqtt-ws` que proxia a `mosquitto:9001`

#### mosquitto.conf Nativo (`setup_hp/setup_nativo/config/mosquitto.conf`)
- Listeners ahora hacen binding a `127.0.0.1` (solo localhost)
- Puerto 1883 TCP: `listener 1883 127.0.0.1`
- Puerto 9001 WS: `listener 9001 127.0.0.1`

#### mosquitto.conf Docker (`setup_hp/setup_docker/config/mosquitto.conf`)
- Listeners hacen binding a `0.0.0.0` (accesible dentro de red Docker)
- Puertos no expuestos externamente

#### docker-compose.yml (`setup_hp/setup_docker/docker-compose.yml`)
- Removidos puertos expuestos de Mosquitto (`1883:1883`, `9001:9001`)
- MQTT solo accesible via red Docker interna

#### mqttClient.js (`frontend/src/services/mqttClient.js`)
- Conexión cambiada de `ws://${host}:9001` a ruta relativa `/mqtt-ws`
- Detecta automáticamente protocolo (ws/wss) según página

### Beneficios
| Aspecto | Descripción |
|---------|-------------|
| **Seguridad** | Solo puerto 80 expuesto, servicios internos en localhost |
| **IP Dinámica** | Frontend usa rutas relativas, funciona sin configurar IP |
| **Simplicidad** | Todo el tráfico pasa por Caddy como punto único |
| **HTTPS Ready** | Caddy puede agregar HTTPS sin cambios en servicios |

### Verificación
```bash
# API funciona
curl http://localhost/api/health

# Puerto 9001 NO expuesto externamente
nc -z <IP_EXTERNA> 9001  # debe fallar

# Frontend se conecta a MQTT via /mqtt-ws
# (verificar en consola del navegador)
```

### Archivos Modificados
- `setup_hp/setup_nativo/config/Caddyfile`
- `setup_hp/setup_docker/config/Caddyfile`
- `setup_hp/setup_nativo/config/mosquitto.conf`
- `setup_hp/setup_docker/config/mosquitto.conf`
- `setup_hp/setup_docker/docker-compose.yml`
- `frontend/src/services/mqttClient.js`
- `bitacora/diagrama.md`
- `PRD.md`

---

## [2026-01-26] - Integracion de Consultorios en Sistema de Turnos

### Resumen
Los turnos ahora pueden asignarse a un consultorio especifico desde CapturistaView.

### Base de Datos
- **Migracion** `011_add_consultorio_to_turns.js`: Agrega campo `consultorio_id` a tabla `turns`
  - Foreign key a tabla `recursos`
  - `ON DELETE SET NULL` para mantener turnos si se elimina consultorio

### Backend

#### Modelo `turn.js`
- Agregado JOIN con tabla `recursos` en `findAll()`, `findById()`, `getQueue()`
- Nuevos campos en SELECT: `consultorio_nombre`, `consultorio_ubicacion`
- Agregado `consultorio_id` a `create()`

#### Controlador `turnController.js`
- Agregado `consultorio_id` al schema de validacion Joi

#### Servicio `turnService.js`
- Agregado `consultorio_id` al crear turno

### Frontend

#### `CapturistaView.vue`
- Nueva ref `consultorios` para almacenar lista de consultorios activos
- Carga de consultorios en `loadData()` via `/api/recursos?tipo=CONSULTORIO&is_active=true`
- Agregado `consultorio_id` a `newTurn` form
- Nuevo selector de consultorio en formulario despues del selector de doctor

### Datos de Prueba
- Creados 3 consultorios de ejemplo: Consultorio 1, 2 y 3

### Verificacion
- [x] Migracion ejecutada exitosamente
- [x] Columna `consultorio_id` existe en tabla `turns`
- [x] Endpoint `/api/recursos?tipo=CONSULTORIO` retorna consultorios
- [x] Turno se crea con `consultorio_id` y retorna `consultorio_nombre`
- [x] Frontend compila sin errores

---

## [2026-01-22] - Correccion de Permisos admin_habitaciones

### Problema
El usuario con rol `admin_habitaciones` recibia error 403 "Permisos insuficientes" al intentar:
- Cambiar estado de habitacion
- Asignar paciente
- Liberar habitacion

### Causa
El orden de las rutas en `backend/routes/recursos.js` era incorrecto. La ruta generica `PUT /:id` (que requiere solo `admin`) estaba definida ANTES de `PUT /:id/actualizar-uso` (que permite `admin_habitaciones`).

Express.js matchea rutas en orden de definicion, por lo que `PUT /1/actualizar-uso` era interceptado por `PUT /:id` primero.

### Solucion
Reordenar rutas en `backend/routes/recursos.js`:
1. Rutas estaticas (`/`, `/uso/ocupados`, `/historial/lista`, `/historial/stats`)
2. Rutas con subrutas (`/:id/asignar`, `/:id/actualizar-uso`, `/:id/liberar`, `/:id/historial`)
3. Rutas genericas con `:id` al final (`/:id` GET/PUT/DELETE)

### Verificacion
- [x] PUT /api/recursos/:id/actualizar-uso - Status 200
- [x] POST /api/recursos/:id/asignar - Status 201
- [x] POST /api/recursos/:id/liberar - Status 200

---

## [2026-01-22] - Rediseno de Tabla de Habitaciones

### Resumen
Rediseno de la tabla de habitaciones para mostrar informacion mas relevante y permitir cambio de estado dinamico directamente desde la tabla principal.

### Cambios en Columnas
| Antes | Despues |
|-------|---------|
| Habitacion (nombre + codigo) | HABITACION (solo codigo) |
| Ubicacion | PACIENTE |
| Estado | MEDICO TRATANTE |
| Paciente | FECHA DE INGRESO |
| Doctor | ESTADO (dropdown dinamico) |
| Acciones | ACCIONES |

### Nueva Funcionalidad: Estado Dinamico
- El badge estatico de estado fue reemplazado por un `<select>` dropdown
- Al seleccionar un nuevo estado, se actualiza automaticamente via API `PUT /recursos/:id/actualizar-uso`
- Si la actualizacion falla, se revierte visualmente recargando los datos
- Los estados disponibles son: OCUPADO, HOSPITALIZACION, QUIROFANO, RECUPERACION, TERAPIA, URGENCIAS, MANTENIMIENTO

### Archivos Modificados

#### `frontend/src/views/AdminHabitacionesView.vue`
- Cambiados headers de tabla: HABITACION, PACIENTE, MEDICO TRATANTE, FECHA DE INGRESO, ESTADO, ACCIONES
- Columna HABITACION ahora muestra solo `codigo` (ej: "101", "H-205")
- Columna ESTADO: Dropdown clickeable que permite cambiar estado sin abrir modal
- Agregada funcion `cambiarEstatus(habitacion, nuevoEstatus)`

#### `frontend/src/views/AdminRecursoView.vue`
- Agregado renderizado condicional para headers cuando `categoria === 'HABITACION'`
- Agregado renderizado condicional para celdas con formato especial para HABITACION
- Mantiene formato original para otros tipos (CONSULTORIO, etc.)
- Agregada funcion `cambiarEstatus(recurso, nuevoEstatus)`

### Verificacion
- [x] Frontend compila sin errores
- [x] Tabla muestra columnas correctas para HABITACION
- [x] Dropdown de estado funcional
- [x] Otros tipos de recursos mantienen formato original

---

## [2026-01-22] - Reemplazo de admin_recurso por admin_habitaciones

### Resumen
Se elimino el rol `admin_recurso` y se creo un nuevo rol `admin_habitaciones` con permisos mas restrictivos:
- Solo visualiza habitaciones (no consultorios ni otros recursos)
- Puede asignar pacientes, editar uso y liberar habitaciones
- NO puede agregar nuevos recursos
- NO puede configurar/modificar recursos base

### Migraciones
- **009_rename_admin_recurso.js**: Agrega valor `admin_habitaciones` al enum `user_role`
- **010_update_admin_recurso_users.js**: Migra usuarios existentes de `admin_recurso` a `admin_habitaciones`

### Backend - Cambios en Permisos

#### `routes/recursos.js`
| Operacion | Antes | Despues |
|-----------|-------|---------|
| POST `/` (crear) | admin, admin_recurso | **solo admin** |
| PUT `/:id` (configurar) | admin, admin_recurso | **solo admin** |
| DELETE `/:id` (eliminar) | admin, admin_recurso | **solo admin** |
| POST `/:id/asignar` | admin, admin_recurso | admin, admin_habitaciones |
| PUT `/:id/actualizar-uso` | admin, admin_recurso | admin, admin_habitaciones |
| POST `/:id/liberar` | admin, admin_recurso | admin, admin_habitaciones |

#### `routes/hospitalizaciones.js`
- Reemplazado `admin_recurso` por `admin_habitaciones` en todas las rutas

#### `controllers/authController.js`
- Actualizada validacion Joi: `admin_recurso` → `admin_habitaciones`
- Nueva contrasena por defecto: `habitacion123#`

### Frontend

#### Nueva Vista `AdminHabitacionesView.vue`
| Caracteristica | AdminRecursoView | AdminHabitacionesView |
|----------------|------------------|----------------------|
| Titulo | "Administracion de Recursos" | "Gestion de Habitaciones" |
| Tabs | Dinamicos por tipo + Historial | Solo "Habitaciones" + "Historial" |
| Boton "+ Nuevo Recurso" | Visible | **ELIMINADO** |
| Icono engranaje (config) | Visible | **ELIMINADO** |
| Modal crear/editar recurso | Incluido | **ELIMINADO** |
| Filtro de tipo | Dinamico | Fijo a HABITACION |
| Acciones | Asignar, Editar, Liberar, Config | Asignar, Editar, Liberar |

#### `router/index.js`
- Nueva ruta `/admin-habitaciones` → `AdminHabitacionesView.vue`
- Redirect para rol `admin_habitaciones` → `/admin-habitaciones`
- Eliminada ruta `/admin-recurso`

#### `AdminView.vue`
- Dropdown de roles: `admin_recurso` → `admin_habitaciones`
- `getRolLabel()`: "Admin Recursos" → "Admin Habitaciones"
- `getDefaultPassword()`: `recurso123#` → `habitacion123#`
- Badge color: mantiene naranja

### Tabla de Roles Actualizada
| Rol | Etiqueta | Contrasena | Acceso |
|-----|----------|------------|--------|
| admin | Administrador | admin123# | Todo |
| capturista | Capturista | captura123# | Turnos |
| medico | Medico | medico123 | Turnos propios |
| display | Pantalla | display123 | Solo visualizacion |
| **admin_habitaciones** | Admin Habitaciones | **habitacion123#** | Solo habitaciones |
| pan_recurso | Panel Recursos | panrecurso123 | Panel visualizacion |

### Archivos Creados
- `backend/database/migrations/009_rename_admin_recurso.js`
- `backend/database/migrations/010_update_admin_recurso_users.js`
- `frontend/src/views/AdminHabitacionesView.vue`

### Archivos Modificados
- `backend/controllers/authController.js`
- `backend/routes/recursos.js`
- `backend/routes/hospitalizaciones.js`
- `frontend/src/router/index.js`
- `frontend/src/views/AdminView.vue`
- `PRD.md`

### Nota
PostgreSQL no permite eliminar valores de ENUM facilmente, por lo que `admin_recurso` permanece en el tipo `user_role` pero ya no se usa activamente.

---

## [2026-01-22] - Separacion de Servicios y Recursos en AdminView

### Problema
- La pestaña de Servicios en AdminView mezclaba servicios y recursos
- El modal de crear/editar servicio permitia seleccionar tipo "recurso"
- No habia una pestaña dedicada para administrar recursos

### Solucion Implementada

#### Frontend (`views/AdminView.vue`)

**Cambios en Servicios:**
- Eliminado selector de tipo (servicio/recurso) del modal de servicios
- Formulario ahora solo permite crear servicios (`tipo: 'servicio'` fijo)
- API call cambiado de `/services` a `/services?tipo=servicio` para filtrar solo servicios
- Eliminada columna "Tipo" de la tabla (redundante ya que todos son servicios)

**Nueva Pestaña Recursos:**
- Agregada pestaña "Recursos" en la navegacion de tabs
- Integrado componente `AdminRecursoView` como contenido de la pestaña
- Posicion: despues de Servicios, antes de Usuarios

**Codigo Modificado:**
| Seccion | Cambio |
|---------|--------|
| Import | Agregado `import AdminRecursoView from './AdminRecursoView.vue'` |
| Tabs | Agregado `{ id: 'recursos', name: 'Recursos' }` |
| Template | Agregado `<div v-if="activeTab === 'recursos'"><AdminRecursoView /></div>` |
| Modal | Eliminado `<select v-model="serviceForm.tipo">` |
| API | Cambiado `api.get('/services')` a `api.get('/services?tipo=servicio')` |
| Tabla | Eliminada columna y celda de "Tipo" |

### Resultado
- Pestaña **Servicios**: Solo muestra y administra servicios (tipo='servicio')
- Pestaña **Recursos**: Muestra AdminRecursoView para administrar recursos físicos

### Verificacion
- [x] Frontend compila sin errores
- [x] Pestaña Servicios filtrada correctamente
- [x] Pestaña Recursos visible y funcional

---

## [2026-01-22] - Correccion AdminRecursoView para usar tabla `recursos`

### Problema Corregido
- AdminRecursoView usaba endpoints incorrectos (`/services/recursos/lista`) que consultaban la tabla `services`
- Los recursos se mezclaban con servicios causando confusion arquitectonica

### Solucion Implementada
- Frontend ahora usa directamente `/api/recursos` (tabla `recursos`)
- Eliminado codigo duplicado del backend

### Frontend (`views/AdminRecursoView.vue`)

#### Endpoints Corregidos
| Antes (incorrecto) | Despues (correcto) |
|-------------------|-------------------|
| `/services/recursos/lista` | `/recursos?is_active=true` |
| `/services/recursos/:id/asignar` | `/recursos/:id/asignar` |
| `/services/recursos/:id/actualizar-uso` | `/recursos/:id/actualizar-uso` |
| `/services/recursos/:id/liberar` | `/recursos/:id/liberar` |

#### Nuevas Funcionalidades
- **Boton "+ Nuevo Recurso"**: Agregado en header de cada categoria para crear recursos
- **Boton Configurar (icono engranaje)**: Agregado en columna acciones para editar recurso base
- **Tipo preseleccionado**: Al crear recurso desde una categoria, el tipo se preselecciona automaticamente

### Backend - Codigo Eliminado

#### `controllers/serviceController.js`
- Eliminados metodos: `listRecursos`, `asignarRecurso`, `liberarRecurso`, `actualizarUsoRecurso`
- Eliminadas importaciones de knex y dbConfig (ya no necesarias)

#### `routes/services.js`
- Eliminadas rutas: `/recursos/lista`, `/recursos/:id/asignar`, `/recursos/:id/liberar`, `/recursos/:id/actualizar-uso`

### Arquitectura Resultante
```
Frontend (AdminRecursoView.vue)
    |
    v
/api/recursos (recursos.js)
    |
    v
recursoController.js
    |
    v
Tablas: recursos, uso_recursos, historial_recursos
```

### Verificacion Realizada
- [x] GET /api/recursos - Lista recursos con estado de ocupacion
- [x] POST /api/recursos - Crear nuevo recurso
- [x] POST /api/recursos/:id/asignar - Asignar paciente
- [x] PUT /api/recursos/:id/actualizar-uso - Actualizar datos de uso
- [x] POST /api/recursos/:id/liberar - Liberar y mover a historial
- [x] GET /api/recursos/historial/lista - Ver historial
- [x] Frontend compila sin errores

---

## [2026-01-22] - Pestanas Dinamicas por Categoria en AdminRecursoView

### Frontend (`views/AdminRecursoView.vue`)

#### Cambios Principales
- **Pestanas dinamicas**: Las pestanas ahora se generan automaticamente basandose en los tipos de recursos existentes en la base de datos
- **Template generico**: Reemplazadas las dos secciones hardcodeadas (Habitaciones, Consultorios) con una sola seccion generica usando `v-for`
- **Filtro de historial dinamico**: El dropdown de tipos en Historial ahora usa categorias dinamicas

#### Codigo Eliminado
| Tipo | Elemento |
|------|----------|
| Variables | `filtroEstadoHabitaciones`, `filtroEstadoConsultorios` |
| Computed | `habitaciones`, `habitacionesFiltradas`, `habitacionesLibres`, `habitacionesOcupadas` |
| Computed | `consultorios`, `consultoriosFiltrados`, `consultoriosLibres`, `consultoriosOcupados` |
| Template | Seccion hardcodeada `v-if="activeTab === 'habitaciones'"` |
| Template | Seccion hardcodeada `v-if="activeTab === 'consultorios'"` |

#### Codigo Agregado
| Tipo | Elemento | Descripcion |
|------|----------|-------------|
| Computed | `categorias` | Extrae tipos unicos de recursos |
| Computed | `tabs` | Genera pestanas dinamicamente |
| Ref | `filtroEstadoPorCategoria` | Objeto reactivo para filtros por categoria |
| Funcion | `getRecursosPorTipo(tipo)` | Filtra recursos por tipo |
| Funcion | `getRecursosLibresPorTipo(tipo)` | Cuenta libres por tipo |
| Funcion | `getRecursosOcupadosPorTipo(tipo)` | Cuenta ocupados por tipo |
| Funcion | `getRecursosFiltradosPorTipo(tipo)` | Aplica filtro de estado por tipo |
| Funcion | `formatTipoNombre(tipo)` | Convierte tipo a nombre legible |
| Funcion | `getCategoriaBorderColor(tipo)` | Retorna color de borde por tipo |

#### Beneficios
- Si se agrega un nuevo tipo de recurso en BD (ej: "QUIROFANO"), aparecera automaticamente como nueva pestana
- Codigo mas mantenible y DRY (Don't Repeat Yourself)
- Primera pestana de categoria se selecciona automaticamente al cargar

---

## [2026-01-21] - Reorganizacion de AdminRecursoView por Categorias

### Frontend (`views/AdminRecursoView.vue`)

#### Cambios en Pestanas
- **Antes:** "Recursos" | "Historial"
- **Despues:** "Habitaciones" | "Consultorios" | "Historial"

#### Elementos Eliminados
- Boton "+ Nuevo Recurso" (la creacion se hara por otro medio)
- Filtro de dropdown "Todos los tipos" (ya no necesario con pestanas separadas)
- Boton "Config" en acciones de cada fila

#### Nuevas Computed Properties
| Property | Descripcion |
|----------|-------------|
| `habitaciones` | Filtra recursos tipo HABITACION |
| `habitacionesFiltradas` | Aplica filtro de estado a habitaciones |
| `habitacionesLibres` | Conteo de habitaciones libres |
| `habitacionesOcupadas` | Conteo de habitaciones ocupadas |
| `consultorios` | Filtra recursos tipo CONSULTORIO |
| `consultoriosFiltrados` | Aplica filtro de estado a consultorios |
| `consultoriosLibres` | Conteo de consultorios libres |
| `consultoriosOcupados` | Conteo de consultorios ocupados |

#### Nuevas Variables de Filtro
- `filtroEstadoHabitaciones` - Filtro por estado para tab Habitaciones
- `filtroEstadoConsultorios` - Filtro por estado para tab Consultorios

#### Estructura de Pestanas
| Pestana | Contenido | Acciones |
|---------|-----------|----------|
| Habitaciones | Solo recursos tipo HABITACION | Asignar (libre) / Editar + Liberar (ocupado) |
| Consultorios | Solo recursos tipo CONSULTORIO | Asignar (libre) / Editar + Liberar (ocupado) |
| Historial | Historial de uso (sin cambios) | Paginacion y filtros |

#### Cambios en Tabla
- Eliminada columna "Tipo" (redundante con pestanas)
- Tabla ahora tiene 6 columnas: Recurso, Ubicacion, Estado, Paciente, Doctor, Acciones

---

## [2026-01-22] - Campo Codigo/Identificador en Servicios

### Backend (`controllers/serviceController.js`)
- Agregado campo `code` al schema de validacion Joi (max 20 caracteres, opcional)
- Modificada funcion `create()`: usa codigo proporcionado o genera automaticamente del nombre
- Modificada funcion `update()`: permite cambiar codigo manualmente, valida duplicados

### Frontend (`views/AdminView.vue`)
- Agregado campo `code` al formulario de servicios (`serviceForm`)
- Nuevo input "Codigo/Identificador" en modal de servicios con placeholder y ayuda
- Actualizado reset del formulario en `openNewServiceModal()` y `saveService()`

### Uso
- Crear servicio sin codigo: se genera automaticamente del nombre (ej: "Rayos X" -> "rayos-x")
- Crear servicio con codigo manual: se usa el proporcionado (ej: "Habitacion" con codigo "101")
- Codigos duplicados son rechazados con mensaje de error

---

## [2026-01-22] - Sistema Unificado de Gestion de Recursos Fisicos

### Base de Datos
- **Migracion** `007_recursos_unificados.js`: Nuevas tablas para sistema unificado
  - `recursos`: Catalogo de recursos fisicos (consultorios, habitaciones)
  - `uso_recursos`: Estado actual de ocupacion (un registro por recurso ocupado)
  - `historial_recursos`: Registro historico permanente con datos desnormalizados
- **Migracion** `008_migrar_hospitalizaciones.js`: Migra datos existentes de hospitalizaciones
  - Crea recursos desde habitaciones unicas
  - Migra registros activos a uso_recursos
  - Migra registros historicos (EGRESO, DESOCUPADA) a historial_recursos

### Backend - Modelos
- **`models/recurso.js`**: CRUD de catalogo de recursos
  - findAll(), findById(), findByCodigo()
  - create(), update(), delete() (soft delete)
  - getEstadisticasPorTipo()
- **`models/usoRecurso.js`**: Gestion de ocupacion actual
  - findAll() con JOINs a recursos y doctors
  - findByRecursoId(), isRecursoOcupado()
  - create(), update(), delete()
  - getEstadisticas(), getEstadisticasPorTipo()
- **`models/historialRecurso.js`**: Consultas de historial y reportes
  - findAll() con filtros (recurso, doctor, fechas, paginacion)
  - findByRecursoId()
  - create() con calculo automatico de duracion
  - getStats() con estadisticas completas

### Backend - Controlador (`controllers/recursoController.js`)
- **Catalogo de Recursos**
  - listRecursos(): Lista con estado de ocupacion agregado
  - getRecursoById(): Detalle con uso_actual
  - createRecurso(), updateRecurso(), deleteRecurso()
- **Gestion de Uso**
  - listOcupados(): Recursos actualmente ocupados
  - asignarPaciente(): Asigna paciente verificando disponibilidad
  - actualizarUso(): Modifica datos del uso actual
  - liberarRecurso(): Mueve a historial y libera recurso
- **Historial y Reportes**
  - listHistorial(): Con paginacion y filtros
  - getHistorialRecurso(): Historial de un recurso especifico
  - getStats(): Estadisticas consolidadas

### Backend - Rutas (`routes/recursos.js`)
| Metodo | Ruta | Roles | Descripcion |
|--------|------|-------|-------------|
| GET | `/api/recursos` | Autenticado | Lista recursos con estado |
| GET | `/api/recursos/:id` | Autenticado | Detalle con uso actual |
| POST | `/api/recursos` | admin, admin_recurso | Crear recurso |
| PUT | `/api/recursos/:id` | admin, admin_recurso | Actualizar recurso |
| DELETE | `/api/recursos/:id` | admin, admin_recurso | Desactivar recurso |
| GET | `/api/recursos/uso/ocupados` | Autenticado | Lista ocupados |
| POST | `/api/recursos/:id/asignar` | admin, admin_recurso | Asignar paciente |
| PUT | `/api/recursos/:id/actualizar-uso` | admin, admin_recurso | Actualizar uso |
| POST | `/api/recursos/:id/liberar` | admin, admin_recurso | Liberar (mueve a historial) |
| GET | `/api/recursos/historial/lista` | Autenticado | Lista historial paginado |
| GET | `/api/recursos/historial/stats` | Autenticado | Estadisticas |
| GET | `/api/recursos/:id/historial` | Autenticado | Historial de recurso |

### Frontend (`views/AdminRecursoView.vue`) - Rediseno Completo
- **Tab Recursos**:
  - Lista unificada de todos los recursos (consultorios + habitaciones)
  - Filtros por tipo (CONSULTORIO, HABITACION) y estado (libre/ocupado)
  - Estadisticas: Total recursos, Libres, Ocupados, por estatus
  - Acciones: Asignar, Editar uso, Liberar, Configurar recurso
- **Tab Historial** (nuevo):
  - Tabla con historial de uso de recursos
  - Filtros: Tipo recurso, Rango de fechas
  - Columnas: Recurso, Tipo, Paciente, Doctor, Especialidad, Fechas, Duracion, Estatus
  - Paginacion
  - Estadisticas: Total usos, Duracion promedio
- **Modales**:
  - Modal Crear/Editar Recurso: nombre, codigo, tipo, ubicacion, capacidad, descripcion
  - Modal Asignar Paciente: nombre, apellidos, telefono, doctor, estatus, notas
  - Modal Liberar Recurso: confirmacion con resumen y notas finales

### Flujo de Operacion
```
1. CREAR RECURSO → INSERT en `recursos`
2. ASIGNAR PACIENTE → INSERT en `uso_recursos`
3. ACTUALIZAR ESTADO → UPDATE en `uso_recursos`
4. LIBERAR RECURSO → INSERT en `historial_recursos` + DELETE de `uso_recursos`
```

### Tipos de Recursos y Estados
| Tipo | Descripcion | Estados Comunes |
|------|-------------|-----------------|
| CONSULTORIO | Consultorios medicos | OCUPADO |
| HABITACION | Habitaciones de internado | HOSPITALIZACION, QUIROFANO, RECUPERACION, TERAPIA, URGENCIAS |

| Estado | Descripcion |
|--------|-------------|
| OCUPADO | Ocupacion generica (consultorios) |
| HOSPITALIZACION | Paciente hospitalizado |
| QUIROFANO | En quirofano |
| RECUPERACION | En recuperacion |
| TERAPIA | En terapia |
| URGENCIAS | Atencion de urgencias |
| MANTENIMIENTO | Recurso en mantenimiento |

### Archivos Creados
- `backend/database/migrations/007_recursos_unificados.js`
- `backend/database/migrations/008_migrar_hospitalizaciones.js`
- `backend/models/recurso.js`
- `backend/models/usoRecurso.js`
- `backend/models/historialRecurso.js`
- `backend/controllers/recursoController.js`
- `backend/routes/recursos.js`

### Archivos Modificados
- `backend/server.js` - Agregada ruta `/api/recursos`
- `frontend/src/views/AdminRecursoView.vue` - Rediseno completo con sistema unificado

---

## [2026-01-21] - Modal de Hospitalizaciones en Admin Recursos

### Base de Datos
- **Migracion** `006_hospitalizaciones.js`: Nueva tabla `hospitalizaciones`
  - `paciente_nombre`, `paciente_apellidos`, `telefono`
  - `habitacion` (identificador de habitacion)
  - `doctor_id` (FK a doctors)
  - `fecha_ingreso`, `fecha_egreso`
  - `estatus`: ENUM (HOSPITALIZACION, QUIROFANO, RECUPERACION, EGRESO, TERAPIA, URGENCIAS, MANTENIMIENTO, DESOCUPADA)
  - `notas`, `is_active`, timestamps

### Backend - Modelo (`models/hospitalizacion.js`)
- `findAll()`: Lista con filtros (is_active, estatus, habitacion, doctor_id) + JOIN con doctors
- `findById()`: Obtener por ID con nombre del doctor
- `findByHabitacion()`: Verificar si habitacion esta ocupada
- `create()`, `update()`, `delete()`: CRUD completo
- `getEstadisticas()`: Conteo por estatus

### Backend - Controlador (`controllers/hospitalizacionController.js`)
- Validacion Joi para create y update
- Verificacion de habitacion ocupada antes de asignar
- CRUD completo con mensajes de error descriptivos
- Endpoint de estadisticas

### Backend - Rutas (`routes/hospitalizaciones.js`)
| Metodo | Ruta | Roles | Descripcion |
|--------|------|-------|-------------|
| GET | `/api/hospitalizaciones` | Autenticado | Listar hospitalizaciones |
| GET | `/api/hospitalizaciones/stats` | Autenticado | Estadisticas por estatus |
| GET | `/api/hospitalizaciones/:id` | Autenticado | Obtener por ID |
| POST | `/api/hospitalizaciones` | admin, admin_recurso | Crear hospitalizacion |
| PUT | `/api/hospitalizaciones/:id` | admin, admin_recurso | Actualizar |
| DELETE | `/api/hospitalizaciones/:id` | admin, admin_recurso | Desactivar (soft delete) |

### Frontend (`views/AdminRecursoView.vue`)
- **Tabla de hospitalizaciones**: Columnas: Habitacion, Paciente, Doctor, Fecha Ingreso, Telefono, Estatus, Acciones
- **Estadisticas visuales**: Cards con conteo por estatus y colores distintivos
- **Modal completo**: Formulario con campos:
  - Habitacion (obligatorio)
  - Nombre y Apellidos del paciente (obligatorios)
  - Telefono de contacto
  - Doctor responsable (select con lista de doctores activos)
  - Fecha de ingreso (datetime-local)
  - Estatus (select con 8 opciones)
  - Fecha de egreso (visible solo si estatus = EGRESO)
  - Notas/observaciones
- **Funciones CRUD**: Crear, editar, eliminar hospitalizaciones
- **Colores por estatus**: Badges y bordes con colores distintivos por cada estatus

### Tabla de Estatus y Colores
| Estatus | Color Badge | Color Borde |
|---------|-------------|-------------|
| HOSPITALIZACION | Azul | blue-500 |
| QUIROFANO | Rojo | red-500 |
| RECUPERACION | Amarillo | yellow-500 |
| EGRESO | Gris | gray-400 |
| TERAPIA | Morado | purple-500 |
| URGENCIAS | Naranja | orange-500 |
| MANTENIMIENTO | Gris | gray-400 |
| DESOCUPADA | Verde | green-500 |

### Archivos Creados
- `backend/database/migrations/006_hospitalizaciones.js`
- `backend/models/hospitalizacion.js`
- `backend/controllers/hospitalizacionController.js`
- `backend/routes/hospitalizaciones.js`

### Archivos Modificados
- `backend/server.js` - Agregada ruta `/api/hospitalizaciones`
- `frontend/src/views/AdminRecursoView.vue` - Tab Habitaciones ahora muestra hospitalizaciones

---

## [2026-01-18] - Mejoras a Servicios: Tipo, Categoria y Codigo Automatico

### Base de Datos
- **Migracion** `005_services_tipo_categoria.js`: Nuevos campos en tabla `services`
  - `tipo`: ENUM ('servicio', 'recurso') - default 'servicio'
  - `categoria`: VARCHAR(50) - para agrupar servicios

### Backend (`models/service.js`)
- Agregados campos `tipo` y `categoria` a create() y update()
- **Generacion automatica de prefix**: Primera letra del nombre en mayuscula
- Codigo y prefijo ahora son generados automaticamente

### Backend (`controllers/serviceController.js`)
- **Funcion `generateCodeFromName()`**: Genera codigo URL-friendly del nombre
  - Ejemplo: "Rayos X Torax" → "rayos-x-torax"
- Validacion Joi con `.unknown(true)` para ignorar campos extra (id, code, etc.)
- Eliminados campos `code` y `prefix` del esquema de validacion
- Codigo se genera automaticamente al crear/editar servicio

### Frontend (`views/AdminView.vue`)
- **Bug fix**: Boton "Agregar Servicio" ahora limpia correctamente el formulario
  - Nueva funcion `openNewServiceModal()` que resetea `editingService` y `serviceForm`
- **Modal de servicio simplificado**: Solo campos:
  - Nombre (obligatorio)
  - Duracion Estimada
  - Tipo (Servicio/Recurso)
  - Categoria
- **Eliminados del modal**: Campos Codigo y Prefijo (ahora son automaticos)
- **Tabla de servicios**: Muestra columnas Tipo y Categoria

### Generacion Automatica
| Campo | Generacion |
|-------|------------|
| code | Nombre normalizado: minusculas, sin acentos, espacios → guiones |
| prefix | Primera letra del nombre en mayuscula |

### Ejemplos
| Nombre | Codigo | Prefijo |
|--------|--------|---------|
| Consulta General | consulta-general | C |
| Rayos X Torax | rayos-x-torax | R |
| Laboratorio Clinico | laboratorio-clinico | L |

### Archivos Modificados
- `backend/database/migrations/005_services_tipo_categoria.js` (nuevo)
- `backend/models/service.js`
- `backend/controllers/serviceController.js`
- `frontend/src/views/AdminView.vue`

---

## [2026-01-17] - Nuevos Roles de Usuario

### Base de Datos
- **Migracion** `004_add_resource_roles.js`: Agregados nuevos valores al ENUM `user_role`
  - `admin_recurso`: Administrador de Recursos
  - `pan_recurso`: Panel de Recursos

### Backend (`controllers/authController.js`)
- Actualizadas validaciones Joi para aceptar nuevos roles
- Agregadas contrasenas por defecto para nuevos roles

### Frontend (`views/AdminView.vue`)
- **Select de roles**: Agregadas opciones "Admin Recursos" y "Panel Recursos"
- **Badges**: Colores naranja para admin_recurso, teal para pan_recurso
- **Labels**: Etiquetas legibles para nuevos roles
- **Passwords**: Contrasenas por defecto configuradas

### Tabla de Roles y Contrasenas
| Rol | Etiqueta | Contrasena | Color Badge |
|-----|----------|------------|-------------|
| admin | Administrador | admin123# | Morado |
| capturista | Capturista | captura123# | Azul |
| medico | Medico | medico123 | Verde |
| display | Pantalla | display123 | Gris |
| admin_recurso | Admin Recursos | recurso123# | Naranja |
| pan_recurso | Panel Recursos | panrecurso123 | Teal |

---

## [2026-01-17] - Eliminacion de Medicos y Filtrado

### Backend (`controllers/doctorController.js`)
- **Eliminacion con desactivacion**: Al eliminar un medico, tambien se desactiva el usuario asociado
- **Soft delete**: Los medicos no se borran de la BD, se marcan como `is_active = false`

### Frontend (`views/AdminView.vue`)
- **Boton Eliminar**: Agregado boton rojo "Eliminar Medico" en modal de edicion
- **Confirmacion**: Dialog de confirmacion antes de eliminar
- **Filtrado**: Lista de medicos ahora solo muestra activos (`?is_active=true`)
- **Columna Estado removida**: Ya no se muestra columna "Estado" (todos son activos)
- **Modal limpio**: Se limpia el formulario al abrir modal para nuevo medico

### Comportamiento
| Accion | Resultado |
|--------|-----------|
| Eliminar medico | `doctors.is_active = false`, `users.is_active = false` |
| Lista medicos | Solo muestra `is_active = true` |
| Medico eliminado | Desaparece de la lista, no puede hacer login |

---

## [2026-01-17] - Mejoras en Gestion de Medicos

### Backend (`controllers/doctorController.js`)
- **Nueva generacion de username**: formato `primera_letra.apellido`
  - Ejemplo: "Juan Perez Garcia" → `j.perez`
  - Ejemplo: "Maria López Hernández" → `m.lopez`
- **Usernames unicos**: Si existe, agrega sufijo numerico (`j.perez1`, `j.perez2`, etc.)
- **Edicion de username**: Endpoint PUT `/api/doctors/:id` ahora permite modificar el username del usuario asociado
- **Validacion**: Verifica que el nuevo username no exista antes de actualizar

### Backend (`models/user.js`)
- Agregada capacidad de actualizar `username` en el metodo `update()`

### Backend (`models/doctor.js`)
- Agregado `users.username` al SELECT en `findAll()` para mostrar username en lista

### Frontend (`views/AdminView.vue`)
- **Tabla de medicos**: Nueva columna "Usuario" que muestra el username
- **Modal de edicion**:
  - Campo "Usuario de Acceso" editable (solo visible al editar)
  - Nota informativa al crear nuevo medico sobre generacion automatica
- **Formulario**: Agregado campo `username` a `doctorForm`

### Formato de Username
| Nombre Completo | Username Generado |
|-----------------|-------------------|
| Juan Perez Garcia | j.perez |
| Maria Lopez Hernandez | m.lopez |
| Jose Perez Lopez | j.perez1 (si j.perez existe) |
| Ana Perez Martinez | j.perez2 (si j.perez1 existe) |

### Archivos Modificados
- `backend/controllers/doctorController.js`
- `backend/models/doctor.js`
- `backend/models/user.js`
- `frontend/src/views/AdminView.vue`

---

## [2026-01-17] - Cambio de Contrasenas por Defecto

### Modificado
- Contrasena generica de **admin** cambiada de `admin123` a `admin123#`
- Contrasena generica de **capturista** cambiada de `capturista123` a `captura123#`
- Archivos actualizados:
  - `backend/controllers/authController.js`
  - `backend/database/seeds/001_initial_data.js`
  - `frontend/src/views/AdminView.vue`
  - `PRD.md`
  - `bitacora/diagrama.md`

### Tabla de Contrasenas Actuales
| Rol | Contrasena |
|-----|------------|
| Admin | admin123# |
| Capturista | captura123# |
| Medico | medico123 |
| Display | display123 |

---

## [2026-01-17] - Configuracion del Sistema y Diseno Minimalista

### Agregado

#### Backend
- **Migracion** `003_system_settings.js` - Tabla para configuracion del sistema
- **Modelo** `models/settings.js` - Acceso a datos de configuracion
- **Controlador** `controllers/settingsController.js` - Logica para GET/PUT settings con upload de archivos
- **Rutas** `routes/settings.js` - Endpoints `/api/settings`
- **Multer** - Instalado para manejo de uploads de imagenes

#### Frontend
- **Store** `stores/settings.js` - Estado global de configuracion (Pinia)
- **Tab Configuracion** en AdminView - Formulario para editar nombre, logo y fondo
- **Carga dinamica** de nombre y logo en App.vue
- **Fondo dinamico** en PublicDisplayView.vue

### Modificado

#### Backend
- `server.js` - Agregada ruta `/api/settings` y servicio de archivos estaticos `/uploads`

#### Frontend
- `services/api.js` - Interceptor para manejar FormData correctamente (eliminar Content-Type header)
- `vite.config.js` - Proxy para `/uploads` y `host: '0.0.0.0'`
- `App.vue` - Muestra nombre del hospital y logo dinamico en header
- `PublicDisplayView.vue` - **Rediseno minimalista completo**

### Diseno Minimalista (PublicDisplayView)

#### Paleta de Colores
| Elemento | Antes | Despues |
|----------|-------|---------|
| Fondo principal | Azul degradado | Gris claro (`bg-gray-50`) |
| Header | Azul oscuro | Blanco con sombra |
| Paneles | Azul (#1e40af) | Blanco con bordes sutiles |
| Textos | Blanco | Negro/Gris oscuro |
| Codigo turno | Blanco | Azul (`text-blue-600`) |

#### Caracteristicas del Diseno
- Fondo blanco/gris claro
- Sombras sutiles (`shadow-sm`, `shadow-md`, `shadow-lg`)
- Bordes finos (`border-gray-100`, `border-gray-200`)
- Titulos en mayusculas con `tracking-wider`
- Aspecto limpio y profesional

### Endpoints API

| Metodo | Ruta | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/api/settings` | No | Obtener configuracion |
| PUT | `/api/settings` | Admin | Actualizar (multipart/form-data) |

### Estructura de Archivos Nuevos

```
backend/
├── controllers/
│   └── settingsController.js
├── models/
│   └── settings.js
├── routes/
│   └── settings.js
├── database/migrations/
│   └── 003_system_settings.js
└── public/uploads/
    ├── logo-*.png
    └── background-*.png

frontend/
└── src/stores/
    └── settings.js
```

### Base de Datos

```sql
CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    hospital_name VARCHAR(255) DEFAULT 'Hospital General',
    logo_path VARCHAR(500),
    background_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Notas Tecnicas

1. **FormData y Axios**: Se agrego interceptor en `api.js` para eliminar el header `Content-Type` cuando se envia FormData, permitiendo que Axios establezca automaticamente el boundary correcto.

2. **Proxy Vite**: Se configuro proxy para `/uploads` en desarrollo para servir archivos estaticos desde el backend.

3. **Eliminacion de archivos**: Al subir nueva imagen, se elimina la anterior del sistema de archivos.

---

## [2026-01-17] - Implementacion Inicial

### Agregado
- Sistema de autenticacion con JWT
- CRUD de servicios, doctores, pacientes
- Sistema de turnos con estados
- Comunicacion en tiempo real con MQTT
- Pantalla publica para visualizacion de turnos
- Panel de administracion
- Panel de capturista
- Panel de medico
