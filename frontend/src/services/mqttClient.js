import mqtt from 'mqtt'

class MqttClient {
  constructor() {
    this.client = null
    this.connected = false
    this.handlers = new Map()
    this.hospitalId = 'hospital-1'
  }

  connect(options = {}) {
    const host = options.host || window.location.hostname
    const port = options.port || 9001
    const url = `ws://${host}:${port}`

    this.client = mqtt.connect(url, {
      clientId: `frontend-${Date.now()}`,
      clean: true,
      reconnectPeriod: 1000
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
