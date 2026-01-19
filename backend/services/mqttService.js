const mqtt = require('mqtt');
const config = require('../config/app');
const mqttConfig = require('../config/mqtt');
const { logger } = require('../middleware/errorHandler');

class MqttService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.hospitalId = config.hospital.id;
  }

  connect() {
    const url = `${mqttConfig.broker.protocol}://${mqttConfig.broker.host}:${mqttConfig.broker.port}`;

    const options = {
      ...mqttConfig.options,
      username: mqttConfig.auth.username || undefined,
      password: mqttConfig.auth.password || undefined
    };

    try {
      this.client = mqtt.connect(url, options);

      this.client.on('connect', () => {
        this.connected = true;
        console.log('MQTT: Conectado al broker');
      });

      this.client.on('error', (err) => {
        logger.error('MQTT Error:', err);
        console.error('MQTT Error:', err.message);
      });

      this.client.on('close', () => {
        this.connected = false;
        console.log('MQTT: Desconectado del broker');
      });

      this.client.on('reconnect', () => {
        console.log('MQTT: Reconectando...');
      });

    } catch (err) {
      logger.error('Error conectando MQTT:', err);
      console.error('Error conectando MQTT:', err.message);
    }
  }

  disconnect() {
    if (this.client) {
      this.client.end();
      this.connected = false;
    }
  }

  publish(topic, message) {
    if (!this.connected || !this.client) {
      console.warn('MQTT: No conectado, mensaje no enviado');
      return false;
    }

    try {
      const payload = typeof message === 'string' ? message : JSON.stringify(message);
      this.client.publish(topic, payload, { qos: 1 });
      return true;
    } catch (err) {
      logger.error('Error publicando MQTT:', err);
      return false;
    }
  }

  publishTurnEvent(eventType, turn) {
    const topic = mqttConfig.topics.turnEvents(this.hospitalId);
    const message = {
      event: eventType,
      turn: {
        id: turn.id,
        code: turn.code,
        status: turn.status,
        priority: turn.priority,
        patient_name: turn.patient_name,
        doctor_name: turn.doctor_name,
        office_number: turn.office_number,
        service_name: turn.service_name,
        called_at: turn.called_at
      },
      timestamp: new Date().toISOString()
    };

    this.publish(topic, message);
  }

  publishDisplayUpdate(turn) {
    const topic = mqttConfig.topics.displayUpdates(this.hospitalId);
    const message = {
      event: 'DISPLAY_UPDATE',
      turn: {
        code: turn.code,
        patient_name: turn.patient_name,
        doctor_name: turn.doctor_name,
        office_number: turn.office_number,
        service_name: turn.service_name
      },
      timestamp: new Date().toISOString()
    };

    this.publish(topic, message);
  }

  publishQueueUpdate() {
    const topic = mqttConfig.topics.turnEvents(this.hospitalId);
    const message = {
      event: 'QUEUE_UPDATE',
      timestamp: new Date().toISOString()
    };

    this.publish(topic, message);
  }

  publishToDoctorQueue(doctorId, message) {
    const topic = mqttConfig.topics.doctorQueue(this.hospitalId, doctorId);
    this.publish(topic, message);
  }
}

// Singleton
const mqttService = new MqttService();

module.exports = mqttService;
