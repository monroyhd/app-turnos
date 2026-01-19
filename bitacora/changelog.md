# Changelog - Sistema de Turnos Hospitalarios

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
