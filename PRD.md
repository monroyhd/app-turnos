# PRD – App de Turnos Hospitalarios (PMV)

## 1. Objetivo del producto
Desarrollar un **Producto Mínimo Viable (PMV)** de una **aplicación web de gestión de turnos hospitalarios**, diseñada para operar de forma continua en clínicas u hospitales, con **control estricto de la lógica en backend**, **actualización en tiempo real** y **pantalla pública** para pacientes.

El sistema estará pensado para que **una IA o un equipo técnico** pueda desarrollarlo sin ambigüedades.

---

## 2. Stack tecnológico (definitivo)

### Frontend
- Vue.js 3
- Vue Router
- Pinia
- mqtt.js (WebSocket)
- HTML5 / CSS3

### Backend
- Node.js (LTS)
- Express.js (API REST)
- JWT para autenticación
- Arquitectura en capas

### Comunicación
- API REST (Express)
- MQTT sobre WebSocket

### Infraestructura
- Caddy (reverse proxy + HTTPS, único punto de entrada puerto 80)
- Broker MQTT Mosquitto (solo localhost, acceso via Caddy /mqtt-ws)
- PostgreSQL (solo localhost)
- Docker / docker-compose

---

## 3. Alcance del PMV

### Incluye
- Una sola sucursal
- Roles: Administrador, Capturista, Médico
- Pantalla pública
- Historial auditable
- Tiempo real

### No incluye
- Expediente clínico
- Facturación
- Multi-sucursal
- Integraciones externas

---

## 4. Roles

### Administrador
- Gestiona doctores y servicios
- Gestiona usuarios (capturistas)
- Visualiza turnos
- Al crear doctor, se genera usuario automaticamente
- Configura nombre del hospital, logo y fondo de pantalla

### Capturista
- Registra pacientes
- Crea turnos (nombre y teléfono obligatorios, paciente registrado opcional)
- Busca pacientes por nombre o teléfono
- Cancela turnos en cualquier estado activo
- Consulta colas

### Médico
- Atiende turnos
- Cambia estados
- Usuario creado automaticamente al registrar medico

### Público
- Visualiza turnos llamados
- Visualiza estado de habitaciones (pantalla display-hb)
- Sin interacción

### Admin Habitaciones
- Solo visualiza y gestiona habitaciones (no consultorios)
- Puede asignar pacientes, editar uso y liberar habitaciones
- NO puede crear, configurar ni eliminar recursos

### Credenciales Automaticas
- **Medicos:** username = employee_number o nombre normalizado, password = medico123
- **Capturistas:** username = nombre normalizado, password = captura123#
- **Admin Habitaciones:** password = habitacion123#
- **Email:** username@hospital.com

---

## 5. Lógica central
Toda la lógica de negocio reside en el backend. El frontend solo consume y ejecuta comandos.

---

## 6. Estados del turno
CREATED → WAITING → CALLED → IN_SERVICE → DONE  
NO_SHOW / CANCELLED

---

## 7. API REST

### Turnos
POST /api/turns
- Campos obligatorios: `patient_name`, `patient_phone`, `service_id`
- Campos opcionales: `patient_id` (vincula a paciente registrado), `doctor_id`, `consultorio_id`, `priority`, `notes`
- Paciente registrado opcional: si no se proporciona `patient_id`, el turno se crea solo con nombre y teléfono

GET /api/turns/doctor/:id
PUT /api/turns/:id/call
PUT /api/turns/:id/start
PUT /api/turns/:id/finish
PUT /api/turns/:id/cancel (disponible desde CREATED, WAITING, CALLED, IN_SERVICE)

### Recursos
GET /api/recursos?tipo=CONSULTORIO&is_active=true (consultorios para selector)
GET /api/recursos/display-habitaciones (publico, datos para pantalla de habitaciones)

### Configuracion del Sistema
GET /api/settings (publico)
PUT /api/settings (admin, multipart/form-data para imagenes)

---

## 8. MQTT

### Topics
hospital/{hospitalId}/turns/events

### Eventos
TURN_CREATED
TURN_CALLED
TURN_FINISHED

### Conexión WebSocket
El frontend se conecta a MQTT via ruta relativa `/mqtt-ws` proxiada por Caddy.
Esto permite funcionar con IP dinámica sin configuración adicional.  

---

## 9. Pantallas

### /recepcion - Pantalla Minimalista de Recepcion
- Formulario inline para crear turnos (nombre, telefono, servicio, doctor opcional)
- Lista de turnos activos (WAITING, CALLED, IN_SERVICE)
- Acciones rapidas por estado:
  - WAITING: [Llamar] [Cancelar]
  - CALLED: [Iniciar] [No se presento] [Cancelar]
  - IN_SERVICE: [Finalizar] [Cancelar]
- Estadisticas en tiempo real (esperando, llamados, en atencion, atendidos)
- Doctor opcional para llamar turno
- Roles permitidos: admin, capturista
- Actualizacion via MQTT

### /display - Turnos (publica)
- Snapshot inicial vía REST
- Actualizaciones vía MQTT
- Modo pantalla completa

### /display-hb - Habitaciones (publica)
- Muestra grid con estado de todas las habitaciones
- Colores por estado: LIBRE (verde), HOSPITALIZACION (rojo), QUIROFANO (rojo intenso), RECUPERACION (amarillo), TERAPIA (púrpura), URGENCIAS (naranja), MANTENIMIENTO (gris)
- Auto-refresh cada 30 segundos
- Estadísticas en footer (total, libres, ocupadas)
- Diseño optimizado para TV/monitor grande

---

## 10. Base de datos
users
patients
doctors
services (con tipo: servicio/recurso, categoria: texto)
turns
turn_history
system_settings (nombre hospital, logo, fondo)
recursos (catalogo de recursos fisicos)
uso_recursos (estado actual de ocupacion)
historial_recursos (registro historico de uso)  

---

## 11. Seguridad
- JWT
- ACL MQTT
- Backend como única fuente de verdad

---

## 12. Criterio de finalización
El PMV está completo cuando:
- Se crean turnos
- Se atienden turnos
- La pantalla pública se actualiza en tiempo real
- Existe historial completo


ejemplo  websocket con mqtt
import { CONFIG, logger } from './utils.js'

let mqttClient = null

// Initialize MQTT connection
export function initMQTTConnection(fingerprintId, onMessageCallback) {
  return new Promise((resolve, reject) => {
    try {
      const options = {
        keepalive: 60,
        connectTimeout: 4000,
        clean: true,
        protocolVersion: 5,
        clientId: fingerprintId,
        username: fingerprintId
      }

      mqttClient = mqtt.connect(CONFIG.mqttBrokerUrl, options)
      const topic = `screens/${fingerprintId}`

      mqttClient.on('connect', () => {
        logger.log('Conectado a MQTT broker')

        mqttClient.subscribe(topic, { qos: 1 }, (error) => {
          if (!error) {
            logger.log(`Suscrito al topic: ${topic}`)
            resolve(mqttClient)
          } else {
            logger.error('Error al suscribirse:', error)
            reject(error)
          }
        })
      })

      mqttClient.on('message', (inTopic, message) => {
        try {
          const payload = JSON.parse(message.toString())
          logger.log('Mensaje MQTT recibido:', payload)

          if (onMessageCallback) {
            onMessageCallback(payload)
          }
        } catch (error) {
          logger.error('Error al procesar mensaje MQTT:', error)
        }
      })

      mqttClient.on('error', (error) => {
        logger.error('Error MQTT:', error)
      })

      mqttClient.on('offline', () => {
        logger.warn('MQTT desconectado')
      })

      mqttClient.on('reconnect', () => {
        logger.log('Intentando reconectar MQTT...')
      })

    } catch (error) {
      logger.error('Error al inicializar MQTT:', error)
      reject(error)
    }
  })
}

// Disconnect MQTT
export function disconnectMQTT() {
  if (mqttClient) {
    mqttClient.end()
    mqttClient = null
    logger.log('MQTT desconectado')
  }
}
