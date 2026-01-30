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

    <!-- Mensaje cuando no hay recursos -->
    <div v-if="categorias.length === 0 && activeTab !== 'historial'" class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
      <p class="text-yellow-800">No hay recursos registrados en el sistema.</p>
      <p class="text-sm text-yellow-600 mt-2">Los tipos de recursos apareceran como pestanas cuando se agreguen al sistema.</p>
    </div>

    <!-- Tab: Categoría dinámica -->
    <template v-for="categoria in categorias" :key="categoria">
      <div v-if="activeTab === categoria.toLowerCase()" class="space-y-6">
        <div class="flex justify-between items-center flex-wrap gap-4">
          <h2 class="text-lg font-semibold">{{ formatTipoNombre(categoria) }}</h2>
          <div class="flex items-center gap-4">
            <select
              v-model="filtroEstadoPorCategoria[categoria]"
              class="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">Todos los estados</option>
              <option value="libre">Libre</option>
              <option value="ocupado">Ocupado</option>
            </select>
            <button
              @click="abrirModalRecurso(null, categoria)"
              class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium"
            >
              + Nuevo Recurso
            </button>
          </div>
        </div>

        <!-- Estadísticas por categoría -->
        <div v-if="getRecursosPorTipo(categoria).length > 0" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div class="bg-white p-3 rounded-lg shadow border-l-4" :class="getCategoriaBorderColor(categoria)">
            <div class="text-2xl font-bold">{{ getRecursosPorTipo(categoria).length }}</div>
            <div class="text-sm text-gray-600">Total {{ formatTipoNombre(categoria) }}</div>
          </div>
          <div class="bg-white p-3 rounded-lg shadow border-l-4 border-green-500">
            <div class="text-2xl font-bold">{{ getRecursosLibresPorTipo(categoria) }}</div>
            <div class="text-sm text-gray-600">Libres</div>
          </div>
          <div class="bg-white p-3 rounded-lg shadow border-l-4 border-orange-500">
            <div class="text-2xl font-bold">{{ getRecursosOcupadosPorTipo(categoria) }}</div>
            <div class="text-sm text-gray-600">Ocupados</div>
          </div>
        </div>

        <!-- Tabla genérica por categoría -->
        <div class="bg-white rounded-lg shadow overflow-hidden">
          <table class="min-w-full">
            <thead class="bg-gray-50">
              <!-- Headers para HABITACION -->
              <tr v-if="categoria === 'HABITACION'">
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Habitacion</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paciente</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medico Tratante</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha de Ingreso</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
              <!-- Headers para otros tipos -->
              <tr v-else>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recurso</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ubicacion</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paciente</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doctor</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-if="getRecursosFiltradosPorTipo(categoria).length === 0">
                <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                  No hay {{ formatTipoNombre(categoria).toLowerCase() }} registrados.
                </td>
              </tr>
              <tr v-for="recurso in getRecursosFiltradosPorTipo(categoria)" :key="recurso.id"
                  :class="{'bg-orange-50': recurso.ocupado}">
                <!-- Celdas para HABITACION -->
                <template v-if="categoria === 'HABITACION'">
                  <td class="px-4 py-3 font-medium">{{ recurso.codigo }}</td>
                  <td class="px-4 py-3">
                    <template v-if="recurso.uso_actual">
                      {{ recurso.uso_actual.paciente_nombre }} {{ recurso.uso_actual.paciente_apellidos }}
                    </template>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                  <td class="px-4 py-3">{{ recurso.uso_actual?.doctor_nombre || '-' }}</td>
                  <td class="px-4 py-3">{{ formatDate(recurso.uso_actual?.fecha_inicio) || '-' }}</td>
                  <td class="px-4 py-3">
                    <template v-if="!recurso.ocupado">
                      <span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        LIBRE
                      </span>
                    </template>
                    <template v-else>
                      <select
                        :value="recurso.uso_actual?.estatus"
                        @change="cambiarEstatus(recurso, $event.target.value)"
                        class="px-2 py-1 text-xs font-semibold rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-primary-500"
                        :class="getEstatusClass(recurso.uso_actual?.estatus)"
                      >
                        <option v-for="estatus in estatusOptions" :key="estatus" :value="estatus">
                          {{ estatus }}
                        </option>
                      </select>
                    </template>
                  </td>
                  <td class="px-4 py-3 space-x-2">
                    <template v-if="!recurso.ocupado">
                      <button @click="abrirModalAsignar(recurso)" class="text-green-600 hover:text-green-800">Asignar</button>
                    </template>
                    <template v-else>
                      <button @click="abrirModalEditarUso(recurso)" class="text-primary-600 hover:text-primary-800">Editar</button>
                      <button @click="confirmarLiberar(recurso)" class="text-orange-600 hover:text-orange-800">Liberar</button>
                    </template>
                    <button
                      @click="abrirModalRecurso(recurso)"
                      class="text-gray-500 hover:text-gray-700 ml-2"
                      title="Configurar recurso"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  </td>
                </template>
                <!-- Celdas para otros tipos -->
                <template v-else>
                  <td class="px-4 py-3">
                    <div class="font-medium">{{ recurso.nombre }}</div>
                    <div class="text-sm text-gray-500">{{ recurso.codigo }}</div>
                  </td>
                  <td class="px-4 py-3">{{ recurso.ubicacion || '-' }}</td>
                  <td class="px-4 py-3">
                    <span v-if="!recurso.ocupado" class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      LIBRE
                    </span>
                    <span v-else class="px-2 py-1 text-xs font-semibold rounded-full"
                          :class="getEstatusClass(recurso.uso_actual?.estatus)">
                      {{ recurso.uso_actual?.estatus || 'OCUPADO' }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <template v-if="recurso.uso_actual">
                      {{ recurso.uso_actual.paciente_nombre }} {{ recurso.uso_actual.paciente_apellidos }}
                    </template>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                  <td class="px-4 py-3">
                    {{ recurso.uso_actual?.doctor_nombre || '-' }}
                  </td>
                  <td class="px-4 py-3 space-x-2">
                    <template v-if="!recurso.ocupado">
                      <button @click="abrirModalAsignar(recurso)" class="text-green-600 hover:text-green-800">Asignar</button>
                    </template>
                    <template v-else>
                      <button @click="abrirModalEditarUso(recurso)" class="text-primary-600 hover:text-primary-800">Editar</button>
                      <button @click="confirmarLiberar(recurso)" class="text-orange-600 hover:text-orange-800">Liberar</button>
                    </template>
                    <button
                      @click="abrirModalRecurso(recurso)"
                      class="text-gray-500 hover:text-gray-700 ml-2"
                      title="Configurar recurso"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  </td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Tab: Historial -->
    <div v-if="activeTab === 'historial'" class="space-y-6">
      <div class="flex justify-between items-center flex-wrap gap-4">
        <h2 class="text-lg font-semibold">Historial de Uso</h2>
        <div class="flex items-center gap-4">
          <select
            v-model="filtroHistorialTipo"
            @change="loadHistorial"
            class="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">Todos los tipos</option>
            <option v-for="tipo in categorias" :key="tipo" :value="tipo">
              {{ formatTipoNombre(tipo) }}
            </option>
          </select>
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
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recurso</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
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
              <td colspan="8" class="px-4 py-8 text-center text-gray-500">
                No hay registros en el historial.
              </td>
            </tr>
            <tr v-for="registro in historial" :key="registro.id">
              <td class="px-4 py-3 font-medium">{{ registro.recurso_nombre }}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-1 text-xs font-semibold rounded-full"
                      :class="registro.recurso_tipo === 'CONSULTORIO' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'">
                  {{ registro.recurso_tipo }}
                </span>
              </td>
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

    <!-- Modal: Crear/Editar Recurso -->
    <div v-if="showRecursoModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ isEditingRecurso ? 'Editar Recurso' : 'Nuevo Recurso' }}
          </h3>
        </div>

        <form @submit.prevent="saveRecurso" class="p-6 space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input
                v-model="recursoForm.nombre"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Ej: Consultorio 101"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Codigo *</label>
              <input
                v-model="recursoForm.codigo"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Ej: C101"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
              <select
                v-model="recursoForm.tipo"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="CONSULTORIO">Consultorio</option>
                <option value="HABITACION">Habitacion</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Capacidad</label>
              <input
                v-model.number="recursoForm.capacidad"
                type="number"
                min="1"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Ubicacion</label>
            <input
              v-model="recursoForm.ubicacion"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Ej: Piso 1, Ala Norte"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
            <textarea
              v-model="recursoForm.descripcion"
              rows="2"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            ></textarea>
          </div>

          <div v-if="isEditingRecurso" class="flex items-center">
            <input
              v-model="recursoForm.is_active"
              type="checkbox"
              id="is_active"
              class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label for="is_active" class="ml-2 text-sm text-gray-700">Recurso activo</label>
          </div>

          <div v-if="errorMessage" class="text-red-600 text-sm bg-red-50 p-3 rounded-md">
            {{ errorMessage }}
          </div>

          <div class="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              @click="closeRecursoModal"
              class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {{ saving ? 'Guardando...' : (isEditingRecurso ? 'Actualizar' : 'Guardar') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal: Asignar Paciente -->
    <div v-if="showAsignarModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">
            Asignar Paciente a {{ selectedRecurso?.nombre }}
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
              {{ saving ? 'Guardando...' : 'Asignar' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal: Liberar Recurso -->
    <div v-if="showLiberarModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">Liberar Recurso</h3>
        </div>

        <div class="p-6">
          <p class="mb-4">Se liberara el recurso <strong>{{ selectedRecurso?.nombre }}</strong>:</p>

          <div class="bg-gray-50 p-3 rounded-md mb-4">
            <p><strong>Paciente:</strong> {{ selectedRecurso?.uso_actual?.paciente_nombre }} {{ selectedRecurso?.uso_actual?.paciente_apellidos }}</p>
            <p><strong>Doctor:</strong> {{ selectedRecurso?.uso_actual?.doctor_nombre || 'Sin asignar' }}</p>
            <p><strong>Estatus:</strong> {{ selectedRecurso?.uso_actual?.estatus }}</p>
            <p><strong>Desde:</strong> {{ formatDate(selectedRecurso?.uso_actual?.fecha_inicio) }}</p>
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
              @click="liberarRecurso"
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

// Extraer categorías únicas de los recursos cargados
const recursos = ref([])

const categorias = computed(() => {
  const tipos = [...new Set(recursos.value.map(r => r.tipo))]
  return tipos.sort()
})

// Generar pestañas dinámicamente
const tabs = computed(() => {
  const categoriaTabs = categorias.value.map(tipo => ({
    id: tipo.toLowerCase(),
    name: formatTipoNombre(tipo),
    tipo: tipo
  }))
  return [...categoriaTabs, { id: 'historial', name: 'Historial', tipo: null }]
})

const activeTab = ref('')

// Data
const doctors = ref([])
const historial = ref([])
const statsUsoActual = ref({ total: 0, por_estatus: {} })
const statsHistorial = ref(null)
const historialPagination = ref({ total: 0, limit: 50, offset: 0 })

// Filtros - objeto reactivo por categoría
const filtroEstadoPorCategoria = ref({})
const filtroHistorialTipo = ref('')
const filtroHistorialFechaInicio = ref('')
const filtroHistorialFechaFin = ref('')

// Modals
const showRecursoModal = ref(false)
const showAsignarModal = ref(false)
const showLiberarModal = ref(false)
const isEditingRecurso = ref(false)
const selectedRecurso = ref(null)
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
const recursoForm = ref({
  nombre: '',
  codigo: '',
  tipo: 'CONSULTORIO',
  ubicacion: '',
  capacidad: 1,
  descripcion: '',
  is_active: true
})

const asignarForm = ref({
  paciente_nombre: '',
  paciente_apellidos: '',
  telefono: '',
  doctor_id: null,
  estatus: 'OCUPADO',
  notas: ''
})

const liberarForm = ref({
  notas_finales: ''
})

// Funciones genéricas para recursos por tipo
function getRecursosPorTipo(tipo) {
  return recursos.value.filter(r => r.tipo === tipo)
}

function getRecursosLibresPorTipo(tipo) {
  return getRecursosPorTipo(tipo).filter(r => !r.ocupado).length
}

function getRecursosOcupadosPorTipo(tipo) {
  return getRecursosPorTipo(tipo).filter(r => r.ocupado).length
}

function getRecursosFiltradosPorTipo(tipo) {
  let filtered = getRecursosPorTipo(tipo)
  const filtroEstado = filtroEstadoPorCategoria.value[tipo] || ''
  if (filtroEstado === 'libre') {
    filtered = filtered.filter(r => !r.ocupado)
  } else if (filtroEstado === 'ocupado') {
    filtered = filtered.filter(r => r.ocupado)
  }
  return filtered
}

function formatTipoNombre(tipo) {
  // Las categorías ya vienen formateadas desde el backend
  // Solo mapear casos especiales si es necesario
  const nombres = {
    'HABITACION': 'Habitaciones',
    'CONSULTORIO': 'Consultorios',
    'Sin Categoria': 'Sin Categoría'
  }
  return nombres[tipo] || tipo
}

function getCategoriaBorderColor(tipo) {
  const colores = {
    'HABITACION': 'border-purple-500',
    'CONSULTORIO': 'border-blue-500',
    'Habitaciones': 'border-purple-500',
    'Consultorios': 'border-blue-500'
  }
  return colores[tipo] || 'border-gray-500'
}

// Lifecycle
onMounted(async () => {
  await loadData()
})

// Watcher para establecer primera categoría como activa cuando se cargan los datos
watch(categorias, (newCategorias) => {
  // Solo establecer si activeTab está vacío o no es válido
  if (newCategorias.length > 0 && (!activeTab.value || activeTab.value === '')) {
    activeTab.value = newCategorias[0].toLowerCase()
  }
}, { immediate: true })

// Methods
async function loadData() {
  console.log('loadData: iniciando carga...')
  try {
    const [recursosRes, doctorsRes] = await Promise.all([
      api.get('/recursos?is_active=true'),
      api.get('/doctors?is_active=true')
    ])

    console.log('loadData: respuesta API recursos:', recursosRes.data)
    recursos.value = recursosRes.data.data || []
    doctors.value = doctorsRes.data.data || []

    // Debug: mostrar en consola los recursos cargados
    console.log('Recursos cargados:', recursos.value.length, 'categorias:', [...new Set(recursos.value.map(r => r.tipo))])

    // Calcular estadisticas de uso actual
    const ocupados = recursos.value.filter(r => r.ocupado)
    const porEstatus = {}
    ocupados.forEach(r => {
      const estatus = r.uso_actual?.estatus || 'OCUPADO'
      porEstatus[estatus] = (porEstatus[estatus] || 0) + 1
    })
    statsUsoActual.value = { total: ocupados.length, por_estatus: porEstatus }

  } catch (error) {
    console.error('Error cargando datos:', error)
  }
}

async function loadHistorial(offset = 0) {
  try {
    const params = new URLSearchParams()
    params.append('limit', '50')
    params.append('offset', offset.toString())

    if (filtroHistorialTipo.value) params.append('tipo', filtroHistorialTipo.value)
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

// Recurso modal
function abrirModalRecurso(recurso = null, tipoPreseleccionado = null) {
  if (recurso) {
    isEditingRecurso.value = true
    recursoForm.value = {
      nombre: recurso.nombre,
      codigo: recurso.codigo,
      tipo: recurso.tipo,
      ubicacion: recurso.ubicacion || '',
      capacidad: recurso.capacidad || 1,
      descripcion: recurso.descripcion || '',
      is_active: recurso.is_active
    }
    selectedRecurso.value = recurso
  } else {
    isEditingRecurso.value = false
    // Determinar tipo preseleccionado
    let tipoDefault = 'CONSULTORIO'
    if (tipoPreseleccionado) {
      // Mapear categoria a tipo
      if (tipoPreseleccionado.toUpperCase() === 'HABITACION' || tipoPreseleccionado === 'Habitaciones') {
        tipoDefault = 'HABITACION'
      } else if (tipoPreseleccionado.toUpperCase() === 'CONSULTORIO' || tipoPreseleccionado === 'Consultorios') {
        tipoDefault = 'CONSULTORIO'
      }
    }
    recursoForm.value = {
      nombre: '',
      codigo: '',
      tipo: tipoDefault,
      ubicacion: '',
      capacidad: 1,
      descripcion: '',
      is_active: true
    }
    selectedRecurso.value = null
  }
  errorMessage.value = ''
  showRecursoModal.value = true
}

function closeRecursoModal() {
  showRecursoModal.value = false
  selectedRecurso.value = null
}

async function saveRecurso() {
  saving.value = true
  errorMessage.value = ''

  try {
    if (isEditingRecurso.value && selectedRecurso.value) {
      await api.put(`/recursos/${selectedRecurso.value.id}`, recursoForm.value)
    } else {
      await api.post('/recursos', recursoForm.value)
    }
    closeRecursoModal()
    await loadData()
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Error al guardar el recurso'
  } finally {
    saving.value = false
  }
}

// Asignar modal
function abrirModalAsignar(recurso) {
  selectedRecurso.value = recurso
  asignarForm.value = {
    paciente_nombre: '',
    paciente_apellidos: '',
    telefono: '',
    doctor_id: null,
    estatus: recurso.tipo === 'Habitaciones' ? 'HOSPITALIZACION' : 'OCUPADO',
    notas: ''
  }
  errorMessage.value = ''
  showAsignarModal.value = true
}

function abrirModalEditarUso(recurso) {
  selectedRecurso.value = recurso
  asignarForm.value = {
    paciente_nombre: recurso.uso_actual.paciente_nombre,
    paciente_apellidos: recurso.uso_actual.paciente_apellidos,
    telefono: recurso.uso_actual.telefono || '',
    doctor_id: recurso.uso_actual.doctor_id,
    estatus: recurso.uso_actual.estatus,
    notas: recurso.uso_actual.notas || ''
  }
  errorMessage.value = ''
  showAsignarModal.value = true
}

function closeAsignarModal() {
  showAsignarModal.value = false
  selectedRecurso.value = null
}

async function saveAsignacion() {
  saving.value = true
  errorMessage.value = ''

  try {
    if (selectedRecurso.value.ocupado) {
      await api.put(`/recursos/${selectedRecurso.value.id}/actualizar-uso`, asignarForm.value)
    } else {
      await api.post(`/recursos/${selectedRecurso.value.id}/asignar`, asignarForm.value)
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
function confirmarLiberar(recurso) {
  selectedRecurso.value = recurso
  liberarForm.value = { notas_finales: '' }
  errorMessage.value = ''
  showLiberarModal.value = true
}

function closeLiberarModal() {
  showLiberarModal.value = false
  selectedRecurso.value = null
}

async function liberarRecurso() {
  saving.value = true
  errorMessage.value = ''

  try {
    await api.post(`/recursos/${selectedRecurso.value.id}/liberar`, liberarForm.value)
    closeLiberarModal()
    await loadData()
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Error al liberar recurso'
  } finally {
    saving.value = false
  }
}

// Cambio de estatus dinamico
async function cambiarEstatus(recurso, nuevoEstatus) {
  try {
    await api.put(`/recursos/${recurso.id}/actualizar-uso`, {
      estatus: nuevoEstatus
    })
    // Actualizar localmente
    recurso.uso_actual.estatus = nuevoEstatus
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

function getEstatusBorderColor(estatus) {
  const colors = {
    'HOSPITALIZACION': 'border-blue-500',
    'QUIROFANO': 'border-red-500',
    'RECUPERACION': 'border-yellow-500',
    'TERAPIA': 'border-purple-500',
    'URGENCIAS': 'border-orange-500',
    'MANTENIMIENTO': 'border-gray-400',
    'OCUPADO': 'border-gray-400'
  }
  return colors[estatus] || 'border-gray-400'
}

// Watch tab change to load historial
watch(activeTab, (newTab) => {
  if (newTab === 'historial' && historial.value.length === 0) {
    loadHistorial()
  }
})
</script>
