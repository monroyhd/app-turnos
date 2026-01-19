<template>
  <div id="app" class="min-h-screen bg-gray-100">
    <nav v-if="authStore.isAuthenticated && !isPublicDisplay" class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4">
        <div class="flex justify-between h-16">
          <div class="flex items-center space-x-3">
            <img
              v-if="settingsStore.logoUrl"
              :src="settingsStore.logoUrl"
              alt="Logo"
              class="h-10 w-auto object-contain"
            >
            <span class="text-xl font-bold text-primary-600">{{ settingsStore.hospitalName }}</span>
          </div>
          <div class="flex items-center space-x-4">
            <span class="text-gray-600">{{ authStore.user?.full_name }}</span>
            <span class="px-2 py-1 text-xs rounded bg-primary-100 text-primary-800">
              {{ authStore.user?.role }}
            </span>
            <button
              @click="logout"
              class="px-3 py-1 text-sm text-red-600 hover:text-red-800"
            >
              Cerrar sesion
            </button>
          </div>
        </div>
      </div>
    </nav>
    <main>
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { useSettingsStore } from './stores/settings'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()

onMounted(async () => {
  await settingsStore.loadSettings()
})

const isPublicDisplay = computed(() => route.path === '/display')

const logout = async () => {
  await authStore.logout()
  router.push('/login')
}
</script>
