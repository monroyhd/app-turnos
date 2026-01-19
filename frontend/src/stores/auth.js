import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || null)
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))

  const isAuthenticated = computed(() => !!token.value)

  async function login(username, password) {
    try {
      const response = await api.post('/auth/login', { username, password })

      if (response.data.success) {
        token.value = response.data.data.token
        user.value = response.data.data.user

        localStorage.setItem('token', token.value)
        localStorage.setItem('user', JSON.stringify(user.value))

        api.defaults.headers.common['Authorization'] = `Bearer ${token.value}`

        return { success: true }
      }

      return { success: false, message: response.data.message }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Error de conexion'
      }
    }
  }

  async function logout() {
    try {
      await api.post('/auth/logout')
    } catch (e) {
      // Ignorar errores de logout
    }

    token.value = null
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    delete api.defaults.headers.common['Authorization']
  }

  async function fetchCurrentUser() {
    if (!token.value) return

    try {
      const response = await api.get('/auth/me')
      if (response.data.success) {
        user.value = response.data.data
        localStorage.setItem('user', JSON.stringify(user.value))
      }
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        await logout()
      }
    }
  }

  // Inicializar header si hay token
  if (token.value) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
  }

  return {
    token,
    user,
    isAuthenticated,
    login,
    logout,
    fetchCurrentUser
  }
})
