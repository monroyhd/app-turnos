<template>
  <div class="min-h-screen bg-gray-100">
    <!-- Header -->
    <header class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        <h1 class="text-xl font-bold text-gray-900">RECEPCION - Sistema de Turnos</h1>
        <div class="flex items-center gap-4">
          <span class="text-sm text-gray-600">{{ authStore.user?.username }}</span>
          <button @click="logout" class="text-gray-500 hover:text-gray-700">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 py-4">
      <!-- Formulario de Nuevo Turno (inline) -->
      <div class="bg-white rounded-lg shadow p-4 mb-4">
        <h2 class="text-sm font-semibold text-gray-700 mb-3">NUEVO TURNO</h2>
        <form @submit.prevent="createTurn" class="flex flex-wrap gap-2 items-end">
          <div class="flex-1 min-w-[150px]">
            <input
              v-model="newTurn.patient_name"
              type="text"
              required
              placeholder="Nombre Paciente *"
              class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
          </div>
          <div class="w-[120px]">
            <input
              v-model="newTurn.patient_phone"
              type="tel"
              placeholder="Telefono"
              class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
          </div>
          <div class="w-[160px]">
            <select
              v-model="newTurn.service_id"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">Servicio *</option>
              <option v-for="service in services" :key="service.id" :value="service.id">
                {{ service.name }}
              </option>
            </select>
          </div>
          <div class="w-[160px]">
            <select
              v-model="newTurn.doctor_id"
              class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">Doctor (opcional)</option>
              <option v-for="doctor in doctors" :key="doctor.id" :value="doctor.id">
                {{ doctor.full_name }}
              </option>
            </select>
          </div>
          <div class="w-[160px]">
            <select
              v-model="newTurn.consultorio_id"
              class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">Consultorio (opcional)</option>
              <option v-for="c in consultorios" :key="c.id" :value="c.id">
                {{ c.nombre }}
              </option>
            </select>
          </div>
          <button
            type="submit"
            :disabled="!canCreate || creating"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {{ creating ? '...' : '+ Crear' }}
          </button>
        </form>
      </div>

      <!-- Cola de Espera -->
      <div class="bg-white rounded-lg shadow">
        <div class="px-4 py-3 border-b border-gray-200">
          <h2 class="text-sm font-semibold text-gray-700">COLA DE ESPERA</h2>
        </div>
        <div class="divide-y divide-gray-200 max-h-[calc(100vh-320px)] overflow-y-auto">
          <div
            v-for="turn in activeTurns"
            :key="turn.id"
            class="px-4 py-3 hover:bg-gray-50"
            :class="getTurnRowClass(turn)"
          >
            <div class="flex justify-between items-start">
              <!-- Info del turno -->
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="text-lg font-bold text-blue-600">{{ turn.code }}</span>
                  <span :class="getStatusBadge(turn.status)" class="px-2 py-0.5 text-xs rounded-full font-medium">
                    {{ getStatusLabel(turn.status) }}
                  </span>
                  <span v-if="turn.priority > 0" :class="getPriorityBadge(turn.priority)" class="px-2 py-0.5 text-xs rounded-full">
                    {{ turn.priority === 2 ? 'URGENTE' : 'PREFERENTE' }}
                  </span>
                </div>
                <div class="mt-1 text-sm text-gray-600">
                  <span class="font-medium">{{ turn.patient_name }}</span>
                  <span class="mx-2">|</span>
                  <span>{{ turn.patient_phone }}</span>
                </div>
                <div class="mt-1 text-sm text-gray-500">
                  <span>{{ turn.service_name }}</span>
                  <span v-if="turn.doctor_name" class="mx-2">|</span>
                  <span v-if="turn.doctor_name">{{ turn.doctor_name }}</span>
                  <span v-if="turn.consultorio_nombre" class="mx-2">|</span>
                  <span v-if="turn.consultorio_nombre">{{ turn.consultorio_nombre }}</span>
                </div>
              </div>

              <!-- Acciones -->
              <div class="flex gap-2 ml-4">
                <!-- Estado: WAITING -->
                <template v-if="turn.status === 'WAITING'">
                  <!-- Si tiene doctor asignado, mostrar boton Llamar directo -->
                  <button
                    v-if="turn.doctor_id"
                    @click="callTurn(turn)"
                    class="px-3 py-1 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700"
                  >
                    Llamar
                  </button>
                  <!-- Si no tiene doctor, mostrar selector y boton -->
                  <template v-else>
                    <select
                      v-model="selectedDoctorForTurn[turn.id]"
                      class="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="">Sin doctor</option>
                      <option v-for="doctor in doctors" :key="doctor.id" :value="doctor.id">
                        {{ doctor.full_name }}
                      </option>
                    </select>
                    <button
                      @click="callTurn(turn)"
                      class="px-3 py-1 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700"
                    >
                      Llamar
                    </button>
                  </template>
                  <button
                    @click="cancelTurn(turn.id)"
                    class="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                  >
                    Cancelar
                  </button>
                </template>

                <!-- Estado: CALLED -->
                <template v-if="turn.status === 'CALLED'">
                  <button
                    @click="startService(turn.id)"
                    class="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
                  >
                    Iniciar
                  </button>
                  <button
                    @click="noShow(turn.id)"
                    class="px-3 py-1 bg-yellow-100 text-yellow-700 rounded text-sm hover:bg-yellow-200"
                  >
                    No se presento
                  </button>
                  <button
                    @click="cancelTurn(turn.id)"
                    class="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                  >
                    Cancelar
                  </button>
                </template>

                <!-- Estado: IN_SERVICE -->
                <template v-if="turn.status === 'IN_SERVICE'">
                  <button
                    @click="finishTurn(turn.id)"
                    class="px-3 py-1 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700"
                  >
                    Finalizar
                  </button>
                  <button
                    @click="cancelTurn(turn.id)"
                    class="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                  >
                    Cancelar
                  </button>
                </template>
              </div>
            </div>
          </div>

          <div v-if="activeTurns.length === 0" class="px-4 py-8 text-center text-gray-500">
            No hay turnos activos
          </div>
        </div>
      </div>

      <!-- Estadisticas (footer) -->
      <div class="mt-4 bg-white rounded-lg shadow px-4 py-3">
        <div class="flex justify-center gap-8 text-sm">
          <span class="text-gray-600">
            Esperando: <span class="font-bold text-yellow-600">{{ stats.waiting || 0 }}</span>
          </span>
          <span class="text-gray-600">
            Llamados: <span class="font-bold text-green-600">{{ stats.called || 0 }}</span>
          </span>
          <span class="text-gray-600">
            En atencion: <span class="font-bold text-blue-600">{{ stats.in_service || 0 }}</span>
          </span>
          <span class="text-gray-600">
            Atendidos hoy: <span class="font-bold text-gray-800">{{ stats.done || 0 }}</span>
          </span>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useTurnsStore } from '../stores/turns'
import api from '../services/api'
import mqttClient from '../services/mqttClient'

const router = useRouter()
const authStore = useAuthStore()
const turnsStore = useTurnsStore()

const services = ref([])
const doctors = ref([])
const consultorios = ref([])
const creating = ref(false)
const stats = ref({})
const selectedDoctorForTurn = reactive({})

const newTurn = ref({
  patient_name: '',
  patient_phone: '',
  service_id: '',
  doctor_id: '',
  consultorio_id: ''
})

const canCreate = computed(() => {
  return newTurn.value.patient_name.trim() &&
         newTurn.value.service_id
})

// Filtrar solo turnos activos (WAITING, CALLED, IN_SERVICE)
const activeTurns = computed(() => {
  return turnsStore.turns
    .filter(t => ['WAITING', 'CALLED', 'IN_SERVICE'].includes(t.status))
    .sort((a, b) => {
      // Ordenar: IN_SERVICE primero, luego CALLED, luego WAITING
      const statusOrder = { IN_SERVICE: 0, CALLED: 1, WAITING: 2 }
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status]
      }
      // Dentro del mismo estado, por prioridad y luego por fecha
      if (a.priority !== b.priority) return b.priority - a.priority
      return new Date(a.created_at) - new Date(b.created_at)
    })
})

onMounted(async () => {
  await loadData()
  mqttClient.connect()
  mqttClient.onMessage('recepcion', async (data) => {
    if (data.event) {
      await turnsStore.fetchTurns({ today: true })
      await loadStats()
    }
  })
})

onUnmounted(() => {
  mqttClient.offMessage('recepcion')
})

async function loadData() {
  await turnsStore.fetchTurns({ today: true })

  const [servicesRes, doctorsRes, consultoriosRes, statsRes] = await Promise.all([
    api.get('/services?is_active=true&tipo=servicio'),
    api.get('/doctors?is_active=true'),
    api.get('/recursos?tipo=CONSULTORIO&is_active=true'),
    api.get('/turns/stats')
  ])

  services.value = servicesRes.data.data
  doctors.value = doctorsRes.data.data
  consultorios.value = consultoriosRes.data.data
  stats.value = statsRes.data.data || {}
}

async function loadStats() {
  try {
    const res = await api.get('/turns/stats')
    stats.value = res.data.data || {}
  } catch (err) {
    console.error('Error loading stats:', err)
  }
}

async function createTurn() {
  creating.value = true
  const turnData = {
    patient_name: newTurn.value.patient_name,
    patient_phone: newTurn.value.patient_phone || null,
    service_id: newTurn.value.service_id,
    doctor_id: newTurn.value.doctor_id || null,
    consultorio_id: newTurn.value.consultorio_id || null,
    patient_id: null
  }

  const result = await turnsStore.createTurn(turnData)

  if (result.success) {
    newTurn.value = { patient_name: '', patient_phone: '', service_id: '', doctor_id: '', consultorio_id: '' }
    await loadStats()
  } else {
    alert(result.message)
  }
  creating.value = false
}

async function callTurn(turn) {
  // Usar el doctor seleccionado o el asignado al turno
  const doctorId = selectedDoctorForTurn[turn.id] || turn.doctor_id || null

  const result = await turnsStore.updateTurnStatus(turn.id, 'call', { doctor_id: doctorId })
  if (!result.success) {
    alert(result.message)
  } else {
    await loadStats()
  }
}

async function startService(turnId) {
  const result = await turnsStore.updateTurnStatus(turnId, 'start')
  if (!result.success) {
    alert(result.message)
  } else {
    await loadStats()
  }
}

async function finishTurn(turnId) {
  const result = await turnsStore.updateTurnStatus(turnId, 'finish')
  if (!result.success) {
    alert(result.message)
  } else {
    await loadStats()
  }
}

async function noShow(turnId) {
  if (confirm('Marcar como "No se presento"?')) {
    const result = await turnsStore.updateTurnStatus(turnId, 'no-show')
    if (!result.success) {
      alert(result.message)
    } else {
      await loadStats()
    }
  }
}

async function cancelTurn(turnId) {
  if (confirm('Cancelar este turno?')) {
    const result = await turnsStore.updateTurnStatus(turnId, 'cancel')
    if (!result.success) {
      alert(result.message)
    } else {
      await loadStats()
    }
  }
}

function logout() {
  authStore.logout()
  router.push('/login')
}

function getStatusBadge(status) {
  const badges = {
    WAITING: 'bg-yellow-100 text-yellow-800',
    CALLED: 'bg-green-100 text-green-800',
    IN_SERVICE: 'bg-blue-100 text-blue-800'
  }
  return badges[status] || 'bg-gray-100 text-gray-800'
}

function getStatusLabel(status) {
  const labels = {
    WAITING: 'EN ESPERA',
    CALLED: 'LLAMADO',
    IN_SERVICE: 'EN ATENCION'
  }
  return labels[status] || status
}

function getPriorityBadge(priority) {
  if (priority === 2) return 'bg-red-100 text-red-800'
  if (priority === 1) return 'bg-orange-100 text-orange-800'
  return ''
}

function getTurnRowClass(turn) {
  if (turn.status === 'CALLED') return 'bg-green-50'
  if (turn.status === 'IN_SERVICE') return 'bg-blue-50'
  if (turn.priority === 2) return 'border-l-4 border-red-500'
  if (turn.priority === 1) return 'border-l-4 border-orange-500'
  return ''
}
</script>
