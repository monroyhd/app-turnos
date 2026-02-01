# Diagrama del Sistema de Turnos Hospitalarios

## 1. Arquitectura General

```mermaid
flowchart TB
    subgraph Frontend["Frontend (Vue.js 3)"]
        Login[LoginView]
        Cap[CapturistaView]
        Doc[DoctorView]
        Admin[AdminView + Config Tab]
        Display[PublicDisplayView<br/>Diseno Minimalista]
        SettingsStore[(Settings Store)]
    end

    subgraph Backend["Backend (Node.js/Express)"]
        API[REST API]
        Auth[Auth Middleware]
        Controllers[Controllers]
        SettingsCtrl[SettingsController]
        Services[Services]
        Models[Models]
        Uploads[/uploads Static Files]
    end

    subgraph Infra["Infraestructura"]
        PG[(PostgreSQL)]
        MQTT[Mosquitto MQTT]
        FS[File System<br/>uploads/]
    end

    Frontend -->|HTTP/REST| API
    API --> Auth
    Auth --> Controllers
    Auth --> SettingsCtrl
    Controllers --> Services
    SettingsCtrl --> Models
    SettingsCtrl --> FS
    Services --> Models
    Models --> PG
    Services -->|Publish| MQTT
    MQTT -->|WebSocket| Frontend
    Frontend -->|GET /uploads/*| Uploads
    SettingsStore -->|loadSettings| API
```

## 2. Flujo de Estados del Turno

```mermaid
stateDiagram-v2
    [*] --> CREATED: Turno creado
    CREATED --> WAITING: Auto (al crear)
    WAITING --> CALLED: Doctor llama
    WAITING --> CANCELLED: Cancelar
    CALLED --> IN_SERVICE: Iniciar atencion
    CALLED --> NO_SHOW: No se presento
    CALLED --> WAITING: Volver a cola
    CALLED --> CANCELLED: Cancelar
    IN_SERVICE --> DONE: Finalizar
    IN_SERVICE --> CANCELLED: Cancelar
    DONE --> [*]
    NO_SHOW --> [*]
    CANCELLED --> [*]
```

## 3. Roles y Permisos

```mermaid
flowchart LR
    subgraph Roles
        Admin[Admin]
        Cap[Capturista]
        Med[Medico]
        Disp[Display]
        AdminRec[Admin Recursos]
        PanRec[Panel Recursos]
    end

    subgraph Acciones
        A1[Gestionar usuarios]
        A2[Gestionar doctores]
        A3[Gestionar servicios]
        A4[Crear turnos]
        A5[Registrar pacientes]
        A6[Llamar turnos]
        A7[Atender turnos]
        A8[Ver pantalla publica]
        A9[Gestionar recursos]
        A10[Ver panel recursos]
    end

    Admin --> A1
    Admin --> A2
    Admin --> A3
    Admin --> A4
    Admin --> A5
    Admin --> A6
    Admin --> A7

    Cap --> A4
    Cap --> A5

    Med --> A6
    Med --> A7

    Disp --> A8

    AdminRec --> A9
    PanRec --> A10
```

## 4. Flujo de Creacion de Turno

```mermaid
sequenceDiagram
    participant C as Capturista
    participant API as Backend API
    participant DB as PostgreSQL
    participant MQTT as Mosquitto
    participant D as Doctor Panel
    participant P as Pantalla Publica

    C->>API: POST /api/turns
    API->>DB: Generar codigo (A001, A002...)
    API->>DB: INSERT turn (CREATED)
    API->>DB: UPDATE turn (WAITING)
    API->>DB: INSERT turn_history
    API->>MQTT: TURN_CREATED + QUEUE_UPDATE
    API-->>C: 201 Created
    MQTT-->>D: Evento recibido
    D->>API: GET /api/turns/my-turns
    API-->>D: Lista actualizada
    MQTT-->>P: Evento recibido
    P->>API: GET /api/turns/display
    API-->>P: Cola actualizada
```

## 5. Flujo de Atencion de Turno

```mermaid
sequenceDiagram
    participant D as Doctor
    participant API as Backend API
    participant DB as PostgreSQL
    participant MQTT as Mosquitto
    participant P as Pantalla Publica

    D->>API: PUT /api/turns/:id/call
    API->>DB: UPDATE status = CALLED
    API->>MQTT: TURN_CALLED + DISPLAY_UPDATE
    API-->>D: 200 OK
    MQTT-->>P: Mostrar turno llamado
    Note over P: A005 - Consultorio 101

    D->>API: PUT /api/turns/:id/start
    API->>DB: UPDATE status = IN_SERVICE
    API->>MQTT: TURN_STARTED
    API-->>D: 200 OK

    D->>API: PUT /api/turns/:id/finish
    API->>DB: UPDATE status = DONE
    API->>MQTT: TURN_FINISHED + QUEUE_UPDATE
    API-->>D: 200 OK
    MQTT-->>P: Actualizar cola
```

## 6. Modelo de Base de Datos

```mermaid
erDiagram
    USERS ||--o{ DOCTORS : "user_id"
    USERS ||--o{ TURNS : "created_by"
    USERS ||--o{ TURN_HISTORY : "changed_by"

    PATIENTS ||--o{ TURNS : "patient_id"
    DOCTORS ||--o{ TURNS : "doctor_id"
    SERVICES ||--o{ TURNS : "service_id"

    TURNS ||--o{ TURN_HISTORY : "turn_id"

    DOCTORS }|--o{ DOCTOR_SERVICES : "doctor_id"
    SERVICES }|--o{ DOCTOR_SERVICES : "service_id"

    SERVICES ||--o{ TURN_COUNTERS : "service_id"

    USERS {
        int id PK
        string username UK
        string email UK
        string password_hash
        enum role
        string full_name
        boolean is_active
    }

    PATIENTS {
        int id PK
        string curp UK
        string full_name
        date birth_date
        string phone
        boolean is_preferential
    }

    DOCTORS {
        int id PK
        int user_id FK
        string full_name
        string specialty
        string email
        string phone
    }

    SERVICES {
        int id PK
        string name
        string code UK
        char prefix
        int estimated_duration
        enum tipo
        string categoria
    }

    TURNS {
        int id PK
        string code
        int patient_id FK
        int service_id FK
        int doctor_id FK
        int consultorio_id FK
        enum status
        int priority
        timestamp created_at
        timestamp waiting_at
        timestamp called_at
        timestamp finished_at
    }

    RECURSOS ||--o{ TURNS : "consultorio_id"

    TURN_HISTORY {
        int id PK
        int turn_id FK
        enum previous_status
        enum new_status
        int changed_by FK
        timestamp created_at
    }

    SYSTEM_SETTINGS {
        int id PK
        string hospital_name
        string logo_path
        string background_path
        timestamp created_at
        timestamp updated_at
    }

    HOSPITALIZACIONES {
        int id PK
        string paciente_nombre
        string paciente_apellidos
        string telefono
        string habitacion
        int doctor_id FK
        timestamp fecha_ingreso
        timestamp fecha_egreso
        enum estatus
        text notas
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    RECURSOS {
        int id PK
        string nombre
        string codigo UK
        enum tipo
        string ubicacion
        int capacidad
        text descripcion
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    USO_RECURSOS {
        int id PK
        int recurso_id FK UK
        string paciente_nombre
        string paciente_apellidos
        string telefono
        int doctor_id FK
        timestamp fecha_inicio
        enum estatus
        text notas
        timestamp created_at
        timestamp updated_at
    }

    HISTORIAL_RECURSOS {
        int id PK
        int recurso_id FK
        string recurso_nombre
        string recurso_tipo
        string paciente_nombre
        string paciente_apellidos
        string telefono
        int doctor_id FK
        string doctor_nombre
        string especialidad
        timestamp fecha_inicio
        timestamp fecha_fin
        int duracion_minutos
        string estatus_final
        text notas
        timestamp created_at
    }

    DOCTORS ||--o{ HOSPITALIZACIONES : "doctor_id"
    RECURSOS ||--o{ USO_RECURSOS : "recurso_id"
    RECURSOS ||--o{ HISTORIAL_RECURSOS : "recurso_id"
    DOCTORS ||--o{ USO_RECURSOS : "doctor_id"
    DOCTORS ||--o{ HISTORIAL_RECURSOS : "doctor_id"
```

## 7. Comunicacion MQTT

```mermaid
flowchart TB
    subgraph Backend
        TS[TurnService]
        MS[MqttService]
    end

    subgraph Topics["Topics MQTT"]
        T1[hospital/hospital-1/turns/events]
        T2[hospital/hospital-1/display/updates]
    end

    subgraph Eventos
        E1[TURN_CREATED]
        E2[TURN_CALLED]
        E3[TURN_STARTED]
        E4[TURN_FINISHED]
        E5[QUEUE_UPDATE]
    end

    subgraph Clientes["Clientes Frontend"]
        Doc[DoctorView]
        Cap[CapturistaView]
        Disp[PublicDisplayView]
    end

    TS -->|Publica| MS
    MS --> T1
    MS --> T2

    T1 --> E1
    T1 --> E2
    T1 --> E3
    T1 --> E4
    T1 --> E5

    T2 -->|WebSocket via /mqtt-ws| Doc
    T2 -->|WebSocket via /mqtt-ws| Cap
    T2 -->|WebSocket via /mqtt-ws| Disp
```

## 7.1 Arquitectura de Red

```mermaid
flowchart TB
    subgraph Externa["Acceso Externo (Puerto 80)"]
        Usuario[Usuario/Browser]
    end

    subgraph Caddy["Caddy Reverse Proxy :80"]
        Route1["/api/* → localhost:3000"]
        Route2["/uploads/* → localhost:3000"]
        Route3["/mqtt-ws → localhost:9001"]
        Route4["/* → frontend estático"]
    end

    subgraph Servicios["Servicios Internos (solo localhost)"]
        API[Backend API<br/>localhost:3000]
        MQTT[Mosquitto MQTT<br/>TCP: localhost:1883<br/>WS: localhost:9001]
        PG[(PostgreSQL<br/>localhost:5432)]
    end

    Usuario -->|HTTP/WS :80| Caddy
    Route1 --> API
    Route2 --> API
    Route3 --> MQTT
    API -->|TCP| MQTT
    API --> PG
```

### Beneficios de la Arquitectura
| Aspecto | Descripcion |
|---------|-------------|
| **Seguridad** | Solo puerto 80 expuesto, servicios internos en localhost |
| **IP Dinámica** | Frontend usa rutas relativas, funciona sin configurar IP |
| **Simplicidad** | Todo el tráfico pasa por Caddy como punto único de entrada |
| **HTTPS Ready** | Caddy puede agregar HTTPS sin cambios en servicios internos |

## 8. Endpoints API

```mermaid
flowchart LR
    subgraph Auth["/api/auth"]
        A1[POST /login]
        A2[GET /me]
        A3[POST /register]
        A4[GET /users]
    end

    subgraph Turns["/api/turns"]
        T1[GET /]
        T2[POST /]
        T3[GET /queue]
        T4[GET /display]
        T5[GET /my-turns]
        T6[PUT /:id/call]
        T7[PUT /:id/start]
        T8[PUT /:id/finish]
        T9[PUT /:id/no-show]
        T10[PUT /:id/cancel]
    end

    subgraph Patients["/api/patients"]
        P1[GET /]
        P2[POST /]
        P3[GET /:id]
    end

    subgraph Doctors["/api/doctors"]
        D1[GET /]
        D2[POST /]
        D3[GET /:id]
    end

    subgraph Services["/api/services"]
        S1[GET /]
        S2[POST /]
    end

    subgraph Settings["/api/settings"]
        SET1[GET / - publico]
        SET2[PUT / - admin multipart]
    end

    subgraph Hosp["/api/hospitalizaciones"]
        H1[GET / - listar]
        H2[GET /stats - estadisticas]
        H3[GET /:id - por ID]
        H4[POST / - crear]
        H5[PUT /:id - actualizar]
        H6[DELETE /:id - desactivar]
    end

    subgraph Recursos["/api/recursos"]
        R1[GET / - listar recursos]
        R2[GET /:id - recurso con estado]
        R3[POST / - crear recurso]
        R4[PUT /:id - actualizar recurso]
        R5[DELETE /:id - desactivar]
        R6[GET /uso/ocupados - ocupados]
        R7[POST /:id/asignar - asignar paciente]
        R8[PUT /:id/actualizar-uso - actualizar uso]
        R9[POST /:id/liberar - liberar recurso]
        R10[GET /historial/lista - historial]
        R11[GET /historial/stats - estadisticas]
        R12[GET /:id/historial - historial recurso]
    end
```

## 9. Flujo de Creacion Automatica de Usuarios

```mermaid
sequenceDiagram
    participant A as Admin
    participant API as Backend API
    participant DB as PostgreSQL

    Note over A,DB: Crear Doctor con Usuario Automatico
    A->>API: POST /api/doctors
    API->>API: Generar username (letra.apellido)
    API->>DB: SELECT * FROM users WHERE username = ?
    alt Username existe
        API->>API: Agregar sufijo numerico (letra.apellido1)
    end
    API->>DB: INSERT user (rol: medico, pass: medico123)
    API->>DB: INSERT doctor (user_id vinculado)
    API-->>A: 201 Created + credenciales

    Note over A,DB: Editar Username de Medico
    A->>API: PUT /api/doctors/:id {username: "nuevo.user"}
    API->>DB: SELECT * FROM users WHERE username = ?
    alt Username disponible
        API->>DB: UPDATE users SET username = ?
        API-->>A: 200 OK
    else Username existe
        API-->>A: 409 Conflict
    end

    Note over A,DB: Crear Capturista/Admin/Display
    A->>API: POST /api/auth/register
    API->>DB: INSERT user (rol: seleccionado, pass: rol+123)
    API-->>A: 201 Created
```

### Logica de Generacion de Credenciales

| Rol | Username | Email | Password |
|-----|----------|-------|----------|
| Medico | letra.apellido (j.perez) | email del formulario | medico123 |
| Admin | nombre normalizado | username@hospital.com | admin123# |
| Capturista | nombre normalizado | username@hospital.com | captura123# |
| Display | nombre normalizado | username@hospital.com | display123 |
| Admin Recursos | nombre normalizado | username@hospital.com | recurso123# |
| Panel Recursos | nombre normalizado | username@hospital.com | panrecurso123 |

**Formato de Username para Medicos:**
- Primera letra del nombre + punto + primer apellido
- Ejemplo: "Juan Perez Garcia" → `j.perez`
- Ejemplo: "Maria Lopez Hernandez" → `m.lopez`
- Si existe, agrega sufijo: `j.perez1`, `j.perez2`, etc.

**Normalizacion de nombre (otros roles):**
- Convertir a minusculas
- Eliminar acentos
- Reemplazar espacios con puntos
- Ejemplo: "Dr. Maria Garcia" → "dr.maria.garcia"

---

## 10. Flujo de Configuracion del Sistema

```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Frontend
    participant Store as Settings Store
    participant API as Backend API
    participant DB as PostgreSQL
    participant FS as File System

    Note over A,FS: Cargar Configuracion Inicial
    FE->>Store: loadSettings()
    Store->>API: GET /api/settings
    API->>DB: SELECT * FROM system_settings
    API-->>Store: {hospital_name, logo_path, background_path}
    Store-->>FE: hospitalName, logoUrl, backgroundUrl
    FE->>FE: Renderizar header y pantalla publica

    Note over A,FS: Actualizar Configuracion (Admin)
    A->>FE: Editar nombre, subir logo/fondo
    FE->>API: PUT /api/settings (FormData)
    API->>FS: Guardar archivos en /uploads
    API->>FS: Eliminar archivos anteriores
    API->>DB: UPDATE system_settings
    API-->>FE: {success, data}
    FE->>Store: Actualizar estado
    Store-->>FE: Re-renderizar vistas
```

## 11. Diseno Minimalista - Pantalla Publica

```mermaid
flowchart TB
    subgraph Layout["PublicDisplayView - Layout"]
        direction TB
        Header["Header (Blanco)<br/>Logo + Nombre Hospital + Reloj"]

        subgraph Main["Area Principal"]
            direction LR
            subgraph Left["Panel Izquierdo (2/3)"]
                CurrentTurn["Turno Actual<br/>Codigo grande azul<br/>Nombre paciente<br/>Consultorio + Doctor"]
                RecentCalls["Turnos Llamados<br/>Grid 3 columnas"]
            end

            subgraph Right["Panel Derecho (1/3)"]
                WaitingList["Cola de Espera<br/>Lista numerada"]
                Stats["Estadisticas<br/>Total + Atendidos"]
            end
        end
    end

    subgraph Colors["Paleta de Colores"]
        BG["Fondo: gray-50"]
        Panels["Paneles: white + shadow"]
        Text["Textos: gray-800/900"]
        Accent["Acento: blue-600"]
        Success["Exito: green-600"]
    end
```

### Componentes Visuales

| Componente | Estilo |
|------------|--------|
| Fondo | `bg-gray-50` (gris muy claro) |
| Header | `bg-white shadow-sm border-b` |
| Panel turno actual | `bg-white rounded-2xl shadow-lg` |
| Codigo turno | `text-8xl font-bold text-blue-600` |
| Paneles secundarios | `bg-white rounded-xl shadow-md` |
| Items de lista | `bg-gray-50 border border-gray-200` |
| Titulos | `text-gray-600 uppercase tracking-wider` |
| Textos | `text-gray-800` / `text-gray-900` |

---

## 12. Flujo de Gestion de Recursos Unificado

```mermaid
sequenceDiagram
    participant A as Admin Recursos
    participant API as Backend API
    participant DB as PostgreSQL

    Note over A,DB: 1. Crear Recurso
    A->>API: POST /api/recursos
    API->>DB: INSERT INTO recursos
    API-->>A: 201 Created

    Note over A,DB: 2. Asignar Paciente
    A->>API: POST /api/recursos/:id/asignar
    API->>DB: Verificar recurso libre
    API->>DB: INSERT INTO uso_recursos
    API-->>A: 201 Paciente asignado

    Note over A,DB: 3. Actualizar Estado
    A->>API: PUT /api/recursos/:id/actualizar-uso
    API->>DB: UPDATE uso_recursos
    API-->>A: 200 OK

    Note over A,DB: 4. Liberar Recurso
    A->>API: POST /api/recursos/:id/liberar
    API->>DB: SELECT datos de uso_recursos
    API->>DB: Calcular duracion
    API->>DB: INSERT INTO historial_recursos
    API->>DB: DELETE FROM uso_recursos
    API-->>A: 200 Recurso liberado
```

### Tipos de Recursos
| Tipo | Descripcion | Estatus Comunes |
|------|-------------|-----------------|
| CONSULTORIO | Consultorios medicos | OCUPADO |
| HABITACION | Habitaciones de internado | HOSPITALIZACION, QUIROFANO, RECUPERACION, TERAPIA, URGENCIAS |

### Estados de Uso
| Estado | Descripcion |
|--------|-------------|
| OCUPADO | Ocupacion generica (consultorios) |
| HOSPITALIZACION | Paciente hospitalizado |
| QUIROFANO | En quirofano |
| RECUPERACION | En recuperacion |
| TERAPIA | En terapia |
| URGENCIAS | Atencion de urgencias |
| MANTENIMIENTO | Recurso en mantenimiento |

---

**Ultima actualizacion:** 2026-01-30 (v13 - Arquitectura de red via localhost, MQTT WebSocket via Caddy proxy /mqtt-ws)
