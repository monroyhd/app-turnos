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
- Caddy (reverse proxy + HTTPS)
- Broker MQTT (EMQX o Mosquitto)
- MySQL o PostgreSQL
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
- Crea turnos
- Consulta colas

### Médico
- Atiende turnos
- Cambia estados
- Usuario creado automaticamente al registrar medico

### Público
- Visualiza turnos llamados
- Sin interacción

### Credenciales Automaticas
- **Medicos:** username = employee_number o nombre normalizado, password = medico123
- **Capturistas:** username = nombre normalizado, password = captura123#
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
GET /api/turns/doctor/:id
PUT /api/turns/:id/call
PUT /api/turns/:id/start
PUT /api/turns/:id/finish

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

---

## 9. Pantalla pública
- Snapshot inicial vía REST
- Actualizaciones vía MQTT
- Modo pantalla completa

---

## 10. Base de datos
users
patients
doctors
services (con tipo: servicio/recurso, categoria: texto)
turns
turn_history
system_settings (nombre hospital, logo, fondo)  

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
