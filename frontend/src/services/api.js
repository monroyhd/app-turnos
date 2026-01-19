import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

// Interceptor para manejar FormData correctamente
api.interceptors.request.use(config => {
  if (config.data instanceof FormData) {
    // Eliminar Content-Type para que Axios lo establezca automáticamente con el boundary correcto
    delete config.headers['Content-Type']
  }
  return config
})

// Interceptor para manejar errores
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Token expirado o invalido
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
