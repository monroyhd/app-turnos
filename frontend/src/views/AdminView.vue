<template>
  <div class="max-w-7xl mx-auto px-4 py-6">
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Panel de Administracion</h1>

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

    <!-- Dashboard -->
    <div v-if="activeTab === 'dashboard'" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-lg shadow p-4">
          <p class="text-gray-500 text-sm">Total Hoy</p>
          <p class="text-3xl font-bold text-gray-900">{{ stats.total || 0 }}</p>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <p class="text-gray-500 text-sm">En Espera</p>
          <p class="text-3xl font-bold text-yellow-600">{{ stats.by_status?.WAITING || 0 }}</p>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <p class="text-gray-500 text-sm">Atendidos</p>
          <p class="text-3xl font-bold text-green-600">{{ stats.by_status?.DONE || 0 }}</p>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <p class="text-gray-500 text-sm">No Presentados</p>
          <p class="text-3xl font-bold text-red-600">{{ stats.by_status?.NO_SHOW || 0 }}</p>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold mb-4">Todos los Turnos de Hoy</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Codigo</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Paciente</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Servicio</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Doctor</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hora</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="turn in allTurns" :key="turn.id">
                <td class="px-4 py-2 font-medium">{{ turn.code }}</td>
                <td class="px-4 py-2">{{ turn.patient_name || '-' }}</td>
                <td class="px-4 py-2">{{ turn.service_name }}</td>
                <td class="px-4 py-2">{{ turn.doctor_name || '-' }}</td>
                <td class="px-4 py-2">
                  <span :class="getStatusClass(turn.status)" class="px-2 py-1 text-xs rounded">
                    {{ getStatusLabel(turn.status) }}
                  </span>
                </td>
                <td class="px-4 py-2 text-sm text-gray-500">{{ formatTime(turn.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Doctores -->
    <div v-if="activeTab === 'doctors'" class="space-y-6">
      <div class="flex justify-between items-center">
        <h2 class="text-lg font-semibold">Medicos</h2>
        <button
          @click="openNewDoctorModal"
          class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          + Agregar Medico
        </button>
      </div>

      <div class="bg-white rounded-lg shadow overflow-hidden">
        <table class="min-w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Especialidad</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefono</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="doctor in doctors" :key="doctor.id">
              <td class="px-4 py-3">{{ doctor.full_name }}</td>
              <td class="px-4 py-3 text-sm text-gray-600 font-mono">{{ doctor.username || '-' }}</td>
              <td class="px-4 py-3">{{ doctor.specialty || '-' }}</td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ doctor.email || '-' }}</td>
              <td class="px-4 py-3 text-sm">{{ doctor.phone || '-' }}</td>
              <td class="px-4 py-3">
                <button @click="editDoctor(doctor)" class="text-primary-600 hover:text-primary-800 mr-2">Editar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Servicios -->
    <div v-if="activeTab === 'services'" class="space-y-6">
      <div class="flex justify-between items-center">
        <h2 class="text-lg font-semibold">Servicios</h2>
        <button
          @click="openNewServiceModal"
          class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          + Agregar Servicio
        </button>
      </div>

      <!-- Servicios agrupados por categoria -->
      <div v-for="(categoryServices, category) in servicesByCategory" :key="category" class="space-y-2">
        <!-- Header de categoria -->
        <div class="flex items-center gap-2 py-2">
          <h3 class="text-md font-semibold text-gray-700">{{ category }}</h3>
          <span class="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{{ categoryServices.length }}</span>
        </div>

        <div class="bg-white rounded-lg shadow overflow-hidden">
          <table class="min-w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Codigo</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Prefijo</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Duracion Est.</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="service in categoryServices" :key="service.id">
                <td class="px-4 py-3">{{ service.name }}</td>
                <td class="px-4 py-3 text-sm text-gray-500">{{ service.code }}</td>
                <td class="px-4 py-3 font-bold text-primary-600">{{ service.prefix }}</td>
                <td class="px-4 py-3">{{ service.estimated_duration }} min</td>
                <td class="px-4 py-3">
                  <span :class="service.is_active ? 'text-green-600' : 'text-red-600'">
                    {{ service.is_active ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <button @click="editService(service)" class="text-primary-600 hover:text-primary-800 mr-2">Editar</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Mensaje si no hay servicios -->
      <div v-if="services.length === 0" class="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        No hay servicios registrados. Haga clic en "Agregar Servicio" para crear uno.
      </div>
    </div>

    <!-- Tab: Recursos -->
    <div v-if="activeTab === 'recursos'">
      <AdminRecursoView />
    </div>

    <!-- Usuarios -->
    <div v-if="activeTab === 'users'" class="space-y-6">
      <div class="flex justify-between items-center">
        <h2 class="text-lg font-semibold">Usuarios del Sistema</h2>
        <button
          @click="showUserModal = true; editingUser = null; userForm = { full_name: '', role: 'capturista', is_active: true }"
          class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          + Agregar Usuario
        </button>
      </div>

      <div class="bg-white rounded-lg shadow overflow-hidden">
        <table class="min-w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="user in users.filter(u => u.role !== 'medico')" :key="user.id">
              <td class="px-4 py-3 font-medium">{{ user.username }}</td>
              <td class="px-4 py-3">{{ user.full_name || '-' }}</td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ user.email }}</td>
              <td class="px-4 py-3">
                <span :class="{
                  'bg-purple-100 text-purple-800': user.role === 'admin',
                  'bg-blue-100 text-blue-800': user.role === 'capturista',
                  'bg-green-100 text-green-800': user.role === 'medico',
                  'bg-gray-100 text-gray-800': user.role === 'display',
                  'bg-orange-100 text-orange-800': user.role === 'admin_habitaciones',
                  'bg-teal-100 text-teal-800': user.role === 'pan_recurso'
                }" class="px-2 py-1 text-xs rounded">
                  {{ getRolLabel(user.role) }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span :class="user.is_active ? 'text-green-600' : 'text-red-600'">
                  {{ user.is_active ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <button @click="editUser(user)" class="text-primary-600 hover:text-primary-800">
                  Editar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Configuracion -->
    <div v-if="activeTab === 'settings'" class="space-y-6">
      <div class="bg-white rounded-lg shadow p-6 max-w-2xl">
        <h2 class="text-lg font-semibold mb-6">Configuracion del Sistema</h2>

        <form @submit.prevent="saveSettings" class="space-y-6">
          <!-- Nombre del Hospital -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Hospital *
            </label>
            <input
              v-model="settingsForm.hospital_name"
              type="text"
              required
              class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              placeholder="Hospital General"
            >
          </div>

          <!-- Logo del Hospital -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Logo del Hospital
            </label>
            <div class="flex items-center space-x-4">
              <div class="flex-shrink-0">
                <div v-if="logoPreview" class="relative">
                  <img
                    :src="logoPreview"
                    alt="Logo preview"
                    class="h-20 w-20 object-contain border rounded bg-gray-50"
                  >
                  <button
                    type="button"
                    @click="removeLogo"
                    class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    X
                  </button>
                </div>
                <div v-else class="h-20 w-20 border-2 border-dashed border-gray-300 rounded flex items-center justify-center bg-gray-50">
                  <span class="text-gray-400 text-xs text-center">Sin logo</span>
                </div>
              </div>
              <div class="flex-1">
                <input
                  type="file"
                  @change="handleLogoChange"
                  accept="image/*"
                  class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                >
                <p class="mt-1 text-xs text-gray-500">PNG, JPG, GIF hasta 5MB</p>
              </div>
            </div>
          </div>

          <!-- Imagen de Fondo -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Imagen de Fondo (Pantalla Publica)
            </label>
            <div class="flex items-start space-x-4">
              <div class="flex-shrink-0">
                <div v-if="backgroundPreview" class="relative">
                  <img
                    :src="backgroundPreview"
                    alt="Background preview"
                    class="h-24 w-40 object-cover border rounded"
                  >
                  <button
                    type="button"
                    @click="removeBackground"
                    class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    X
                  </button>
                </div>
                <div v-else class="h-24 w-40 border-2 border-dashed border-gray-300 rounded flex items-center justify-center bg-gray-50">
                  <span class="text-gray-400 text-xs text-center">Sin fondo</span>
                </div>
              </div>
              <div class="flex-1">
                <input
                  type="file"
                  @change="handleBackgroundChange"
                  accept="image/*"
                  class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                >
                <p class="mt-1 text-xs text-gray-500">PNG, JPG hasta 5MB. Se usara como fondo en la pantalla publica.</p>
              </div>
            </div>
          </div>

          <!-- Boton Guardar -->
          <div class="pt-4 border-t border-gray-200">
            <button
              type="submit"
              :disabled="savingSettings"
              class="w-full py-2 px-4 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ savingSettings ? 'Guardando...' : 'Guardar Configuracion' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Doctor -->
    <div v-if="showDoctorModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold mb-4">{{ editingDoctor ? 'Editar' : 'Nuevo' }} Medico</h3>
        <form @submit.prevent="saveDoctor" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Nombre Completo *</label>
            <input v-model="doctorForm.full_name" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Especialidad *</label>
            <select v-model="doctorForm.specialty" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
              <option value="">Seleccionar especialidad</option>
              <option v-for="service in services" :key="service.id" :value="service.name">
                {{ service.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Email *</label>
            <input v-model="doctorForm.email" type="email" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="doctor@hospital.com">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Telefono</label>
            <input v-model="doctorForm.phone" type="tel" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="555-123-4567">
          </div>
          <div v-if="editingDoctor">
            <label class="block text-sm font-medium text-gray-700">Usuario de Acceso</label>
            <template v-if="editingDoctor.user_id">
              <input v-model="doctorForm.username" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md font-mono" placeholder="j.perez">
              <p class="text-xs text-gray-500 mt-1">Nombre de usuario para iniciar sesion</p>
            </template>
            <template v-else>
              <p class="mt-1 text-sm text-amber-600 bg-amber-50 p-2 rounded-md">
                Este medico no tiene usuario de acceso asociado (fue creado antes del sistema de usuarios automaticos)
              </p>
            </template>
          </div>
          <div v-if="!editingDoctor" class="bg-gray-50 rounded-md p-3 text-sm text-gray-600">
            <p><strong>Nota:</strong> Se generara automaticamente:</p>
            <ul class="list-disc list-inside mt-1">
              <li>Usuario: primera letra + apellido (ej: j.perez)</li>
              <li>Contrasena: medico123</li>
            </ul>
          </div>
          <div v-if="editingDoctor" class="pt-2 border-t border-gray-200 space-y-2">
            <button v-if="editingDoctor.user_id" type="button" @click="resetDoctorPassword" class="w-full py-2 px-4 bg-orange-500 text-white rounded-md hover:bg-orange-600">
              Restablecer Contrasena (medico123)
            </button>
            <button type="button" @click="deleteDoctor" class="w-full py-2 px-4 bg-red-500 text-white rounded-md hover:bg-red-600">
              Eliminar Medico
            </button>
          </div>
          <div class="flex space-x-2 pt-2">
            <button type="submit" class="flex-1 py-2 px-4 bg-primary-600 text-white rounded-md">Guardar</button>
            <button type="button" @click="showDoctorModal = false" class="flex-1 py-2 px-4 bg-gray-200 rounded-md">Cancelar</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Servicio -->
    <div v-if="showServiceModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold mb-4">{{ editingService ? 'Editar' : 'Nuevo' }} Servicio</h3>
        <form @submit.prevent="saveService" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Nombre *</label>
            <input v-model="serviceForm.name" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Codigo/Identificador</label>
            <input v-model="serviceForm.code" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Ej: 101, LAB-01 (opcional)">
            <p class="mt-1 text-xs text-gray-500">Si se deja vacio, se generara automaticamente del nombre</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Duracion Estimada (min)</label>
            <input type="number" v-model="serviceForm.estimated_duration" min="1" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
          </div>
                    <div>
            <label class="block text-sm font-medium text-gray-700">Categoria</label>
            <input v-model="serviceForm.categoria" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Ej: Consultas, Laboratorio">
          </div>
          <div v-if="editingService" class="pt-2 border-t border-gray-200">
            <button type="button" @click="deleteService" class="w-full py-2 px-4 bg-red-500 text-white rounded-md hover:bg-red-600">
              Eliminar Servicio
            </button>
          </div>
          <div class="flex space-x-2">
            <button type="submit" class="flex-1 py-2 px-4 bg-primary-600 text-white rounded-md">Guardar</button>
            <button type="button" @click="showServiceModal = false" class="flex-1 py-2 px-4 bg-gray-200 rounded-md">Cancelar</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Usuario -->
    <div v-if="showUserModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold mb-4">{{ editingUser ? 'Editar' : 'Nuevo' }} Usuario</h3>
        <form @submit.prevent="saveUser" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Nombre Completo *</label>
            <input v-model="userForm.full_name" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
          </div>
          <div v-if="editingUser">
            <label class="block text-sm font-medium text-gray-700">Username *</label>
            <input v-model="userForm.username" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md font-mono" placeholder="nombre.usuario">
            <p class="text-xs text-gray-500 mt-1">Nombre de usuario para iniciar sesion</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Rol *</label>
            <select v-model="userForm.role" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
              <option value="capturista">Capturista</option>
              <option value="admin">Administrador</option>
              <option value="admin_habitaciones">Admin Habitaciones</option>
              <option value="pan_recurso">Panel Recursos</option>
              <option value="display">Pantalla</option>
            </select>
          </div>
          <div v-if="editingUser" class="flex items-center space-x-2">
            <input type="checkbox" v-model="userForm.is_active" id="userActive" class="rounded">
            <label for="userActive" class="text-sm text-gray-700">Usuario Activo</label>
          </div>
          <div v-if="editingUser" class="pt-2 border-t border-gray-200 space-y-2">
            <button type="button" @click="resetUserPassword" class="w-full py-2 px-4 bg-orange-500 text-white rounded-md hover:bg-orange-600">
              Restablecer Contrasena ({{ getDefaultPassword(userForm.role) }})
            </button>
            <button type="button" @click="deleteUser" class="w-full py-2 px-4 bg-red-500 text-white rounded-md hover:bg-red-600">
              Eliminar Usuario
            </button>
          </div>
          <div v-if="!editingUser" class="bg-gray-50 rounded-md p-3 text-sm text-gray-600">
            <p><strong>Nota:</strong> Las credenciales se generaran automaticamente:</p>
            <ul class="list-disc list-inside mt-1">
              <li>Usuario: nombre normalizado</li>
              <li>Email: usuario@hospital.com</li>
              <li>Contrasena: admin123#, captura123#, display123</li>
            </ul>
          </div>
          <div class="flex space-x-2">
            <button type="submit" class="flex-1 py-2 px-4 bg-primary-600 text-white rounded-md">{{ editingUser ? 'Guardar' : 'Crear Usuario' }}</button>
            <button type="button" @click="showUserModal = false" class="flex-1 py-2 px-4 bg-gray-200 rounded-md">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '../services/api'
import { useSettingsStore } from '../stores/settings'
import AdminRecursoView from './AdminRecursoView.vue'

const settingsStore = useSettingsStore()

const tabs = [
  { id: 'dashboard', name: 'Dashboard' },
  { id: 'doctors', name: 'Medicos' },
  { id: 'services', name: 'Servicios' },
  { id: 'recursos', name: 'Recursos' },
  { id: 'users', name: 'Usuarios' },
  { id: 'settings', name: 'Configuracion' }
]

const activeTab = ref('dashboard')
const stats = ref({})
const allTurns = ref([])
const doctors = ref([])
const services = ref([])
const users = ref([])

const showDoctorModal = ref(false)
const showServiceModal = ref(false)
const showUserModal = ref(false)
const editingDoctor = ref(null)
const editingService = ref(null)
const editingUser = ref(null)

const doctorForm = ref({ full_name: '', specialty: '', email: '', phone: '', username: '' })
const serviceForm = ref({ name: '', code: '', estimated_duration: 15, tipo: 'servicio', categoria: '' })
const userForm = ref({ full_name: '', username: '', role: 'capturista', is_active: true })

// Agrupar servicios por categoria
const servicesByCategory = computed(() => {
  const grouped = {}
  services.value.forEach(service => {
    const cat = service.categoria || 'Sin categoria'
    if (!grouped[cat]) {
      grouped[cat] = []
    }
    grouped[cat].push(service)
  })
  // Ordenar categorias alfabeticamente, pero "Sin categoria" al final
  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    if (a === 'Sin categoria') return 1
    if (b === 'Sin categoria') return -1
    return a.localeCompare(b)
  })
  const result = {}
  sortedKeys.forEach(key => {
    result[key] = grouped[key]
  })
  return result
})

// Settings form
const settingsForm = ref({
  hospital_name: '',
  logo: null,
  background: null
})
const logoPreview = ref(null)
const backgroundPreview = ref(null)
const savingSettings = ref(false)

// Funcion para normalizar nombres a username
function normalizeToUsername(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '.')
}

onMounted(async () => {
  await loadData()
  await loadSettingsForm()
})

async function loadSettingsForm() {
  await settingsStore.loadSettings()
  settingsForm.value.hospital_name = settingsStore.hospitalName
  logoPreview.value = settingsStore.logoUrl
  backgroundPreview.value = settingsStore.backgroundUrl
}

function handleLogoChange(event) {
  const file = event.target.files[0]
  if (file) {
    settingsForm.value.logo = file
    logoPreview.value = URL.createObjectURL(file)
  }
}

function handleBackgroundChange(event) {
  const file = event.target.files[0]
  if (file) {
    settingsForm.value.background = file
    backgroundPreview.value = URL.createObjectURL(file)
  }
}

function removeLogo() {
  settingsForm.value.logo = null
  settingsForm.value.remove_logo = true
  logoPreview.value = null
}

function removeBackground() {
  settingsForm.value.background = null
  settingsForm.value.remove_background = true
  backgroundPreview.value = null
}

async function saveSettings() {
  if (!settingsForm.value.hospital_name.trim()) {
    alert('El nombre del hospital es requerido')
    return
  }

  savingSettings.value = true

  try {
    const formData = new FormData()
    formData.append('hospital_name', settingsForm.value.hospital_name)

    if (settingsForm.value.logo) {
      formData.append('logo', settingsForm.value.logo)
    }
    if (settingsForm.value.background) {
      formData.append('background', settingsForm.value.background)
    }
    if (settingsForm.value.remove_logo) {
      formData.append('remove_logo', 'true')
    }
    if (settingsForm.value.remove_background) {
      formData.append('remove_background', 'true')
    }

    const result = await settingsStore.updateSettings(formData)

    if (result.success) {
      settingsForm.value.logo = null
      settingsForm.value.background = null
      settingsForm.value.remove_logo = false
      settingsForm.value.remove_background = false
      logoPreview.value = settingsStore.logoUrl
      backgroundPreview.value = settingsStore.backgroundUrl
      alert('Configuracion guardada exitosamente')
    } else {
      alert(result.message || 'Error guardando configuracion')
    }
  } catch (err) {
    alert('Error guardando configuracion')
  } finally {
    savingSettings.value = false
  }
}

async function loadData() {
  const [statsRes, turnsRes, doctorsRes, servicesRes, usersRes] = await Promise.all([
    api.get('/turns/stats'),
    api.get('/turns?today=true'),
    api.get('/doctors?is_active=true'),
    api.get('/services?tipo=servicio'),
    api.get('/auth/users')
  ])

  stats.value = statsRes.data.data
  allTurns.value = turnsRes.data.data
  doctors.value = doctorsRes.data.data
  services.value = servicesRes.data.data
  users.value = usersRes.data.data
}

function openNewDoctorModal() {
  editingDoctor.value = null
  doctorForm.value = { full_name: '', specialty: '', email: '', phone: '', username: '' }
  showDoctorModal.value = true
}

function editDoctor(doctor) {
  editingDoctor.value = doctor
  doctorForm.value = { ...doctor }
  showDoctorModal.value = true
}

async function deleteDoctor() {
  if (!editingDoctor.value) return

  if (!confirm(`¿Esta seguro de eliminar al medico ${editingDoctor.value.full_name}?\n\nEsta accion desactivara al medico y su usuario asociado.`)) return

  try {
    await api.delete(`/doctors/${editingDoctor.value.id}`)
    alert('Medico eliminado exitosamente')
    showDoctorModal.value = false
    doctorForm.value = { full_name: '', specialty: '', email: '', phone: '', username: '' }
    editingDoctor.value = null
    await loadData()
  } catch (err) {
    alert(err.response?.data?.message || 'Error eliminando medico')
  }
}

function openNewServiceModal() {
  editingService.value = null
  serviceForm.value = {
    name: '',
    code: '',
    estimated_duration: 15,
    tipo: 'servicio',
    categoria: ''
  }
  showServiceModal.value = true
}

function editService(service) {
  editingService.value = service
  serviceForm.value = { ...service }
  showServiceModal.value = true
}

async function saveDoctor() {
  try {
    if (editingDoctor.value) {
      await api.put(`/doctors/${editingDoctor.value.id}`, doctorForm.value)
    } else {
      const response = await api.post('/doctors', doctorForm.value)
      // Mostrar credenciales generadas
      if (response.data.credentials) {
        const creds = response.data.credentials
        alert(`Medico creado exitosamente!\n\nCredenciales de acceso:\nUsuario: ${creds.username}\nContrasena: ${creds.password}\nEmail: ${creds.email}`)
      }
    }
    showDoctorModal.value = false
    doctorForm.value = { full_name: '', specialty: '', email: '', phone: '', username: '' }
    await loadData()
  } catch (err) {
    alert(err.response?.data?.message || 'Error guardando medico')
  }
}

async function resetDoctorPassword() {
  if (!editingDoctor.value) return

  if (!confirm('¿Restablecer la contrasena a medico123?')) return

  try {
    await api.post(`/doctors/${editingDoctor.value.id}/reset-password`)
    alert('Contrasena restablecida exitosamente a: medico123')
  } catch (err) {
    alert(err.response?.data?.message || 'Error restableciendo contrasena')
  }
}

async function saveService() {
  try {
    if (editingService.value) {
      await api.put(`/services/${editingService.value.id}`, serviceForm.value)
    } else {
      await api.post('/services', serviceForm.value)
    }
    showServiceModal.value = false
    editingService.value = null
    serviceForm.value = { name: '', code: '', estimated_duration: 15, tipo: 'servicio', categoria: '' }
    await loadData()
  } catch (err) {
    alert(err.response?.data?.message || 'Error guardando servicio')
  }
}

async function deleteService() {
  if (!editingService.value) return

  if (!confirm(`¿Esta seguro de eliminar el servicio "${editingService.value.name}"?\n\nEsta accion eliminara el registro permanentemente.`)) return

  try {
    await api.delete(`/services/${editingService.value.id}`)
    alert('Servicio eliminado exitosamente')
    showServiceModal.value = false
    editingService.value = null
    serviceForm.value = { name: '', code: '', estimated_duration: 15, tipo: 'servicio', categoria: '' }
    await loadData()
  } catch (err) {
    alert(err.response?.data?.message || 'Error eliminando servicio')
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

function formatTime(dateString) {
  return new Date(dateString).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

function editUser(user) {
  editingUser.value = user
  userForm.value = {
    full_name: user.full_name || '',
    username: user.username || '',
    role: user.role,
    is_active: user.is_active
  }
  showUserModal.value = true
}

async function saveUser() {
  try {
    if (editingUser.value) {
      // Actualizar usuario existente
      await api.put(`/auth/users/${editingUser.value.id}`, {
        full_name: userForm.value.full_name,
        username: userForm.value.username,
        role: userForm.value.role,
        is_active: userForm.value.is_active
      })
      alert('Usuario actualizado exitosamente')
    } else {
      // Crear nuevo usuario
      const username = normalizeToUsername(userForm.value.full_name)
      const email = `${username}@hospital.com`
      const password = getDefaultPassword(userForm.value.role)

      const userData = {
        username,
        email,
        password,
        full_name: userForm.value.full_name,
        role: userForm.value.role
      }

      await api.post('/auth/register', userData)
      alert(`Usuario creado exitosamente!\n\nCredenciales de acceso:\nUsuario: ${username}\nContrasena: ${password}\nEmail: ${email}`)
    }

    showUserModal.value = false
    editingUser.value = null
    userForm.value = { full_name: '', username: '', role: 'capturista', is_active: true }
    await loadData()
  } catch (err) {
    alert(err.response?.data?.message || 'Error guardando usuario')
  }
}

async function deleteUser() {
  if (!editingUser.value) return

  if (!confirm(`¿Esta seguro de eliminar al usuario ${editingUser.value.username}?\n\nEsta accion no se puede deshacer.`)) return

  try {
    await api.delete(`/auth/users/${editingUser.value.id}`)
    alert('Usuario eliminado exitosamente')
    showUserModal.value = false
    editingUser.value = null
    userForm.value = { full_name: '', username: '', role: 'capturista', is_active: true }
    await loadData()
  } catch (err) {
    alert(err.response?.data?.message || 'Error eliminando usuario')
  }
}

async function resetUserPassword() {
  if (!editingUser.value) return

  const password = getDefaultPassword(userForm.value.role)

  if (!confirm(`¿Restablecer la contrasena a ${password}?`)) return

  try {
    await api.post(`/auth/users/${editingUser.value.id}/reset-password`)
    alert(`Contrasena restablecida a: ${password}`)
  } catch (err) {
    alert(err.response?.data?.message || 'Error restableciendo contrasena')
  }
}

function getRolLabel(role) {
  const labels = {
    admin: 'Administrador',
    capturista: 'Capturista',
    medico: 'Medico',
    display: 'Pantalla',
    admin_habitaciones: 'Admin Habitaciones',
    pan_recurso: 'Panel Recursos'
  }
  return labels[role] || role
}

function getDefaultPassword(role) {
  const passwords = {
    admin: 'admin123#',
    capturista: 'captura123#',
    medico: 'medico123',
    display: 'display123',
    admin_habitaciones: 'habitacion123#',
    pan_recurso: 'panrecurso123'
  }
  return passwords[role] || 'password123'
}
</script>
