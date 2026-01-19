require('dotenv').config();

module.exports = {
  broker: {
    host: process.env.MQTT_HOST || 'localhost',
    port: parseInt(process.env.MQTT_PORT) || 1883,
    protocol: process.env.MQTT_PROTOCOL || 'mqtt'
  },

  auth: {
    username: process.env.MQTT_USERNAME || '',
    password: process.env.MQTT_PASSWORD || ''
  },

  options: {
    clientId: `turnos-api-${process.pid}-${Date.now()}`,
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 1000,
    keepalive: 60
  },

  topics: {
    turnEvents: (hospitalId) => `hospital/${hospitalId}/turns/events`,
    displayUpdates: (hospitalId) => `hospital/${hospitalId}/display/updates`,
    doctorQueue: (hospitalId, doctorId) => `hospital/${hospitalId}/doctor/${doctorId}/queue`
  }
};
