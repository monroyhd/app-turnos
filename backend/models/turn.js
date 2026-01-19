const knex = require('knex');
const dbConfig = require('../config/database');
const { TURN_STATUS, VALID_TRANSITIONS } = require('../utils/constants');

const db = knex(dbConfig[process.env.NODE_ENV || 'development']);

const TABLE = 'turns';

const Turn = {
  async findAll(filters = {}) {
    let query = db(TABLE)
      .select(
        'turns.*',
        'patients.full_name as patient_name',
        'patients.curp as patient_curp',
        'doctors.full_name as doctor_name',
        'doctors.office_number',
        'services.name as service_name',
        'services.prefix as service_prefix'
      )
      .leftJoin('patients', 'turns.patient_id', 'patients.id')
      .leftJoin('doctors', 'turns.doctor_id', 'doctors.id')
      .leftJoin('services', 'turns.service_id', 'services.id');

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.whereIn('turns.status', filters.status);
      } else {
        query = query.where('turns.status', filters.status);
      }
    }

    if (filters.doctor_id) {
      query = query.where('turns.doctor_id', filters.doctor_id);
    }

    if (filters.service_id) {
      query = query.where('turns.service_id', filters.service_id);
    }

    if (filters.date) {
      query = query.whereRaw('DATE(turns.created_at) = ?', [filters.date]);
    } else if (filters.today) {
      query = query.whereRaw('DATE(turns.created_at) = CURRENT_DATE');
    }

    return query.orderBy([
      { column: 'turns.priority', order: 'desc' },
      { column: 'turns.created_at', order: 'asc' }
    ]);
  },

  async findById(id) {
    return db(TABLE)
      .select(
        'turns.*',
        'patients.full_name as patient_name',
        'patients.curp as patient_curp',
        'patients.is_preferential as patient_preferential',
        'doctors.full_name as doctor_name',
        'doctors.office_number',
        'doctors.specialty as doctor_specialty',
        'services.name as service_name',
        'services.prefix as service_prefix'
      )
      .leftJoin('patients', 'turns.patient_id', 'patients.id')
      .leftJoin('doctors', 'turns.doctor_id', 'doctors.id')
      .leftJoin('services', 'turns.service_id', 'services.id')
      .where('turns.id', id)
      .first();
  },

  async findByCode(code, date = null) {
    let query = db(TABLE).where({ code });
    if (date) {
      query = query.whereRaw('DATE(created_at) = ?', [date]);
    } else {
      query = query.whereRaw('DATE(created_at) = CURRENT_DATE');
    }
    return query.first();
  },

  async create(turnData) {
    const [id] = await db(TABLE)
      .insert({
        code: turnData.code,
        patient_id: turnData.patient_id,
        service_id: turnData.service_id,
        doctor_id: turnData.doctor_id,
        status: TURN_STATUS.CREATED,
        priority: turnData.priority || 0,
        notes: turnData.notes,
        created_by: turnData.created_by
      })
      .returning('id');

    const turnId = typeof id === 'object' ? id.id : id;

    // Registrar en historial
    await this.addHistory(turnId, null, TURN_STATUS.CREATED, turnData.created_by);

    return this.findById(turnId);
  },

  async updateStatus(id, newStatus, userId, notes = null) {
    const turn = await this.findById(id);

    if (!turn) {
      throw new Error('Turno no encontrado');
    }

    // Validar transicion de estado
    const validTransitions = VALID_TRANSITIONS[turn.status] || [];
    if (!validTransitions.includes(newStatus)) {
      const error = new Error(`Transicion de estado no permitida: ${turn.status} -> ${newStatus}`);
      error.statusCode = 400;
      throw error;
    }

    // Preparar actualizacion con timestamps segun el nuevo estado
    const updateData = { status: newStatus };

    switch (newStatus) {
      case TURN_STATUS.WAITING:
        updateData.waiting_at = db.fn.now();
        break;
      case TURN_STATUS.CALLED:
        updateData.called_at = db.fn.now();
        break;
      case TURN_STATUS.IN_SERVICE:
        updateData.service_started_at = db.fn.now();
        break;
      case TURN_STATUS.DONE:
      case TURN_STATUS.NO_SHOW:
      case TURN_STATUS.CANCELLED:
        updateData.finished_at = db.fn.now();
        break;
    }

    await db(TABLE).where({ id }).update(updateData);

    // Registrar en historial
    await this.addHistory(id, turn.status, newStatus, userId, notes);

    return this.findById(id);
  },

  async addHistory(turnId, previousStatus, newStatus, userId, notes = null) {
    return db('turn_history').insert({
      turn_id: turnId,
      previous_status: previousStatus,
      new_status: newStatus,
      changed_by: userId,
      notes
    });
  },

  async getHistory(turnId) {
    return db('turn_history')
      .select(
        'turn_history.*',
        'users.full_name as changed_by_name'
      )
      .leftJoin('users', 'turn_history.changed_by', 'users.id')
      .where('turn_id', turnId)
      .orderBy('created_at', 'desc');
  },

  async getQueue(serviceId = null, doctorId = null) {
    let query = db(TABLE)
      .select(
        'turns.*',
        'patients.full_name as patient_name',
        'doctors.full_name as doctor_name',
        'doctors.office_number',
        'services.name as service_name'
      )
      .leftJoin('patients', 'turns.patient_id', 'patients.id')
      .leftJoin('doctors', 'turns.doctor_id', 'doctors.id')
      .leftJoin('services', 'turns.service_id', 'services.id')
      .whereIn('turns.status', [TURN_STATUS.WAITING, TURN_STATUS.CALLED])
      .whereRaw('DATE(turns.created_at) = CURRENT_DATE');

    if (serviceId) {
      query = query.where('turns.service_id', serviceId);
    }

    if (doctorId) {
      query = query.where('turns.doctor_id', doctorId);
    }

    return query.orderBy([
      { column: 'turns.priority', order: 'desc' },
      { column: 'turns.waiting_at', order: 'asc' }
    ]);
  },

  async getStats(date = null) {
    const dateFilter = date || new Date().toISOString().split('T')[0];

    const stats = await db(TABLE)
      .select('status')
      .count('* as count')
      .whereRaw('DATE(created_at) = ?', [dateFilter])
      .groupBy('status');

    const result = {
      total: 0,
      by_status: {}
    };

    stats.forEach(row => {
      result.by_status[row.status] = parseInt(row.count);
      result.total += parseInt(row.count);
    });

    return result;
  },

  async getCurrentlyInService(doctorId) {
    return db(TABLE)
      .select('turns.*', 'patients.full_name as patient_name')
      .leftJoin('patients', 'turns.patient_id', 'patients.id')
      .where('turns.doctor_id', doctorId)
      .where('turns.status', TURN_STATUS.IN_SERVICE)
      .whereRaw('DATE(turns.created_at) = CURRENT_DATE')
      .first();
  }
};

module.exports = Turn;
