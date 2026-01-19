import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/api'

export const useSettingsStore = defineStore('settings', () => {
  const hospitalName = ref('Hospital General')
  const logoPath = ref(null)
  const backgroundPath = ref(null)
  const isLoaded = ref(false)

  const logoUrl = computed(() => {
    if (!logoPath.value) return null
    return logoPath.value
  })

  const backgroundUrl = computed(() => {
    if (!backgroundPath.value) return null
    return backgroundPath.value
  })

  async function loadSettings() {
    try {
      const response = await api.get('/settings')

      if (response.data.success) {
        const data = response.data.data
        hospitalName.value = data.hospital_name || 'Hospital General'
        logoPath.value = data.logo_path
        backgroundPath.value = data.background_path
        isLoaded.value = true
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      hospitalName.value = 'Hospital General'
      logoPath.value = null
      backgroundPath.value = null
    }
  }

  async function updateSettings(formData) {
    try {
      const response = await api.put('/settings', formData)

      if (response.data.success) {
        const data = response.data.data
        hospitalName.value = data.hospital_name || 'Hospital General'
        logoPath.value = data.logo_path
        backgroundPath.value = data.background_path
        return { success: true }
      }

      return { success: false, message: response.data.message }
    } catch (error) {
      console.error('Error updating settings:', error)
      return {
        success: false,
        message: error.response?.data?.message || 'Error actualizando configuracion'
      }
    }
  }

  return {
    hospitalName,
    logoPath,
    backgroundPath,
    logoUrl,
    backgroundUrl,
    isLoaded,
    loadSettings,
    updateSettings
  }
})
