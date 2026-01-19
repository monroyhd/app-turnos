<template>
  <div class="max-w-7xl mx-auto px-4 py-6">
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Administracion de Recursos</h1>

    <!-- Tabs -->
    <div class="border-b border-gray-200 mb-6">
      <nav class="flex space-x-8">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'py-2 px-1 border-b-2 font-medium text-sm',
            activeTab === tab.id
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          ]"
        >
          {{ tab.name }}
        </button>
      </nav>
    </div>

    <!-- Habitaciones -->
    <div v-if="activeTab === 'habitaciones'" class="space-y-6">
      <div class="flex justify-between items-center">
        <h2 class="text-lg font-semibold">Habitaciones</h2>
        <button
          @click="agregarHabitacion"
          class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          + Agregar Habitacion
        </button>
      </div>

      <div class="bg-white rounded-lg shadow overflow-hidden">
        <table class="min-w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Numero</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Piso</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Capacidad</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-if="habitaciones.length === 0">
              <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                No hay habitaciones registradas. Haga clic en "Agregar Habitacion" para crear una.
              </td>
            </tr>
            <tr v-for="habitacion in habitaciones" :key="habitacion.id">
              <td class="px-4 py-3 font-medium">{{ habitacion.numero }}</td>
              <td class="px-4 py-3">{{ habitacion.piso || '-' }}</td>
              <td class="px-4 py-3">{{ habitacion.tipo || '-' }}</td>
              <td class="px-4 py-3">{{ habitacion.capacidad || '-' }}</td>
              <td class="px-4 py-3">
                <span :class="habitacion.is_active ? 'text-green-600' : 'text-red-600'">
                  {{ habitacion.is_active ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <button @click="editarHabitacion(habitacion)" class="text-primary-600 hover:text-primary-800 mr-2">Editar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Consultorios -->
    <div v-if="activeTab === 'consultorios'" class="space-y-6">
      <div class="flex justify-between items-center">
        <h2 class="text-lg font-semibold">Consultorios</h2>
        <button
          @click="agregarConsultorio"
          class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          + Agregar Consultorio
        </button>
      </div>

      <div class="bg-white rounded-lg shadow overflow-hidden">
        <table class="min-w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Numero</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Piso</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Especialidad</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-if="consultorios.length === 0">
              <td colspan="5" class="px-4 py-8 text-center text-gray-500">
                No hay consultorios registrados. Haga clic en "Agregar Consultorio" para crear uno.
              </td>
            </tr>
            <tr v-for="consultorio in consultorios" :key="consultorio.id">
              <td class="px-4 py-3 font-medium">{{ consultorio.numero }}</td>
              <td class="px-4 py-3">{{ consultorio.piso || '-' }}</td>
              <td class="px-4 py-3">{{ consultorio.especialidad || '-' }}</td>
              <td class="px-4 py-3">
                <span :class="consultorio.is_active ? 'text-green-600' : 'text-red-600'">
                  {{ consultorio.is_active ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <button @click="editarConsultorio(consultorio)" class="text-primary-600 hover:text-primary-800 mr-2">Editar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const tabs = [
  { id: 'habitaciones', name: 'Habitaciones' },
  { id: 'consultorios', name: 'Consultorios' }
]

const activeTab = ref('habitaciones')
const habitaciones = ref([])
const consultorios = ref([])

onMounted(async () => {
  await loadData()
})

async function loadData() {
  // TODO: Cargar datos desde API cuando esten disponibles
  // Por ahora los arrays permanecen vacios
}

function agregarHabitacion() {
  alert('Funcionalidad de agregar habitacion - Por definir en siguiente fase')
}

function editarHabitacion(habitacion) {
  alert(`Editar habitacion ${habitacion.numero} - Por definir en siguiente fase`)
}

function agregarConsultorio() {
  alert('Funcionalidad de agregar consultorio - Por definir en siguiente fase')
}

function editarConsultorio(consultorio) {
  alert(`Editar consultorio ${consultorio.numero} - Por definir en siguiente fase`)
}
</script>
