<template>
  <div
    class="h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900"
    :style="settingsStore.backgroundUrl ? { backgroundImage: `url(${settingsStore.backgroundUrl})`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' } : {}"
  >
    <!-- Header -->
    <header class="bg-black/30 backdrop-blur-sm py-4 px-6 flex justify-between items-center border-b border-white/10">
      <div class="flex items-center space-x-4">
        <img
          v-if="settingsStore.logoUrl"
          :src="settingsStore.logoUrl"
          alt="Logo"
          class="h-14 w-auto object-contain"
        >
        <div>
          <h1 class="text-3xl font-bold text-white">{{ settingsStore.hospitalName }}</h1>
          <p class="text-sm text-indigo-300 uppercase tracking-wider">Estado de Habitaciones</p>
        </div>
      </div>
      <div class="text-right">
        <p class="text-4xl font-mono text-cyan-400 font-bold">{{ currentTime }}</p>
        <p class="text-sm text-gray-300">{{ currentDate }}</p>
      </div>
    </header>

    <!-- Main Content -->
    <main class="p-6 overflow-auto" style="height: calc(100vh - 160px);">
      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center h-full">
        <div class="text-center">
          <div class="animate-spin rounded-full h-16 w-16 border-t-4 border-cyan-400 mx-auto mb-4"></div>
          <p class="text-xl text-gray-400">Cargando habitaciones...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="flex items-center justify-center h-full">
        <div class="text-center bg-red-900/30 rounded-2xl p-8 border border-red-500/50">
          <p class="text-xl text-red-400">{{ error }}</p>
          <button @click="fetchHabitaciones" class="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
            Reintentar
          </button>
        </div>
      </div>

      <!-- Tabla de Habitaciones -->
      <div v-else class="bg-black/40 backdrop-blur-sm rounded-2xl shadow-xl border border-white/10 overflow-hidden">
        <table class="min-w-full">
          <thead class="bg-black/50">
            <tr>
              <th class="px-6 py-4 text-left text-sm font-bold text-cyan-400 uppercase tracking-wider">Habitacion</th>
              <th class="px-6 py-4 text-left text-sm font-bold text-cyan-400 uppercase tracking-wider">Paciente</th>
              <th class="px-6 py-4 text-left text-sm font-bold text-cyan-400 uppercase tracking-wider">Medico Tratante</th>
              <th class="px-6 py-4 text-left text-sm font-bold text-cyan-400 uppercase tracking-wider">Fecha Ingreso</th>
              <th class="px-6 py-4 text-left text-sm font-bold text-cyan-400 uppercase tracking-wider">Tiempo</th>
              <th class="px-6 py-4 text-center text-sm font-bold text-cyan-400 uppercase tracking-wider">Estado</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/10">
            <tr v-if="habitaciones.length === 0">
              <td colspan="6" class="px-6 py-12 text-center text-gray-400 text-xl">
                No hay habitaciones registradas.
              </td>
            </tr>
            <tr
              v-for="habitacion in habitaciones"
              :key="habitacion.id"
              :class="getRowClass(habitacion)"
              class="transition-colors"
            >
              <td class="px-6 py-4">
                <span class="text-2xl font-bold text-white">{{ habitacion.codigo }}</span>
                <span v-if="habitacion.ubicacion" class="block text-sm text-gray-400">{{ habitacion.ubicacion }}</span>
              </td>
              <td class="px-6 py-4">
                <template v-if="habitacion.ocupado">
                  <span class="text-lg text-white font-medium">{{ habitacion.paciente_nombre }}</span>
                </template>
                <span v-else class="text-gray-500">-</span>
              </td>
              <td class="px-6 py-4">
                <span v-if="habitacion.doctor_nombre" class="text-white">{{ habitacion.doctor_nombre }}</span>
                <span v-else class="text-gray-500">-</span>
              </td>
              <td class="px-6 py-4">
                <span v-if="habitacion.fecha_inicio" class="text-gray-300">{{ formatDate(habitacion.fecha_inicio) }}</span>
                <span v-else class="text-gray-500">-</span>
              </td>
              <td class="px-6 py-4">
                <span v-if="habitacion.fecha_inicio" class="text-yellow-400 font-medium">{{ formatTiempoDesdeIngreso(habitacion.fecha_inicio) }}</span>
                <span v-else class="text-gray-500">-</span>
              </td>
              <td class="px-6 py-4 text-center">
                <span
                  class="inline-block px-4 py-2 rounded-full text-sm font-bold uppercase"
                  :class="getEstatusClass(habitacion.estatus)"
                >
                  {{ habitacion.estatus }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Sin habitaciones -->
      <div v-if="!loading && !error && habitaciones.length === 0" class="flex items-center justify-center h-full">
        <div class="text-center">
          <p class="text-2xl text-gray-400">No hay habitaciones configuradas</p>
        </div>
      </div>
    </main>

    <!-- Footer con Estadisticas -->
    <footer class="bg-black/40 backdrop-blur-sm py-4 px-6 border-t border-white/10">
      <div class="flex justify-center items-center gap-8 flex-wrap">
        <div class="flex items-center gap-3">
          <div class="w-4 h-4 rounded-full bg-slate-500"></div>
          <span class="text-white font-semibold text-lg">Total: {{ estadisticas.total }}</span>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-4 h-4 rounded-full bg-green-500"></div>
          <span class="text-green-400 font-semibold text-lg">Libres: {{ estadisticas.libres }}</span>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-4 h-4 rounded-full bg-red-500"></div>
          <span class="text-red-400 font-semibold text-lg">Ocupadas: {{ estadisticas.ocupadas }}</span>
        </div>
        <!-- Desglose por estatus -->
        <template v-if="estadisticas.porEstatus">
          <div v-for="(count, estatus) in estatusFiltrado" :key="estatus" class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full" :class="getEstatusDotClass(estatus)"></div>
            <span class="text-sm text-white/70">{{ estatus }}: {{ count }}</span>
          </div>
        </template>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSettingsStore } from '../stores/settings'
import api from '../services/api'
import mqttClient from '../services/mqttClient'

const settingsStore = useSettingsStore()

const currentTime = ref('')
const currentDate = ref('')
const habitaciones = ref([])
const estadisticas = ref({
  total: 0,
  ocupadas: 0,
  libres: 0,
  porEstatus: {}
})
const loading = ref(true)
const error = ref(null)

// Filtrar estatus que no sean LIBRE para mostrar en footer
const estatusFiltrado = computed(() => {
  const filtrado = {}
  if (estadisticas.value.porEstatus) {
    for (const [estatus, count] of Object.entries(estadisticas.value.porEstatus)) {
      if (estatus !== 'LIBRE') {
        filtrado[estatus] = count
      }
    }
  }
  return filtrado
})

function getRowClass(habitacion) {
  if (!habitacion.ocupado) {
    return 'bg-green-900/20 hover:bg-green-900/30'
  }
  switch (habitacion.estatus) {
    case 'QUIROFANO':
    case 'URGENCIAS':
      return 'bg-red-900/30 hover:bg-red-900/40'
    case 'HOSPITALIZACION':
      return 'bg-red-900/20 hover:bg-red-900/30'
    case 'RECUPERACION':
      return 'bg-yellow-900/20 hover:bg-yellow-900/30'
    case 'TERAPIA':
      return 'bg-purple-900/20 hover:bg-purple-900/30'
    case 'MANTENIMIENTO':
      return 'bg-gray-700/30 hover:bg-gray-700/40'
    default:
      return 'bg-red-900/20 hover:bg-red-900/30'
  }
}

function getEstatusClass(estatus) {
  switch (estatus) {
    case 'LIBRE':
      return 'bg-green-500 text-white'
    case 'HOSPITALIZACION':
      return 'bg-red-500 text-white'
    case 'QUIROFANO':
      return 'bg-red-700 text-white animate-pulse'
    case 'RECUPERACION':
      return 'bg-yellow-500 text-black'
    case 'TERAPIA':
      return 'bg-purple-500 text-white'
    case 'URGENCIAS':
      return 'bg-orange-500 text-white animate-pulse'
    case 'MANTENIMIENTO':
      return 'bg-gray-500 text-white'
    default:
      return 'bg-red-500 text-white'
  }
}

function getEstatusDotClass(estatus) {
  switch (estatus) {
    case 'HOSPITALIZACION':
      return 'bg-red-500'
    case 'QUIROFANO':
      return 'bg-red-700'
    case 'RECUPERACION':
      return 'bg-yellow-500'
    case 'TERAPIA':
      return 'bg-purple-500'
    case 'URGENCIAS':
      return 'bg-orange-500'
    case 'MANTENIMIENTO':
      return 'bg-gray-500'
    default:
      return 'bg-red-500'
  }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatTiempoDesdeIngreso(fechaInicio) {
  if (!fechaInicio) return ''

  const inicio = new Date(fechaInicio)
  const ahora = new Date()
  const diff = ahora - inicio

  const dias = Math.floor(diff / (1000 * 60 * 60 * 24))
  const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (dias > 0) {
    return `${dias}d ${horas}h`
  } else if (horas > 0) {
    return `${horas}h ${minutos}m`
  } else {
    return `${minutos}m`
  }
}

function updateClock() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  currentDate.value = now.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

async function fetchHabitaciones() {
  try {
    error.value = null
    const response = await api.get('/recursos/display-habitaciones')

    if (response.data.success) {
      habitaciones.value = response.data.data.habitaciones
      estadisticas.value = response.data.data.estadisticas
    }
  } catch (err) {
    console.error('Error fetching habitaciones:', err)
    error.value = 'Error al cargar las habitaciones'
  } finally {
    loading.value = false
  }
}

function handleMqttUpdate(data) {
  // Recargar datos cuando hay cambios en habitaciones
  if (data.event === 'HABITACION_ASIGNADA' ||
      data.event === 'HABITACION_LIBERADA' ||
      data.event === 'HABITACION_ACTUALIZADA') {
    fetchHabitaciones()
  }
}

let clockInterval = null
let refreshInterval = null

onMounted(async () => {
  // Iniciar reloj
  updateClock()
  clockInterval = setInterval(updateClock, 1000)

  // Cargar configuracion y datos
  await settingsStore.loadSettings()
  await fetchHabitaciones()

  // Conectar MQTT para actualizaciones en tiempo real
  mqttClient.connect()
  mqttClient.onMessage('display-habitaciones', handleMqttUpdate)

  // Refrescar datos cada 30 segundos como fallback
  refreshInterval = setInterval(() => {
    fetchHabitaciones()
  }, 30000)
})

onUnmounted(() => {
  if (clockInterval) clearInterval(clockInterval)
  if (refreshInterval) clearInterval(refreshInterval)
  mqttClient.offMessage('display-habitaciones')
})
</script>

<style scoped>
/* Animaciones suaves para las filas */
.transition-colors {
  transition: background-color 0.3s ease;
}
</style>
