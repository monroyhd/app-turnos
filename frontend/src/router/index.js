import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true }
  },
  {
    path: '/display',
    name: 'PublicDisplay',
    component: () => import('../views/PublicDisplayView.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    redirect: () => {
      const authStore = useAuthStore()
      if (!authStore.isAuthenticated) return '/login'

      switch (authStore.user?.role) {
        case 'admin': return '/admin'
        case 'admin_recurso': return '/admin-recurso'
        case 'capturista': return '/capturista'
        case 'medico': return '/doctor'
        default: return '/login'
      }
    }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('../views/AdminView.vue'),
    meta: { roles: ['admin'] }
  },
  {
    path: '/admin-recurso',
    name: 'AdminRecurso',
    component: () => import('../views/AdminRecursoView.vue'),
    meta: { roles: ['admin', 'admin_recurso'] }
  },
  {
    path: '/capturista',
    name: 'Capturista',
    component: () => import('../views/CapturistaView.vue'),
    meta: { roles: ['admin', 'capturista'] }
  },
  {
    path: '/doctor',
    name: 'Doctor',
    component: () => import('../views/DoctorView.vue'),
    meta: { roles: ['admin', 'medico'] }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  // Rutas publicas
  if (to.meta.public) {
    return next()
  }

  // Verificar autenticacion
  if (!authStore.isAuthenticated) {
    return next('/login')
  }

  // Verificar roles
  if (to.meta.roles && !to.meta.roles.includes(authStore.user?.role)) {
    return next('/')
  }

  next()
})

export default router
