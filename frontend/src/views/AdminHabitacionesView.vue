<template>
  <div class="max-w-7xl mx-auto px-4 py-6">
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Gestion de Habitaciones</h1>

    <!-- Tabs -->
    <div class="border-b border-gray-200 mb-6">
      <nav class="flex space-x-8">
        <button
          @click="activeTab = 'habitaciones'"
          :class="[
            'py-2 px-1 border-b-2 font-medium text-sm',
            activeTab === 'habitaciones'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          ]"
        >
          Habitaciones
        </button>
        <button
          @click="activeTab = 'historial'"
          :class="[
            'py-2 px-1 border-b-2 font-medium text-sm',
            activeTab === 'historial'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          ]"
        >
          Historial
        </button>
      </nav>
    </div>

    <!-- Tab: Habitaciones -->
    <div v-if="activeTab === 'habitaciones'" class="space-y-6">
      <div class="flex justify-between items-center flex-wrap gap-4">
        <h2 class="text-lg font-semibold">Habitaciones</h2>
        <div class="flex items-center gap-4">
          <select
            v-model="filtroEstado"
            class="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">Todos los estados</option>
            <option value="libre">Libre</option>
            <option value="ocupado">Ocupado</option>
          </select>
        </div>
      </div>

      <!-- Estadisticas -->
      <div v-if="habitaciones.length > 0" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div class="bg-white p-3 rounded-lg shadow border-l-4 border-purple-500">
          <div class="text-2xl font-bold">{{ habitaciones.length }}</div>
          <div class="text-sm text-gray-600">Total Habitaciones</div>
        </div>
        <div class="bg-white p-3 rounded-lg shadow border-l-4 border-green-500">
          <div class="text-2xl font-bold">{{ habitacionesLibres }}</div>
          <div class="text-sm text-gray-600">Libres</div>
        </div>
        <div class="bg-white p-3 rounded-lg shadow border-l-4 border-orange-500">
          <div class="text-2xl font-bold">{{ habitacionesOcupadas }}</div>
          <div class="text-sm text-gray-600">Ocupadas</div>
        </div>
      </div>

      <!-- Tabla de habitaciones -->
      <div class="bg-white rounded-lg shadow overflow-hidden">
        <table class="min-w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Habitacion</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paciente</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medico Tratante</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha de Ingreso</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-if="habitacionesFiltradas.length === 0">
              <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                No hay habitaciones registradas.
              </td>
            </tr>
            <tr v-for="habitacion in habitacionesFiltradas" :key="habitacion.id"
                :class="{'bg-orange-50': habitacion.ocupado}">
              <td class="px-4 py-3 font-medium">{{ habitacion.codigo }}</td>
              <td class="px-4 py-3">
                <template v-if="habitacion.uso_actual">
                  {{ habitacion.uso_actual.paciente_nombre }} {{ habitacion.uso_actual.paciente_apellidos }}
                </template>
                <span v-else class="text-gray-400">-</span>
              </td>
              <td class="px-4 py-3">{{ habitacion.uso_actual?.doctor_nombre || '-' }}</td>
              <td class="px-4 py-3">{{ formatDate(habitacion.uso_actual?.fecha_inicio) || '-' }}</td>
              <td class="px-4 py-3">
                <template v-if="!habitacion.ocupado">
                  <span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    LIBRE
                  </span>
                </template>
                <template v-else>
                  <select
                    :value="habitacion.uso_actual?.estatus"
                    @change="cambiarEstatus(habitacion, $event.target.value)"
                    class="px-2 py-1 text-xs font-semibold rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-primary-500"
                    :class="getEstatusClass(habitacion.uso_actual?.estatus)"
                  >
                    <option v-for="estatus in estatusOptions" :key="estatus" :value="estatus">
                      {{ estatus }}
                    </option>
                  </select>
                </template>
              </td>
              <td class="px-4 py-3 space-x-2">
                <template v-if="!habitacion.ocupado">
                  <button @click="abrirModalAsignar(habitacion)" class="text-green-600 hover:text-green-800">Asignar</button>
                </template>
                <template v-else>
                  <button @click="abrirModalEditarUso(habitacion)" class="text-primary-600 hover:text-primary-800">Editar</button>
                  <button @click="confirmarLiberar(habitacion)" class="text-orange-600 hover:text-orange-800">Liberar</button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tab: Historial -->
    <div v-if="activeTab === 'historial'" class="space-y-6">
      <div class="flex justify-between items-center flex-wrap gap-4">
        <h2 class="text-lg font-semibold">Historial de Uso</h2>
        <div class="flex items-center gap-4">
          <input
            v-model="filtroHistorialFechaInicio"
            type="date"
            @change="loadHistorial"
            class="px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="Desde"
          />
          <input
            v-model="filtroHistorialFechaFin"
            type="date"
            @change="loadHistorial"
            class="px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="Hasta"
          />
        </div>
      </div>

      <!-- Estadisticas del historial -->
      <div v-if="statsHistorial" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div class="bg-white p-3 rounded-lg shadow border-l-4 border-blue-500">
          <div class="text-2xl font-bold">{{ statsHistorial.total }}</div>
          <div class="text-sm text-gray-600">Total Usos</div>
        </div>
        <div class="bg-white p-3 rounded-lg shadow border-l-4 border-green-500">
          <div class="text-2xl font-bold">{{ formatDuracion(statsHistorial.duracion_promedio_minutos) }}</div>
          <div class="text-sm text-gray-600">Duracion Promedio</div>
        </div>
      </div>

      <!-- Tabla de historial -->
      <div class="bg-white rounded-lg shadow overflow-hidden">
        <table class="min-w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Habitacion</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paciente</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doctor</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Inicio</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Fin</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duracion</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estatus</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-if="historial.length === 0">
              <td colspan="7" class="px-4 py-8 text-center text-gray-500">
                No hay registros en el historial.
              </td>
            </tr>
            <tr v-for="registro in historial" :key="registro.id">
              <td class="px-4 py-3 font-medium">{{ registro.recurso_nombre }}</td>
              <td class="px-4 py-3">{{ registro.paciente_nombre }} {{ registro.paciente_apellidos }}</td>
              <td class="px-4 py-3">
                <div>{{ registro.doctor_nombre || '-' }}</div>
                <div v-if="registro.especialidad" class="text-xs text-gray-500">{{ registro.especialidad }}</div>
              </td>
              <td class="px-4 py-3">{{ formatDate(registro.fecha_inicio) }}</td>
              <td class="px-4 py-3">{{ formatDate(registro.fecha_fin) }}</td>
              <td class="px-4 py-3">{{ formatDuracion(registro.duracion_minutos) }}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-1 text-xs font-semibold rounded-full"
                      :class="getEstatusClass(registro.estatus_final)">
                  {{ registro.estatus_final || '-' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginacion -->
      <div v-if="historialPagination.total > historialPagination.limit" class="flex justify-center mt-4">
        <button
          @click="loadHistorial(historialPagination.offset - historialPagination.limit)"
          :disabled="historialPagination.offset === 0"
          class="px-4 py-2 mr-2 bg-gray-200 rounded-md disabled:opacity-50"
        >
          Anterior
        </button>
        <span class="px-4 py-2">
          {{ Math.floor(historialPagination.offset / historialPagination.limit) + 1 }} de {{ Math.ceil(historialPagination.total / historialPagination.limit) }}
        </span>
        <button
          @click="loadHistorial(historialPagination.offset + historialPagination.limit)"
          :disabled="historialPagination.offset + historialPagination.limit >= historialPagination.total"
          class="px-4 py-2 ml-2 bg-gray-200 rounded-md disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>
    </div>

    <!-- Modal: Asignar Paciente -->
    <div v-if="showAsignarModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ selectedHabitacion?.ocupado ? 'Editar Uso de' : 'Asignar Paciente a' }} {{ selectedHabitacion?.nombre }}
          </h3>
        </div>

        <form @submit.prevent="saveAsignacion" class="p-6 space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input
                v-model="asignarForm.paciente_nombre"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Apellidos *</label>
              <input
                v-model="asignarForm.paciente_apellidos"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
            <input
              v-model="asignarForm.telefono"
              type="tel"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Doctor Responsable</label>
            <select
              v-model="asignarForm.doctor_id"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option :value="null">-- Sin asignar --</option>
              <option v-for="doctor in doctors" :key="doctor.id" :value="doctor.id">
                {{ doctor.full_name }} - {{ doctor.specialty || 'General' }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Estatus *</label>
            <select
              v-model="asignarForm.estatus"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option v-for="estatus in estatusOptions" :key="estatus" :value="estatus">
                {{ estatus }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              v-model="asignarForm.notas"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            ></textarea>
          </div>

          <div v-if="errorMessage" class="text-red-600 text-sm bg-red-50 p-3 rounded-md">
            {{ errorMessage }}
          </div>

          <div class="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              @click="closeAsignarModal"
              class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {{ saving ? 'Guardando...' : (selectedHabitacion?.ocupado ? 'Actualizar' : 'Asignar') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal: Liberar Habitacion -->
    <div v-if="showLiberarModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">Liberar Habitacion</h3>
        </div>

        <div class="p-6">
          <p class="mb-4">Se liberara la habitacion <strong>{{ selectedHabitacion?.nombre }}</strong>:</p>

          <div class="bg-gray-50 p-3 rounded-md mb-4">
            <p><strong>Paciente:</strong> {{ selectedHabitacion?.uso_actual?.paciente_nombre }} {{ selectedHabitacion?.uso_actual?.paciente_apellidos }}</p>
            <p><strong>Doctor:</strong> {{ selectedHabitacion?.uso_actual?.doctor_nombre || 'Sin asignar' }}</p>
            <p><strong>Estatus:</strong> {{ selectedHabitacion?.uso_actual?.estatus }}</p>
            <p><strong>Desde:</strong> {{ formatDate(selectedHabitacion?.uso_actual?.fecha_inicio) }}</p>
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Notas finales (opcional)</label>
            <textarea
              v-model="liberarForm.notas_finales"
              rows="2"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Observaciones al liberar..."
            ></textarea>
          </div>

          <p class="text-sm text-gray-500 mb-4">
            Esta accion movera el registro al historial.
          </p>

          <div v-if="errorMessage" class="text-red-600 text-sm bg-red-50 p-3 rounded-md mb-4">
            {{ errorMessage }}
          </div>

          <div class="flex justify-end space-x-3">
            <button
              @click="closeLiberarModal"
              class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              @click="liberarHabitacion"
              :disabled="saving"
              class="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
            >
              {{ saving ? 'Liberando...' : 'Confirmar Liberacion' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import api from '../services/api'

// Data
const habitaciones = ref([])
const doctors = ref([])
const historial = ref([])
const statsHistorial = ref(null)
const historialPagination = ref({ total: 0, limit: 50, offset: 0 })

// Tabs y filtros
const activeTab = ref('habitaciones')
const filtroEstado = ref('')
const filtroHistorialFechaInicio = ref('')
const filtroHistorialFechaFin = ref('')

// Modals
const showAsignarModal = ref(false)
const showLiberarModal = ref(false)
const selectedHabitacion = ref(null)
const saving = ref(false)
const errorMessage = ref('')

const estatusOptions = [
  'OCUPADO',
  'HOSPITALIZACION',
  'QUIROFANO',
  'RECUPERACION',
  'TERAPIA',
  'URGENCIAS',
  'MANTENIMIENTO'
]

// Forms
const asignarForm = ref({
  paciente_nombre: '',
  paciente_apellidos: '',
  telefono: '',
  doctor_id: null,
  estatus: 'HOSPITALIZACION',
  notas: ''
})

const liberarForm = ref({
  notas_finales: ''
})

// Computed
const habitacionesLibres = computed(() => {
  return habitaciones.value.filter(h => !h.ocupado).length
})

const habitacionesOcupadas = computed(() => {
  return habitaciones.value.filter(h => h.ocupado).length
})

const habitacionesFiltradas = computed(() => {
  let filtered = habitaciones.value
  if (filtroEstado.value === 'libre') {
    filtered = filtered.filter(h => !h.ocupado)
  } else if (filtroEstado.value === 'ocupado') {
    filtered = filtered.filter(h => h.ocupado)
  }
  return filtered
})

// Lifecycle
onMounted(async () => {
  await loadData()
})

// Methods
async function loadData() {
  try {
    const [recursosRes, doctorsRes] = await Promise.all([
      api.get('/recursos?is_active=true'),
      api.get('/doctors?is_active=true')
    ])

    // Filtrar solo HABITACION
    habitaciones.value = (recursosRes.data.data || []).filter(r => r.tipo === 'HABITACION')
    doctors.value = doctorsRes.data.data || []

  } catch (error) {
    console.error('Error cargando datos:', error)
  }
}

async function loadHistorial(offset = 0) {
  try {
    const params = new URLSearchParams()
    params.append('limit', '50')
    params.append('offset', offset.toString())
    params.append('tipo', 'HABITACION')

    if (filtroHistorialFechaInicio.value) params.append('fecha_inicio', filtroHistorialFechaInicio.value)
    if (filtroHistorialFechaFin.value) params.append('fecha_fin', filtroHistorialFechaFin.value)

    const [historialRes, statsRes] = await Promise.all([
      api.get(`/recursos/historial/lista?${params.toString()}`),
      api.get(`/recursos/historial/stats?${params.toString()}`)
    ])

    historial.value = historialRes.data.data || []
    historialPagination.value = historialRes.data.pagination || { total: 0, limit: 50, offset: 0 }
    statsHistorial.value = statsRes.data.data?.historial || null

  } catch (error) {
    console.error('Error cargando historial:', error)
  }
}

// Asignar modal
function abrirModalAsignar(habitacion) {
  selectedHabitacion.value = habitacion
  asignarForm.value = {
    paciente_nombre: '',
    paciente_apellidos: '',
    telefono: '',
    doctor_id: null,
    estatus: 'HOSPITALIZACION',
    notas: ''
  }
  errorMessage.value = ''
  showAsignarModal.value = true
}

function abrirModalEditarUso(habitacion) {
  selectedHabitacion.value = habitacion
  asignarForm.value = {
    paciente_nombre: habitacion.uso_actual.paciente_nombre,
    paciente_apellidos: habitacion.uso_actual.paciente_apellidos,
    telefono: habitacion.uso_actual.telefono || '',
    doctor_id: habitacion.uso_actual.doctor_id,
    estatus: habitacion.uso_actual.estatus,
    notas: habitacion.uso_actual.notas || ''
  }
  errorMessage.value = ''
  showAsignarModal.value = true
}

function closeAsignarModal() {
  showAsignarModal.value = false
  selectedHabitacion.value = null
}

async function saveAsignacion() {
  saving.value = true
  errorMessage.value = ''

  try {
    if (selectedHabitacion.value.ocupado) {
      await api.put(`/recursos/${selectedHabitacion.value.id}/actualizar-uso`, asignarForm.value)
    } else {
      await api.post(`/recursos/${selectedHabitacion.value.id}/asignar`, asignarForm.value)
    }
    closeAsignarModal()
    await loadData()
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Error al asignar paciente'
  } finally {
    saving.value = false
  }
}

// Liberar modal
function confirmarLiberar(habitacion) {
  selectedHabitacion.value = habitacion
  liberarForm.value = { notas_finales: '' }
  errorMessage.value = ''
  showLiberarModal.value = true
}

function closeLiberarModal() {
  showLiberarModal.value = false
  selectedHabitacion.value = null
}

async function liberarHabitacion() {
  saving.value = true
  errorMessage.value = ''

  try {
    await api.post(`/recursos/${selectedHabitacion.value.id}/liberar`, liberarForm.value)
    closeLiberarModal()
    await loadData()
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Error al liberar habitacion'
  } finally {
    saving.value = false
  }
}

// Cambio de estatus dinamico
async function cambiarEstatus(habitacion, nuevoEstatus) {
  try {
    await api.put(`/recursos/${habitacion.id}/actualizar-uso`, {
      estatus: nuevoEstatus
    })
    // Actualizar localmente
    habitacion.uso_actual.estatus = nuevoEstatus
  } catch (error) {
    console.error('Error al cambiar estatus:', error)
    // Revertir visualmente si falla
    await loadData()
  }
}

// Utilities
function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatDuracion(minutos) {
  if (!minutos) return '-'
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  const mins = minutos % 60
  if (horas < 24) return `${horas}h ${mins}m`
  const dias = Math.floor(horas / 24)
  const horasRestantes = horas % 24
  return `${dias}d ${horasRestantes}h`
}

function getEstatusClass(estatus) {
  const classes = {
    'HOSPITALIZACION': 'bg-blue-100 text-blue-800',
    'QUIROFANO': 'bg-red-100 text-red-800',
    'RECUPERACION': 'bg-yellow-100 text-yellow-800',
    'TERAPIA': 'bg-purple-100 text-purple-800',
    'URGENCIAS': 'bg-orange-100 text-orange-800',
    'MANTENIMIENTO': 'bg-gray-100 text-gray-600',
    'OCUPADO': 'bg-gray-100 text-gray-800'
  }
  return classes[estatus] || 'bg-gray-100 text-gray-800'
}

// Watch tab change to load historial
watch(activeTab, (newTab) => {
  if (newTab === 'historial' && historial.value.length === 0) {
    loadHistorial()
  }
})
</script>
