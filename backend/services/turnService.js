const Turn = require('../models/turn');
const Service = require('../models/service');
const Patient = require('../models/patient');
const { generateTurnCode } = require('../utils/turnCodeGenerator');
const { TURN_STATUS, TURN_PRIORITY, MQTT_EVENTS } = require('../utils/constants');
const mqttService = require('./mqttService');

const TurnService = {
  async createTurn(data, userId) {
    // Validar: si no hay patient_id, se requiere patient_name y patient_phone
    if (!data.patient_id) {
      if (!data.patient_name || !data.patient_name.trim()) {
        const error = new Error('El nombre del paciente es obligatorio');
        error.statusCode = 400;
        throw error;
      }
    }

    // Obtener servicio para el prefijo
    const service = await Service.findById(data.service_id);
    if (!service) {
      const error = new Error('Servicio no encontrado');
      error.statusCode = 404;
      throw error;
    }

    // Obtener paciente si existe
    let patient = null;
    let patientName = data.patient_name?.trim() || null;
    let patientPhone = data.patient_phone?.trim() || null;

    if (data.patient_id) {
      patient = await Patient.findById(data.patient_id);
      // Si hay paciente registrado, usar sus datos como respaldo
      if (patient) {
        patientName = patientName || patient.full_name;
        patientPhone = patientPhone || patient.phone;
      }
    }

    // Determinar prioridad
    let priority = data.priority || TURN_PRIORITY.NORMAL;
    if (patient && patient.is_preferential && priority < TURN_PRIORITY.PREFERENTE) {
      priority = TURN_PRIORITY.PREFERENTE;
    }

    // Generar codigo de turno
    const code = await generateTurnCode(service.id, service.prefix);

    // Crear turno
    const turn = await Turn.create({
      code,
      patient_id: data.patient_id || null,
      patient_name: patientName,
      patient_phone: patientPhone,
      service_id: data.service_id,
      doctor_id: data.doctor_id,
      consultorio_id: data.consultorio_id,
      priority,
      notes: data.notes,
      created_by: userId
    });

    // Poner automáticamente en espera
    const waitingTurn = await Turn.updateStatus(turn.id, TURN_STATUS.WAITING, userId);

    // Publicar eventos MQTT
    mqttService.publishTurnEvent(MQTT_EVENTS.TURN_CREATED, waitingTurn);
    mqttService.publishQueueUpdate();

    return waitingTurn;
  },

  async setWaiting(turnId, userId) {
    const turn = await Turn.updateStatus(turnId, TURN_STATUS.WAITING, userId);

    mqttService.publishQueueUpdate();

    return turn;
  },

  async callTurn(turnId, doctorId, userId) {
    const turn = await Turn.findById(turnId);

    if (!turn) {
      const error = new Error('Turno no encontrado');
      error.statusCode = 404;
      throw error;
    }

    // Solo verificar turno en servicio si hay doctorId
    if (doctorId) {
      const currentInService = await Turn.getCurrentlyInService(doctorId);
      if (currentInService) {
        const error = new Error('Ya tiene un paciente en atencion. Finalice primero el turno actual.');
        error.statusCode = 400;
        throw error;
      }

      // Actualizar doctor asignado si es diferente
      if (turn.doctor_id !== doctorId) {
        await require('knex')(require('../config/database')[process.env.NODE_ENV || 'development'])('turns')
          .where({ id: turnId })
          .update({ doctor_id: doctorId });
      }
    }

    const updatedTurn = await Turn.updateStatus(turnId, TURN_STATUS.CALLED, userId);

    // Publicar eventos MQTT
    mqttService.publishTurnEvent(MQTT_EVENTS.TURN_CALLED, updatedTurn);
    mqttService.publishDisplayUpdate(updatedTurn);
    mqttService.publishQueueUpdate();

    return updatedTurn;
  },

  async startService(turnId, userId) {
    const turn = await Turn.updateStatus(turnId, TURN_STATUS.IN_SERVICE, userId);

    mqttService.publishTurnEvent(MQTT_EVENTS.TURN_STARTED, turn);
    mqttService.publishQueueUpdate();

    return turn;
  },

  async finishTurn(turnId, userId, notes = null) {
    const turn = await Turn.updateStatus(turnId, TURN_STATUS.DONE, userId, notes);

    // Guardar en historial de recursos
    await this.saveToHistorial(turn);

    mqttService.publishTurnEvent(MQTT_EVENTS.TURN_FINISHED, turn);
    mqttService.publishQueueUpdate();

    return turn;
  },

  async saveToHistorial(turn) {
    // Solo guardar si tiene consultorio asignado
    if (!turn.consultorio_id) return;

    const HistorialRecurso = require('../models/historialRecurso');

    await HistorialRecurso.create({
      turn_id: turn.id,
      recurso_id: turn.consultorio_id,
      recurso_nombre: turn.consultorio_nombre || null,
      recurso_tipo: 'CONSULTORIO',
      paciente_nombre: turn.patient_name || 'Sin nombre',
      paciente_apellidos: '',
      telefono: turn.patient_phone || null,
      doctor_id: turn.doctor_id,
      doctor_nombre: turn.doctor_name || null,
      especialidad: turn.doctor_specialty || null,
      fecha_inicio: turn.service_started_at,
      fecha_fin: turn.finished_at,
      estatus_final: 'DONE',
      notas: turn.notes
    });
  },

  async markNoShow(turnId, userId) {
    const turn = await Turn.updateStatus(turnId, TURN_STATUS.NO_SHOW, userId);

    mqttService.publishTurnEvent(MQTT_EVENTS.TURN_NO_SHOW, turn);
    mqttService.publishQueueUpdate();

    return turn;
  },

  async cancelTurn(turnId, userId, reason = null) {
    const turn = await Turn.updateStatus(turnId, TURN_STATUS.CANCELLED, userId, reason);

    mqttService.publishTurnEvent(MQTT_EVENTS.TURN_CANCELLED, turn);
    mqttService.publishQueueUpdate();

    return turn;
  },

  async recallTurn(turnId, userId) {
    // Volver a poner en espera (para volver a llamar)
    const turn = await Turn.updateStatus(turnId, TURN_STATUS.WAITING, userId);

    mqttService.publishQueueUpdate();

    return turn;
  },

  async getQueue(serviceId = null, doctorId = null) {
    return Turn.getQueue(serviceId, doctorId);
  },

  async getDoctorTurns(doctorId) {
    return Turn.findAll({
      doctor_id: doctorId,
      today: true
    });
  },

  async getDisplayData() {
    // Obtener turnos llamados (para mostrar en pantalla)
    const calledTurns = await Turn.findAll({
      status: TURN_STATUS.CALLED,
      today: true
    });

    // Obtener turnos en atención (para mostrar en tarjetas)
    const inServiceTurns = await Turn.findAll({
      status: TURN_STATUS.IN_SERVICE,
      today: true
    });

    // Obtener proximos en espera
    const waitingTurns = await Turn.findAll({
      status: TURN_STATUS.WAITING,
      today: true
    });

    // Estadisticas del dia
    const stats = await Turn.getStats();

    return {
      called: calledTurns,
      inService: inServiceTurns,
      waiting: waitingTurns.slice(0, 10), // Solo los proximos 10
      stats
    };
  },

  async getHistory(turnId) {
    return Turn.getHistory(turnId);
  }
};

module.exports = TurnService;
