import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/api'

export const useTurnsStore = defineStore('turns', () => {
  const turns = ref([])
  const queue = ref([])
  const displayData = ref({ called: [], inService: [], waiting: [], stats: {} })
  const loading = ref(false)
  const error = ref(null)

  const waitingTurns = computed(() =>
    turns.value.filter(t => t.status === 'WAITING')
  )

  const calledTurns = computed(() =>
    turns.value.filter(t => t.status === 'CALLED')
  )

  const inServiceTurns = computed(() =>
    turns.value.filter(t => t.status === 'IN_SERVICE')
  )

  async function fetchTurns(filters = {}) {
    loading.value = true
    error.value = null
    try {
      const params = new URLSearchParams()
      if (filters.today) params.append('today', 'true')
      if (filters.status) params.append('status', filters.status)
      if (filters.doctor_id) params.append('doctor_id', filters.doctor_id)

      const response = await api.get(`/turns?${params}`)
      if (response.data.success) {
        turns.value = response.data.data
      }
    } catch (err) {
      error.value = err.response?.data?.message || 'Error cargando turnos'
    } finally {
      loading.value = false
    }
  }

  async function fetchQueue(serviceId = null, doctorId = null) {
    try {
      const params = new URLSearchParams()
      if (serviceId) params.append('service_id', serviceId)
      if (doctorId) params.append('doctor_id', doctorId)

      const response = await api.get(`/turns/queue?${params}`)
      if (response.data.success) {
        queue.value = response.data.data
      }
    } catch (err) {
      error.value = err.response?.data?.message || 'Error cargando cola'
    }
  }

  async function fetchDisplayData() {
    try {
      const response = await api.get('/turns/display')
      if (response.data.success) {
        displayData.value = response.data.data
      }
    } catch (err) {
      console.error('Error cargando datos de display:', err)
    }
  }

  async function fetchMyTurns() {
    loading.value = true
    try {
      const response = await api.get('/turns/my-turns')
      if (response.data.success) {
        turns.value = response.data.data
      }
    } catch (err) {
      error.value = err.response?.data?.message || 'Error cargando turnos'
    } finally {
      loading.value = false
    }
  }

  async function createTurn(turnData) {
    try {
      const response = await api.post('/turns', turnData)
      if (response.data.success) {
        turns.value.unshift(response.data.data)
        return { success: true, data: response.data.data }
      }
      return { success: false, message: response.data.message }
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Error creando turno'
      }
    }
  }

  async function updateTurnStatus(turnId, action, data = {}) {
    try {
      const response = await api.put(`/turns/${turnId}/${action}`, data)
      if (response.data.success) {
        const index = turns.value.findIndex(t => t.id === turnId)
        if (index !== -1) {
          turns.value[index] = response.data.data
        }
        return { success: true, data: response.data.data }
      }
      return { success: false, message: response.data.message }
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Error actualizando turno'
      }
    }
  }

  function handleMqttMessage(event, turn) {
    switch (event) {
      case 'TURN_CREATED':
        if (!turns.value.find(t => t.id === turn.id)) {
          turns.value.unshift(turn)
        }
        break
      case 'TURN_CALLED':
      case 'TURN_STARTED':
      case 'TURN_FINISHED':
      case 'TURN_CANCELLED':
      case 'TURN_NO_SHOW': {
        const index = turns.value.findIndex(t => t.id === turn.id)
        if (index !== -1) {
          turns.value[index] = { ...turns.value[index], ...turn }
        }
        break
      }
      case 'QUEUE_UPDATE':
        fetchQueue()
        break
    }
  }

  return {
    turns,
    queue,
    displayData,
    loading,
    error,
    waitingTurns,
    calledTurns,
    inServiceTurns,
    fetchTurns,
    fetchQueue,
    fetchDisplayData,
    fetchMyTurns,
    createTurn,
    updateTurnStatus,
    handleMqttMessage
  }
})
