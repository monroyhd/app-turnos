<template>
  <div class="max-w-7xl mx-auto px-4 py-6">
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Panel del Medico</h1>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Turno Actual -->
      <div class="lg:col-span-1">
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold mb-4">Turno Actual</h2>

          <div v-if="currentTurn" class="space-y-4">
            <div class="text-center p-4 bg-green-50 rounded-lg">
              <span class="text-4xl font-bold text-green-600">{{ currentTurn.code }}</span>
              <p class="text-lg mt-2">{{ currentTurn.patient_name || 'Paciente sin registrar' }}</p>
              <span class="inline-block mt-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                En Atencion
              </span>
            </div>

            <div class="text-sm text-gray-600">
              <p><strong>Servicio:</strong> {{ currentTurn.service_name }}</p>
              <p><strong>Inicio:</strong> {{ formatTime(currentTurn.service_started_at) }}</p>
              <p v-if="currentTurn.notes"><strong>Notas:</strong> {{ currentTurn.notes }}</p>
            </div>

            <button
              @click="finishTurn(currentTurn.id)"
              class="w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              Finalizar Atencion
            </button>
          </div>

          <div v-else class="text-center py-8 text-gray-500">
            <p>No hay turno en atencion</p>
            <p class="text-sm mt-2">Llame al siguiente paciente</p>
          </div>
        </div>
      </div>

      <!-- Cola de Espera -->
      <div class="lg:col-span-2">
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold mb-4">Cola de Espera</h2>

          <div class="space-y-3">
            <div
              v-for="(turn, index) in waitingQueue"
              :key="turn.id"
              class="border rounded-lg p-4 flex items-center justify-between"
              :class="[
                getPriorityClass(turn.priority),
                turn.status === 'CALLED' ? 'bg-blue-50 border-blue-300' : ''
              ]"
            >
              <div class="flex items-center space-x-4">
                <span class="text-sm text-gray-400 w-6">{{ index + 1 }}</span>
                <div>
                  <span class="text-xl font-bold text-primary-600">{{ turn.code }}</span>
                  <span v-if="turn.status === 'CALLED'" class="ml-2 text-sm text-blue-600">(Llamado)</span>
                  <p class="text-sm text-gray-600">{{ turn.patient_name || 'Sin registro' }}</p>
                  <p class="text-xs text-gray-500">{{ turn.service_name }}</p>
                </div>
              </div>

              <div class="flex space-x-2">
                <template v-if="turn.status === 'WAITING'">
                  <button
                    @click="callTurn(turn.id)"
                    :disabled="!!currentTurn"
                    class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    Llamar
                  </button>
                </template>

                <template v-if="turn.status === 'CALLED'">
                  <button
                    @click="startService(turn.id)"
                    class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Iniciar
                  </button>
                  <button
                    @click="markNoShow(turn.id)"
                    class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    No se presento
                  </button>
                  <button
                    @click="recallTurn(turn.id)"
                    class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Volver a cola
                  </button>
                </template>
              </div>
            </div>

            <p v-if="waitingQueue.length === 0" class="text-gray-500 text-center py-4">
              No hay pacientes en espera
            </p>
          </div>
        </div>

        <!-- Turnos Finalizados -->
        <div class="bg-white rounded-lg shadow p-6 mt-6">
          <h2 class="text-lg font-semibold mb-4">Turnos Finalizados Hoy</h2>

          <div class="space-y-2 max-h-48 overflow-y-auto">
            <div
              v-for="turn in finishedTurns"
              :key="turn.id"
              class="flex justify-between items-center p-2 bg-gray-50 rounded"
            >
              <div>
                <span class="font-medium">{{ turn.code }}</span>
                <span class="text-gray-500 ml-2">{{ turn.patient_name }}</span>
              </div>
              <div class="text-sm text-gray-500">
                {{ formatTime(turn.finished_at) }}
                <span
                  :class="turn.status === 'DONE' ? 'text-green-600' : 'text-red-600'"
                  class="ml-2"
                >
                  {{ turn.status === 'DONE' ? 'Atendido' : turn.status === 'NO_SHOW' ? 'No se presento' : 'Cancelado' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTurnsStore } from '../stores/turns'
import mqttClient from '../services/mqttClient'

const turnsStore = useTurnsStore()

const currentTurn = computed(() =>
  turnsStore.turns.find(t => t.status === 'IN_SERVICE')
)

const waitingQueue = computed(() =>
  turnsStore.turns
    .filter(t => t.status === 'WAITING' || t.status === 'CALLED')
    .sort((a, b) => {
      if (a.status === 'CALLED' && b.status !== 'CALLED') return -1
      if (b.status === 'CALLED' && a.status !== 'CALLED') return 1
      if (a.priority !== b.priority) return b.priority - a.priority
      return new Date(a.waiting_at) - new Date(b.waiting_at)
    })
)

const finishedTurns = computed(() =>
  turnsStore.turns
    .filter(t => ['DONE', 'NO_SHOW', 'CANCELLED'].includes(t.status))
    .sort((a, b) => new Date(b.finished_at) - new Date(a.finished_at))
)

onMounted(async () => {
  await turnsStore.fetchMyTurns()
  mqttClient.connect()
  mqttClient.onMessage('doctor', async (data) => {
    // Refrescar turnos cuando hay cualquier evento
    if (data.event) {
      await turnsStore.fetchMyTurns()
    }
  })
})

onUnmounted(() => {
  mqttClient.offMessage('doctor')
})

async function callTurn(turnId) {
  const result = await turnsStore.updateTurnStatus(turnId, 'call')
  if (!result.success) {
    alert(result.message)
  }
}

async function startService(turnId) {
  await turnsStore.updateTurnStatus(turnId, 'start')
}

async function finishTurn(turnId) {
  await turnsStore.updateTurnStatus(turnId, 'finish')
}

async function markNoShow(turnId) {
  await turnsStore.updateTurnStatus(turnId, 'no-show')
}

async function recallTurn(turnId) {
  await turnsStore.updateTurnStatus(turnId, 'recall')
}

function getPriorityClass(priority) {
  if (priority === 2) return 'border-l-4 border-red-500'
  if (priority === 1) return 'border-l-4 border-yellow-500'
  return ''
}

function formatTime(dateString) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}
</script>
