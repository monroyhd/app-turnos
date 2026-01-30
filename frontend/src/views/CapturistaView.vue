<template>
  <div class="max-w-7xl mx-auto px-4 py-6">
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Panel de Capturista</h1>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Formulario de nuevo turno -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold mb-4">Crear Nuevo Turno</h2>

        <form @submit.prevent="createTurn" class="space-y-4">
          <!-- Buscar/Registrar Paciente -->
          <div>
            <label class="block text-sm font-medium text-gray-700">Paciente</label>
            <div class="flex space-x-2 mt-1">
              <input
                v-model="patientSearch"
                type="text"
                placeholder="Buscar por CURP o nombre..."
                class="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                @input="searchPatients"
              >
              <button
                type="button"
                @click="showNewPatientForm = true"
                class="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                + Nuevo
              </button>
            </div>
            <!-- Resultados de busqueda -->
            <div v-if="patientResults.length > 0" class="mt-2 border rounded-md max-h-40 overflow-y-auto">
              <div
                v-for="patient in patientResults"
                :key="patient.id"
                @click="selectPatient(patient)"
                class="p-2 hover:bg-gray-100 cursor-pointer"
              >
                <span class="font-medium">{{ patient.full_name }}</span>
                <span v-if="patient.curp" class="text-gray-500 text-sm ml-2">{{ patient.curp }}</span>
              </div>
            </div>
            <!-- Paciente seleccionado -->
            <div v-if="selectedPatient" class="mt-2 p-2 bg-primary-50 rounded-md flex justify-between items-center">
              <span>{{ selectedPatient.full_name }}</span>
              <button type="button" @click="selectedPatient = null" class="text-red-500">x</button>
            </div>
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
            :disabled="!newTurn.service_id || creating"
            class="w-full py-2 px-4 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            {{ creating ? 'Creando...' : 'Crear Turno' }}
          </button>
        </form>
      </div>

      <!-- Lista de turnos del dia -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold mb-4">Turnos del Dia</h2>

        <div class="space-y-3 max-h-96 overflow-y-auto">
          <div
            v-for="turn in turnsStore.turns"
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
          </div>

          <p v-if="turnsStore.turns.length === 0" class="text-gray-500 text-center py-4">
            No hay turnos registrados hoy
          </p>
        </div>
      </div>
    </div>

    <!-- Modal Nuevo Paciente -->
    <div v-if="showNewPatientForm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold mb-4">Registrar Nuevo Paciente</h3>
        <form @submit.prevent="createPatient" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Nombre Completo *</label>
            <input v-model="newPatient.full_name" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">CURP</label>
            <input v-model="newPatient.curp" maxlength="18" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md uppercase">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Telefono</label>
            <input v-model="newPatient.phone" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
          </div>
          <div class="flex items-center">
            <input type="checkbox" v-model="newPatient.is_preferential" id="preferential" class="mr-2">
            <label for="preferential" class="text-sm text-gray-700">Paciente preferencial</label>
          </div>
          <div class="flex space-x-2">
            <button type="submit" class="flex-1 py-2 px-4 bg-primary-600 text-white rounded-md">Guardar</button>
            <button type="button" @click="showNewPatientForm = false" class="flex-1 py-2 px-4 bg-gray-200 rounded-md">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useTurnsStore } from '../stores/turns'
import api from '../services/api'
import mqttClient from '../services/mqttClient'

const turnsStore = useTurnsStore()

const services = ref([])
const doctors = ref([])
const consultorios = ref([])
const patientSearch = ref('')
const patientResults = ref([])
const selectedPatient = ref(null)
const showNewPatientForm = ref(false)
const creating = ref(false)

const newTurn = ref({
  service_id: '',
  doctor_id: '',
  consultorio_id: null,
  priority: 0,
  notes: ''
})

const newPatient = ref({
  full_name: '',
  curp: '',
  phone: '',
  is_preferential: false
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

async function searchPatients() {
  if (patientSearch.value.length < 2) {
    patientResults.value = []
    return
  }

  const res = await api.get(`/patients?search=${patientSearch.value}`)
  patientResults.value = res.data.data.slice(0, 5)
}

function selectPatient(patient) {
  selectedPatient.value = patient
  patientResults.value = []
  patientSearch.value = ''
}

async function createPatient() {
  try {
    const res = await api.post('/patients', newPatient.value)
    if (res.data.success) {
      selectedPatient.value = res.data.data
      showNewPatientForm.value = false
      newPatient.value = { full_name: '', curp: '', phone: '', is_preferential: false }
    }
  } catch (err) {
    alert(err.response?.data?.message || 'Error creando paciente')
  }
}

async function createTurn() {
  creating.value = true
  const turnData = {
    ...newTurn.value,
    patient_id: selectedPatient.value?.id
  }

  const result = await turnsStore.createTurn(turnData)

  if (result.success) {
    newTurn.value = { service_id: '', doctor_id: '', consultorio_id: null, priority: 0, notes: '' }
    selectedPatient.value = null
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
    CALLED: 'bg-blue-100 text-blue-800',
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
