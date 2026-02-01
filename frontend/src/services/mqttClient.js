import mqtt from 'mqtt'

class MqttClient {
  constructor() {
    this.client = null
    this.connected = false
    this.handlers = new Map()
    this.hospitalId = 'hospital-1'

    // Page Visibility API para reconectar en Safari cuando la pestaña se reactiva
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && !this.connected && this.client) {
          console.log('MQTT: Pestaña visible, reconectando...')
          this.client.reconnect()
        }
      })
    }
  }

  connect(options = {}) {
    // Usar ruta relativa via proxy Caddy - funciona con IP dinámica
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/mqtt-ws`

    this.client = mqtt.connect(url, {
      clientId: `frontend-${Date.now()}`,
      clean: true,
      reconnectPeriod: 5000,    // Menos agresivo (era 1000ms)
      keepalive: 30,            // Heartbeat cada 30 segundos (evita suspension en Safari)
      connectTimeout: 10000,    // Timeout de conexión
      resubscribe: true         // Re-suscribir automáticamente al reconectar
    })

    this.client.on('connect', () => {
      this.connected = true
      console.log('MQTT: Conectado')
      this.subscribeToTopics()
    })

    this.client.on('message', (topic, message) => {
      try {
        const data = JSON.parse(message.toString())
        this.handleMessage(topic, data)
      } catch (err) {
        console.error('Error parseando mensaje MQTT:', err)
      }
    })

    this.client.on('error', (err) => {
      console.error('MQTT Error:', err)
    })

    this.client.on('close', () => {
      this.connected = false
      console.log('MQTT: Desconectado')
    })
  }

  subscribeToTopics() {
    if (!this.client) return

    // Suscribirse a eventos de turnos
    const turnsTopic = `hospital/${this.hospitalId}/turns/events`
    const displayTopic = `hospital/${this.hospitalId}/display/updates`

    this.client.subscribe([turnsTopic, displayTopic], (err) => {
      if (err) {
        console.error('Error suscribiendo a topics:', err)
      } else {
        console.log('MQTT: Suscrito a topics de turnos')
      }
    })
  }

  handleMessage(topic, data) {
    // Notificar a todos los handlers registrados
    this.handlers.forEach((handler, key) => {
      try {
        handler(data)
      } catch (err) {
        console.error(`Error en handler ${key}:`, err)
      }
    })
  }

  onMessage(key, handler) {
    this.handlers.set(key, handler)
  }

  offMessage(key) {
    this.handlers.delete(key)
  }

  disconnect() {
    if (this.client) {
      this.client.end()
      this.client = null
      this.connected = false
    }
  }
}

// Singleton
const mqttClient = new MqttClient()

export default mqttClient
