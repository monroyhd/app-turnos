<template>
  <div
    class="h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"
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
        <h1 class="text-3xl font-bold text-white">{{ settingsStore.hospitalName }}</h1>
      </div>
      <div class="text-right">
        <p class="text-4xl font-mono text-cyan-400 font-bold">{{ currentTime }}</p>
        <p class="text-sm text-gray-300">{{ currentDate }}</p>
      </div>
    </header>

    <main class="p-6 overflow-auto" style="height: calc(100vh - 90px);">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        <!-- Panel Principal: Turno Llamado -->
        <div class="lg:col-span-2 flex flex-col gap-6 min-h-0">
          <!-- Turnos Llamados -->
          <div v-if="allCalledTurns.length > 0" class="flex-1 flex flex-col gap-3 min-h-0 overflow-hidden">
            <div
              v-for="(turn, index) in allCalledTurns"
              :key="turn.id"
              class="flex-1 min-h-0 rounded-3xl shadow-2xl border-4 transition-all duration-300 overflow-hidden"
              :class="[
                allCalledTurns.length === 1 ? 'p-8' : allCalledTurns.length === 2 ? 'p-4' : 'p-3',
                isNewTurn && index === 0 ? 'animate-pulse-border bg-gradient-to-br from-emerald-500 via-cyan-500 to-blue-600 border-yellow-400' : 'bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-500 border-cyan-400/50'
              ]"
            >
              <div class="text-center h-full flex flex-col justify-center">
                <p class="text-white/80 uppercase tracking-widest font-semibold" :class="allCalledTurns.length === 1 ? 'text-2xl mb-2' : allCalledTurns.length === 2 ? 'text-base mb-1' : 'text-sm mb-0'">TURNO</p>
                <p
                  class="font-black text-white drop-shadow-lg leading-none"
                  :class="[
                    allCalledTurns.length === 1 ? 'text-9xl mb-4' : allCalledTurns.length === 2 ? 'text-6xl mb-2' : 'text-4xl mb-1',
                    isNewTurn && index === 0 ? 'animate-bounce-slow' : ''
                  ]"
                >
                  {{ turn.code }}
                </p>
                <p class="font-semibold text-white/90 truncate" :class="allCalledTurns.length === 1 ? 'text-4xl mb-8' : allCalledTurns.length === 2 ? 'text-xl mb-2' : 'text-lg mb-1'">
                  {{ turn.patient_name || 'Paciente' }}
                </p>

                <div class="flex justify-center items-center" :class="allCalledTurns.length === 1 ? 'gap-4' : 'gap-2'">
                  <div class="bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30" :class="allCalledTurns.length === 1 ? 'px-8 py-4' : allCalledTurns.length === 2 ? 'px-4 py-2' : 'px-3 py-1'">
                    <p class="text-white/70 uppercase tracking-wider font-medium" :class="allCalledTurns.length >= 3 ? 'text-xs' : 'text-sm'">Consultorio</p>
                    <p class="font-black text-yellow-300 drop-shadow" :class="allCalledTurns.length === 1 ? 'text-4xl' : allCalledTurns.length === 2 ? 'text-xl' : 'text-lg'">{{ turn.consultorio_nombre || turn.office_number || '-' }}</p>
                  </div>
                  <div class="bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30" :class="allCalledTurns.length === 1 ? 'px-8 py-4' : allCalledTurns.length === 2 ? 'px-4 py-2' : 'px-3 py-1'">
                    <p class="text-white/70 uppercase tracking-wider font-medium" :class="allCalledTurns.length >= 3 ? 'text-xs' : 'text-sm'">Doctor</p>
                    <p class="font-bold text-white truncate" :class="allCalledTurns.length === 1 ? 'text-xl' : allCalledTurns.length === 2 ? 'text-base' : 'text-sm'">{{ turn.doctor_name || '-' }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Sin turno llamado -->
          <div v-else class="flex-1 bg-gradient-to-br from-slate-800 to-slate-700 rounded-3xl p-8 text-center shadow-2xl border border-slate-600 flex items-center justify-center">
            <div>
              <div class="text-6xl mb-4">🏥</div>
              <p class="text-5xl text-gray-400 font-light">Esperando turno...</p>
            </div>
          </div>

          <!-- Lista de turnos en atención -->
          <div class="bg-black/40 backdrop-blur-sm rounded-2xl p-5 shadow-xl border border-white/10">
            <h3 class="text-xl font-bold mb-4 text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <span class="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></span>
              En Atención
            </h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div
                v-for="turn in inServiceTurns"
                :key="turn.id"
                class="bg-gradient-to-br from-emerald-800/60 to-emerald-900/60 rounded-xl p-4 text-center border-2 border-emerald-500/50 shadow-lg"
              >
                <p class="text-3xl font-black text-white">{{ turn.code }}</p>
                <p v-if="turn.patient_name" class="text-sm text-white/80 truncate">{{ turn.patient_name }}</p>
                <p class="text-sm text-emerald-300 font-medium">{{ turn.consultorio_nombre || turn.office_number || '-' }}</p>
                <p class="text-xs text-emerald-200/70 mt-1 truncate">{{ turn.doctor_name || '' }}</p>
              </div>
              <p v-if="inServiceTurns.length === 0" class="col-span-full text-center text-gray-500 py-4">
                Sin turnos en atención
              </p>
            </div>
          </div>

        </div>

        <!-- Panel Lateral: Cola de Espera -->
        <div class="lg:col-span-1">
          <div class="bg-black/40 backdrop-blur-sm rounded-2xl p-5 shadow-xl border border-white/10 h-full">
            <h3 class="text-2xl font-bold mb-6 text-center text-orange-400 uppercase tracking-wider flex items-center justify-center gap-2">
              <span class="w-3 h-3 bg-orange-400 rounded-full animate-pulse"></span>
              Próximos
            </h3>

            <div class="space-y-3">
              <div
                v-for="(turn, index) in waitingList"
                :key="turn.id"
                class="rounded-xl p-4 flex items-center transition-all duration-300 border"
                :class="getWaitingItemClass(index, turn.priority)"
              >
                <span class="text-2xl font-black w-10 text-center" :class="index < 3 ? 'text-orange-400' : 'text-gray-500'">{{ index + 1 }}</span>
                <div class="flex-1 ml-3">
                  <div class="flex items-center gap-2">
                    <span class="text-3xl font-black text-white">{{ turn.code }}</span>
                    <span
                      v-if="turn.priority > 0"
                      class="text-xs px-3 py-1 rounded-full font-bold uppercase animate-pulse"
                      :class="turn.priority === 2 ? 'bg-red-500 text-white' : 'bg-yellow-500 text-black'"
                    >
                      {{ turn.priority === 2 ? 'URGENTE' : 'PREFERENTE' }}
                    </span>
                  </div>
                  <p v-if="turn.patient_name" class="text-sm text-gray-300 truncate">{{ turn.patient_name }}</p>
                </div>
                <span class="text-sm text-gray-400 font-medium">{{ turn.service_name }}</span>
              </div>

              <p v-if="waitingList.length === 0" class="text-center py-12 text-gray-500 text-xl">
                No hay turnos en espera
              </p>
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
const isNewTurn = ref(false)

const displayData = computed(() => turnsStore.displayData)

const allCalledTurns = computed(() => {
  return displayData.value.called || []
})

const currentCalledTurn = computed(() => {
  return allCalledTurns.value.length > 0 ? allCalledTurns.value[0] : null
})

const inServiceTurns = computed(() => {
  return displayData.value.inService || []
})

const waitingList = computed(() => {
  return displayData.value.waiting || []
})

function getWaitingItemClass(index, priority) {
  if (priority === 2) {
    return 'bg-red-900/50 border-red-500/50'
  }
  if (priority === 1) {
    return 'bg-yellow-900/30 border-yellow-500/30'
  }
  if (index === 0) {
    return 'bg-gradient-to-r from-orange-600/30 to-orange-500/20 border-orange-500/50'
  }
  if (index < 3) {
    return 'bg-slate-700/50 border-slate-600'
  }
  return 'bg-slate-800/30 border-slate-700/50 opacity-60'
}

function updateClock() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  currentDate.value = now.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function playNotificationSound() {
  if (audioElement.value) {
    audioElement.value.currentTime = 0
    audioElement.value.volume = 1.0
    audioElement.value.play().catch(() => {
      // Autoplay bloqueado por el navegador
    })
  }
}

function triggerNewTurnAnimation() {
  isNewTurn.value = true
  // Reproducir sonido 3 veces con intervalo
  playNotificationSound()
  setTimeout(() => playNotificationSound(), 800)
  setTimeout(() => playNotificationSound(), 1600)

  // Quitar animacion despues de 5 segundos
  setTimeout(() => {
    isNewTurn.value = false
  }, 5000)
}

function handleMqttUpdate(data) {
  if (data.event === 'TURN_CALLED' || data.event === 'DISPLAY_UPDATE') {
    // Recargar datos
    turnsStore.fetchDisplayData()

    // Reproducir sonido y animacion si es un nuevo turno
    if (data.turn && data.turn.id !== lastAnnouncedTurnId.value) {
      lastAnnouncedTurnId.value = data.turn.id
      triggerNewTurnAnimation()
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
@keyframes pulse-border {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(250, 204, 21, 0.7), 0 0 60px rgba(6, 182, 212, 0.5);
  }
  50% {
    box-shadow: 0 0 0 20px rgba(250, 204, 21, 0), 0 0 100px rgba(6, 182, 212, 0.8);
  }
}

.animate-pulse-border {
  animation: pulse-border 1.5s ease-in-out infinite;
}

@keyframes bounce-slow {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.animate-bounce-slow {
  animation: bounce-slow 0.5s ease-in-out infinite;
}
</style>
