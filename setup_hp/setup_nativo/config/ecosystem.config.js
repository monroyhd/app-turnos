// =============================================================================
// ecosystem.config.js - Configuración PM2 para App-Turnos
// =============================================================================
//
// Este archivo configura PM2 para gestionar el proceso del backend Node.js
// PM2 proporciona:
// - Auto-reinicio en caso de fallo
// - Gestión de logs
// - Monitoreo de recursos
// - Inicio automático con el sistema
//
// Uso:
//   pm2 start ecosystem.config.js
//   pm2 save
//   pm2 startup
//
// =============================================================================

module.exports = {
  apps: [
    {
      // Nombre del proceso (visible en pm2 list)
      name: 'app-turnos-backend',

      // Directorio de trabajo
      cwd: '/apps-node/app-turnos/backend',

      // Script principal
      script: 'server.js',

      // Número de instancias (1 para desarrollo, 'max' para cluster)
      instances: 1,

      // Modo de ejecución ('fork' o 'cluster')
      exec_mode: 'fork',

      // Auto-reinicio habilitado
      autorestart: true,

      // Observar cambios en archivos (false en producción)
      watch: false,

      // Patrones a ignorar si watch está activo
      ignore_watch: [
        'node_modules',
        'logs',
        'public/uploads',
        '*.log'
      ],

      // Uso máximo de memoria antes de reiniciar
      max_memory_restart: '500M',

      // Reintentos máximos en 15 minutos
      max_restarts: 10,
      min_uptime: '10s',

      // Esperar antes de considerar que la app inició correctamente
      wait_ready: true,
      listen_timeout: 10000,

      // Variables de entorno para producción
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },

      // Variables de entorno para desarrollo
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000
      },

      // Configuración de logs
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/apps-node/app-turnos/backend/logs/pm2-error.log',
      out_file: '/apps-node/app-turnos/backend/logs/pm2-out.log',
      combine_logs: true,
      merge_logs: true,

      // Rotación de logs
      log_type: 'json',

      // Señal de shutdown
      kill_timeout: 5000,
      shutdown_with_message: true,

      // Política de reinicio
      restart_delay: 1000,
      exp_backoff_restart_delay: 100
    }
  ],

  // Configuración de deploy (opcional para CI/CD)
  deploy: {
    production: {
      user: 'root',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'git@github.com:usuario/app-turnos.git',
      path: '/apps-node/app-turnos',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production'
    }
  }
};
