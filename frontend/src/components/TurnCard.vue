<template>
  <div
    class="border rounded-lg p-4"
    :class="[
      priorityClass,
      statusClass,
      { 'turn-called': turn.status === 'CALLED' }
    ]"
  >
    <div class="flex justify-between items-start">
      <div>
        <span class="text-xl font-bold text-primary-600">{{ turn.code }}</span>
        <span :class="statusBadgeClass" class="ml-2 px-2 py-1 text-xs rounded">
          {{ statusLabel }}
        </span>
      </div>
      <div class="text-sm text-gray-500">
        {{ formattedTime }}
      </div>
    </div>

    <div class="mt-2 text-sm space-y-1">
      <p v-if="turn.patient_name">
        <span class="text-gray-500">Paciente:</span> {{ turn.patient_name }}
      </p>
      <p>
        <span class="text-gray-500">Servicio:</span> {{ turn.service_name }}
      </p>
      <p v-if="turn.doctor_name">
        <span class="text-gray-500">Doctor:</span> {{ turn.doctor_name }}
        <span v-if="turn.office_number" class="text-gray-400">({{ turn.office_number }})</span>
      </p>
      <p v-if="turn.notes" class="text-gray-600 italic">{{ turn.notes }}</p>
    </div>

    <div v-if="showActions" class="mt-3 flex flex-wrap gap-2">
      <slot name="actions"></slot>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  turn: {
    type: Object,
    required: true
  },
  showActions: {
    type: Boolean,
    default: false
  }
})

const priorityClass = computed(() => {
  if (props.turn.priority === 2) return 'border-l-4 border-red-500'
  if (props.turn.priority === 1) return 'border-l-4 border-yellow-500'
  return ''
})

const statusClass = computed(() => {
  const classes = {
    CALLED: 'bg-blue-50 border-blue-200',
    IN_SERVICE: 'bg-green-50 border-green-200'
  }
  return classes[props.turn.status] || ''
})

const statusBadgeClass = computed(() => {
  const classes = {
    CREATED: 'bg-gray-100 text-gray-800',
    WAITING: 'bg-yellow-100 text-yellow-800',
    CALLED: 'bg-blue-100 text-blue-800',
    IN_SERVICE: 'bg-green-100 text-green-800',
    DONE: 'bg-gray-200 text-gray-600',
    NO_SHOW: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-red-200 text-red-900'
  }
  return classes[props.turn.status] || ''
})

const statusLabel = computed(() => {
  const labels = {
    CREATED: 'Creado',
    WAITING: 'En Espera',
    CALLED: 'Llamado',
    IN_SERVICE: 'En Atencion',
    DONE: 'Finalizado',
    NO_SHOW: 'No se presento',
    CANCELLED: 'Cancelado'
  }
  return labels[props.turn.status] || props.turn.status
})

const formattedTime = computed(() => {
  const date = new Date(props.turn.created_at)
  return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
})
</script>
