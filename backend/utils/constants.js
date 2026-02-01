// Estados del turno
const TURN_STATUS = {
  CREATED: 'CREATED',
  WAITING: 'WAITING',
  CALLED: 'CALLED',
  IN_SERVICE: 'IN_SERVICE',
  DONE: 'DONE',
  NO_SHOW: 'NO_SHOW',
  CANCELLED: 'CANCELLED'
};

// Transiciones validas de estado
const VALID_TRANSITIONS = {
  [TURN_STATUS.CREATED]: [TURN_STATUS.WAITING, TURN_STATUS.CANCELLED],
  [TURN_STATUS.WAITING]: [TURN_STATUS.CALLED, TURN_STATUS.CANCELLED],
  [TURN_STATUS.CALLED]: [TURN_STATUS.IN_SERVICE, TURN_STATUS.NO_SHOW, TURN_STATUS.WAITING, TURN_STATUS.CANCELLED],
  [TURN_STATUS.IN_SERVICE]: [TURN_STATUS.DONE, TURN_STATUS.CANCELLED],
  [TURN_STATUS.DONE]: [],
  [TURN_STATUS.NO_SHOW]: [],
  [TURN_STATUS.CANCELLED]: []
};

// Roles de usuario
const USER_ROLES = {
  ADMIN: 'admin',
  CAPTURISTA: 'capturista',
  MEDICO: 'medico',
  DISPLAY: 'display'
};

// Prioridades de turno
const TURN_PRIORITY = {
  NORMAL: 0,
  PREFERENTE: 1,
  URGENTE: 2
};

// Eventos MQTT
const MQTT_EVENTS = {
  TURN_CREATED: 'TURN_CREATED',
  TURN_CALLED: 'TURN_CALLED',
  TURN_STARTED: 'TURN_STARTED',
  TURN_FINISHED: 'TURN_FINISHED',
  TURN_CANCELLED: 'TURN_CANCELLED',
  TURN_NO_SHOW: 'TURN_NO_SHOW',
  QUEUE_UPDATE: 'QUEUE_UPDATE'
};

// Prefijos de codigo de turno por servicio
const SERVICE_PREFIXES = {
  'consulta-general': 'A',
  'urgencias': 'U',
  'laboratorio': 'L',
  'farmacia': 'F',
  'rayos-x': 'R',
  'especialidades': 'E',
  'default': 'T'
};

module.exports = {
  TURN_STATUS,
  VALID_TRANSITIONS,
  USER_ROLES,
  TURN_PRIORITY,
  MQTT_EVENTS,
  SERVICE_PREFIXES
};
