<template>
  <div
    class="h-screen overflow-hidden text-gray-800 bg-gray-50"
    :style="settingsStore.backgroundUrl ? { backgroundImage: `url(${settingsStore.backgroundUrl})`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundColor: '#f9fafb' } : {}"
  >
    <!-- Header -->
    <header class="bg-white shadow-sm py-4 px-6 flex justify-between items-center border-b border-gray-200">
      <div class="flex items-center space-x-4">
        <img
          v-if="settingsStore.logoUrl"
          :src="settingsStore.logoUrl"
          alt="Logo"
          class="h-12 w-auto object-contain"
        >
        <h1 class="text-2xl font-bold text-gray-900">{{ settingsStore.hospitalName }}</h1>
      </div>
      <div class="text-right">
        <p class="text-3xl font-mono text-gray-900">{{ currentTime }}</p>
        <p class="text-sm text-gray-500">{{ currentDate }}</p>
      </div>
    </header>

    <main class="p-6 overflow-auto" style="height: calc(100vh - 80px);">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Panel Principal: Turno Llamado -->
        <div class="lg:col-span-2">
          <div
            v-if="currentCalledTurn"
            class="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 announcement-enter"
          >
            <div class="text-center">
              <p class="text-gray-400 text-lg mb-2 uppercase tracking-wider">Turno</p>
              <p class="text-8xl font-bold text-blue-600 mb-4">
                {{ currentCalledTurn.code }}
              </p>
              <p class="text-3xl font-medium text-gray-700 mb-6">
                {{ currentCalledTurn.patient_name || 'Paciente' }}
              </p>

              <div class="flex justify-center items-center space-x-4 text-xl">
                <div class="bg-gray-50 rounded-lg px-6 py-3 border border-gray-200">
                  <p class="text-gray-400 text-sm uppercase tracking-wider">Consultorio</p>
                  <p class="font-bold text-2xl text-gray-900">{{ currentCalledTurn.office_number || '-' }}</p>
                </div>
                <div class="bg-gray-50 rounded-lg px-6 py-3 border border-gray-200">
                  <p class="text-gray-400 text-sm uppercase tracking-wider">Doctor</p>
                  <p class="font-bold text-gray-900">{{ currentCalledTurn.doctor_name || '-' }}</p>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="bg-white rounded-2xl p-8 text-center shadow-lg border border-gray-100">
            <p class="text-4xl text-gray-400">Esperando turno...</p>
          </div>

          <!-- Lista de turnos llamados recientemente -->
          <div class="mt-6 bg-white rounded-xl p-4 shadow-md border border-gray-100">
            <h3 class="text-lg font-semibold mb-3 text-gray-600 uppercase tracking-wider">Turnos Llamados</h3>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div
                v-for="turn in recentCalledTurns"
                :key="turn.id"
                class="bg-gray-50 rounded-lg p-3 text-center border border-gray-200"
              >
                <p class="text-2xl font-bold text-gray-800">{{ turn.code }}</p>
                <p class="text-sm text-gray-500">{{ turn.office_number || 'Consultorio -' }}</p>
              </div>
              <p v-if="recentCalledTurns.length === 0" class="col-span-full text-center text-gray-400">
                Sin turnos llamados
              </p>
            </div>
          </div>
        </div>

        <!-- Panel Lateral: Cola de Espera -->
        <div class="lg:col-span-1">
          <div class="bg-white rounded-xl p-4 shadow-md border border-gray-100">
            <h3 class="text-xl font-semibold mb-4 text-center text-gray-700 uppercase tracking-wider">
              Próximos en Espera
            </h3>

            <div class="space-y-3">
              <div
                v-for="(turn, index) in waitingList"
                :key="turn.id"
                class="bg-gray-50 rounded-lg p-4 flex items-center border border-gray-200"
                :class="{ 'opacity-50': index > 4 }"
              >
                <span class="text-gray-400 text-sm w-8">{{ index + 1 }}</span>
                <div class="flex-1">
                  <span class="text-2xl font-bold text-gray-800">{{ turn.code }}</span>
                  <span
                    v-if="turn.priority > 0"
                    class="ml-2 text-xs px-2 py-1 rounded text-white"
                    :class="turn.priority === 2 ? 'bg-red-500' : 'bg-yellow-500'"
                  >
                    {{ turn.priority === 2 ? 'URGENTE' : 'PREFERENTE' }}
                  </span>
                </div>
                <span class="text-sm text-gray-500">{{ turn.service_name }}</span>
              </div>

              <p v-if="waitingList.length === 0" class="text-center py-8 text-gray-400">
                No hay turnos en espera
              </p>
            </div>
          </div>

          <!-- Estadisticas -->
          <div class="mt-6 bg-white rounded-xl p-4 shadow-md border border-gray-100">
            <h3 class="text-lg font-semibold mb-3 text-center text-gray-600 uppercase tracking-wider">Estadísticas del Día</h3>
            <div class="grid grid-cols-2 gap-3 text-center">
              <div class="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p class="text-3xl font-bold text-gray-800">{{ displayData.stats?.total || 0 }}</p>
                <p class="text-xs text-gray-500 uppercase">Total</p>
              </div>
              <div class="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p class="text-3xl font-bold text-green-600">{{ displayData.stats?.by_status?.DONE || 0 }}</p>
                <p class="text-xs text-gray-500 uppercase">Atendidos</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Audio para anuncios -->
    <audio ref="audioElement" preload="auto">
      <source src="/sounds/notification.mp3" type="audio/mpeg">
    </audio>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTurnsStore } from '../stores/turns'
import { useSettingsStore } from '../stores/settings'
import mqttClient from '../services/mqttClient'

const turnsStore = useTurnsStore()
const settingsStore = useSettingsStore()
const audioElement = ref(null)

const currentTime = ref('')
const currentDate = ref('')
const lastAnnouncedTurnId = ref(null)

const displayData = computed(() => turnsStore.displayData)

const currentCalledTurn = computed(() => {
  const called = displayData.value.called || []
  return called.length > 0 ? called[0] : null
})

const recentCalledTurns = computed(() => {
  const called = displayData.value.called || []
  return called.slice(1, 7) // Los siguientes 6 turnos llamados
})

const waitingList = computed(() => {
  return displayData.value.waiting || []
})

function updateClock() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  currentDate.value = now.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function playNotificationSound() {
  if (audioElement.value) {
    audioElement.value.currentTime = 0
    audioElement.value.play().catch(() => {
      // Autoplay bloqueado por el navegador
    })
  }
}

function handleMqttUpdate(data) {
  if (data.event === 'TURN_CALLED' || data.event === 'DISPLAY_UPDATE') {
    // Recargar datos
    turnsStore.fetchDisplayData()

    // Reproducir sonido si es un nuevo turno
    if (data.turn && data.turn.id !== lastAnnouncedTurnId.value) {
      lastAnnouncedTurnId.value = data.turn.id
      playNotificationSound()
    }
  }

  if (data.event === 'QUEUE_UPDATE') {
    turnsStore.fetchDisplayData()
  }
}

let clockInterval = null
let refreshInterval = null

onMounted(async () => {
  // Iniciar reloj
  updateClock()
  clockInterval = setInterval(updateClock, 1000)

  // Cargar configuracion y datos iniciales
  await settingsStore.loadSettings()
  await turnsStore.fetchDisplayData()

  // Conectar MQTT
  mqttClient.connect()
  mqttClient.onMessage('display', handleMqttUpdate)

  // Refrescar datos periodicamente como fallback
  refreshInterval = setInterval(() => {
    turnsStore.fetchDisplayData()
  }, 30000) // Cada 30 segundos
})

onUnmounted(() => {
  if (clockInterval) clearInterval(clockInterval)
  if (refreshInterval) clearInterval(refreshInterval)
  mqttClient.offMessage('display')
})
</script>

<style scoped>
@keyframes fade-in-scale {
  0% {
    opacity: 0;
    transform: scale(0.95);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.announcement-enter {
  animation: fade-in-scale 0.5s ease-out;
}
</style>
