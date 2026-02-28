<template>
  <div class="max-w-7xl mx-auto px-4 py-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Panel de Capturista</h1>
      <router-link
        to="/recepcion"
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
      >
        Ir a Recepción
      </router-link>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Formulario de nuevo turno -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold">Crear Nuevo Turno</h2>
          <label class="flex items-center cursor-pointer text-sm text-gray-600">
            <span class="mr-2">Imprimir ticket</span>
            <div class="relative">
              <input type="checkbox" v-model="printEnabled" class="sr-only peer">
              <div class="w-9 h-5 bg-gray-300 rounded-full peer peer-checked:bg-green-500 transition-colors"></div>
              <div class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-4 transition-transform"></div>
            </div>
          </label>
        </div>

        <form @submit.prevent="createTurn" class="space-y-4">
          <!-- Nombre del paciente (obligatorio) -->
          <div>
            <label class="block text-sm font-medium text-gray-700">Nombre del Paciente *</label>
            <input
              v-model="newTurn.patient_name"
              type="text"
              required
              placeholder="Nombre completo"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            >
          </div>

          <!-- Teléfono del paciente (obligatorio) -->
          <div>
            <label class="block text-sm font-medium text-gray-700">Teléfono *</label>
            <input
              v-model="newTurn.patient_phone"
              type="tel"
              required
              placeholder="10 dígitos"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            >
          </div>

          <!-- Servicio -->
          <div>
            <label class="block text-sm font-medium text-gray-700">Servicio</label>
            <select
              v-model="newTurn.service_id"
              required
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Seleccione un servicio</option>
              <option v-for="service in services" :key="service.id" :value="service.id">
                {{ service.name }}
              </option>
            </select>
          </div>

          <!-- Doctor (opcional) -->
          <div>
            <label class="block text-sm font-medium text-gray-700">Doctor (opcional)</label>
            <select
              v-model="newTurn.doctor_id"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Asignar despues</option>
              <option v-for="doctor in doctors" :key="doctor.id" :value="doctor.id">
                {{ doctor.full_name }}
              </option>
            </select>
          </div>

          <!-- Consultorio -->
          <div>
            <label class="block text-sm font-medium text-gray-700">Consultorio</label>
            <select
              v-model="newTurn.consultorio_id"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option :value="null">-- Sin asignar --</option>
              <option v-for="c in consultorios" :key="c.id" :value="c.id">
                {{ c.nombre }} - {{ c.ubicacion || 'Sin ubicacion' }}
              </option>
            </select>
          </div>

          <!-- Prioridad -->
          <div>
            <label class="block text-sm font-medium text-gray-700">Prioridad</label>
            <select
              v-model="newTurn.priority"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option :value="0">Normal</option>
              <option :value="1">Preferente</option>
              <option :value="2">Urgente</option>
            </select>
          </div>

          <!-- Notas -->
          <div>
            <label class="block text-sm font-medium text-gray-700">Notas</label>
            <textarea
              v-model="newTurn.notes"
              rows="2"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            ></textarea>
          </div>

          <button
            type="submit"
            :disabled="!newTurn.service_id || !newTurn.patient_name || !newTurn.patient_phone || creating"
            class="w-full py-2 px-4 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            {{ creating ? 'Creando...' : 'Crear Turno' }}
          </button>
        </form>
      </div>

      <!-- Lista de turnos del dia -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold mb-4">Turnos del Dia</h2>

        <div class="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
          <div
            v-for="turn in sortedTurns"
            :key="turn.id"
            class="border rounded-lg p-3"
            :class="getPriorityClass(turn.priority)"
          >
            <div class="flex justify-between items-start">
              <div>
                <span class="text-lg font-bold text-primary-600">{{ turn.code }}</span>
                <span :class="getStatusClass(turn.status)" class="ml-2 px-2 py-1 text-xs rounded">
                  {{ getStatusLabel(turn.status) }}
                </span>
              </div>
              <div class="text-sm text-gray-500">
                {{ formatTime(turn.created_at) }}
              </div>
            </div>
            <div class="mt-2 text-sm">
              <p v-if="turn.patient_name"><strong>Paciente:</strong> {{ turn.patient_name }}</p>
              <p><strong>Servicio:</strong> {{ turn.service_name }}</p>
              <p v-if="turn.doctor_name"><strong>Doctor:</strong> {{ turn.doctor_name }}</p>
            </div>
            <!-- Acciones segun estado -->
            <div v-if="turn.status === 'CREATED'" class="mt-2 flex space-x-2">
              <button
                @click="setWaiting(turn.id)"
                class="px-3 py-1 bg-yellow-500 text-white rounded text-sm"
              >
                Poner en Espera
              </button>
              <button
                @click="cancelTurn(turn.id)"
                class="px-3 py-1 bg-red-500 text-white rounded text-sm"
              >
                Cancelar
              </button>
            </div>
            <!-- Cancelar disponible para WAITING, CALLED, IN_SERVICE -->
            <div v-else-if="['WAITING', 'CALLED', 'IN_SERVICE'].includes(turn.status)" class="mt-2">
              <button
                @click="cancelTurn(turn.id)"
                class="px-3 py-1 bg-red-500 text-white rounded text-sm"
              >
                Cancelar Turno
              </button>
            </div>
          </div>

          <p v-if="sortedTurns.length === 0" class="text-gray-500 text-center py-4">
            No hay turnos registrados hoy
          </p>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useTurnsStore } from '../stores/turns'
import { useSettingsStore } from '../stores/settings'
import api from '../services/api'
import mqttClient from '../services/mqttClient'
import { printTicket, isPrintEnabled, setPrintEnabled } from '../utils/printTicket'

const turnsStore = useTurnsStore()
const settingsStore = useSettingsStore()

const services = ref([])
const doctors = ref([])
const consultorios = ref([])
const creating = ref(false)
const printEnabled = ref(isPrintEnabled())
watch(printEnabled, (val) => setPrintEnabled(val))

const newTurn = ref({
  patient_name: '',
  patient_phone: '',
  service_id: '',
  doctor_id: '',
  consultorio_id: null,
  priority: 0,
  notes: ''
})

// Ordenar turnos del más nuevo al más antiguo (por fecha de creación)
const sortedTurns = computed(() => {
  return [...turnsStore.turns].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime()
    const dateB = new Date(b.created_at).getTime()
    return dateB - dateA
  })
})

onMounted(async () => {
  await loadData()
  mqttClient.connect()
  mqttClient.onMessage('capturista', async (data) => {
    // Refrescar turnos cuando hay cualquier evento
    if (data.event) {
      await turnsStore.fetchTurns({ today: true })
    }
  })
})

async function loadData() {
  await turnsStore.fetchTurns({ today: true })

  const [servicesRes, doctorsRes, consultoriosRes] = await Promise.all([
    api.get('/services?is_active=true&tipo=servicio'),
    api.get('/doctors?is_active=true'),
    api.get('/recursos?tipo=CONSULTORIO&is_active=true')
  ])

  services.value = servicesRes.data.data
  doctors.value = doctorsRes.data.data
  consultorios.value = consultoriosRes.data.data || []
}

async function createTurn() {
  creating.value = true
  const turnData = {
    patient_name: newTurn.value.patient_name,
    patient_phone: newTurn.value.patient_phone,
    service_id: newTurn.value.service_id,
    doctor_id: newTurn.value.doctor_id,
    consultorio_id: newTurn.value.consultorio_id,
    priority: newTurn.value.priority,
    notes: newTurn.value.notes,
    patient_id: null
  }

  const result = await turnsStore.createTurn(turnData)

  if (result.success) {
    if (printEnabled.value) printTicket(result.data, settingsStore.hospitalName)
    newTurn.value = { patient_name: '', patient_phone: '', service_id: '', doctor_id: '', consultorio_id: null, priority: 0, notes: '' }
  } else {
    alert(result.message)
  }
  creating.value = false
}

async function setWaiting(turnId) {
  await turnsStore.updateTurnStatus(turnId, 'waiting')
}

async function cancelTurn(turnId) {
  if (confirm('Cancelar este turno?')) {
    await turnsStore.updateTurnStatus(turnId, 'cancel')
  }
}

function getStatusClass(status) {
  const classes = {
    CREATED: 'bg-gray-100 text-gray-800',
    WAITING: 'bg-yellow-100 text-yellow-800',
    CALLED: 'bg-green-100 text-green-800 animate-pulse-slow',
    IN_SERVICE: 'bg-green-100 text-green-800',
    DONE: 'bg-gray-200 text-gray-600',
    NO_SHOW: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-red-200 text-red-900'
  }
  return classes[status] || ''
}

function getStatusLabel(status) {
  const labels = {
    CREATED: 'Creado',
    WAITING: 'En Espera',
    CALLED: 'Llamado',
    IN_SERVICE: 'En Atencion',
    DONE: 'Finalizado',
    NO_SHOW: 'No se presento',
    CANCELLED: 'Cancelado'
  }
  return labels[status] || status
}

function getPriorityClass(priority) {
  if (priority === 2) return 'border-l-4 border-red-500'
  if (priority === 1) return 'border-l-4 border-yellow-500'
  return ''
}

function formatTime(dateString) {
  return new Date(dateString).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
@keyframes pulse-slow {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.animate-pulse-slow {
  animation: pulse-slow 2s ease-in-out infinite;
}
</style>
