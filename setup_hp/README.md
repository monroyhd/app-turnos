# Scripts de Instalación - App-Turnos

Sistema de scripts automatizados para desplegar el **Sistema de Gestión de Turnos Hospitalarios** con mínima intervención del usuario.

## Requisitos Previos

### Sistema Operativo
- Ubuntu 22.04 LTS o superior
- Debian 12 o superior

### Requisitos de Hardware (mínimos)
- CPU: 2 cores
- RAM: 2 GB
- Disco: 20 GB disponibles

### Requisitos de Red
- Conexión a internet (para descargar paquetes)
- Puerto 80 disponible (HTTP)
- Puerto 1883 disponible (MQTT - opcional para acceso externo)
- Puerto 9001 disponible (WebSocket MQTT - opcional)

---

## Estructura de Archivos

```
setup_hp/
├── README.md                    # Este archivo
├── setup_nativo/                # Instalación nativa (sin Docker)
│   ├── install.sh              # Script principal
│   ├── install-dependencies.sh # Instalar Node, PostgreSQL, etc.
│   ├── setup-database.sh       # Configurar base de datos
│   ├── setup-services.sh       # Configurar servicios del sistema
│   └── config/
│       ├── Caddyfile           # Configuración del servidor web
│       ├── mosquitto.conf      # Configuración MQTT
│       ├── ecosystem.config.js # Configuración PM2
│       └── .env.production     # Variables de entorno
├── setup_docker/               # Instalación con Docker
│   ├── install.sh              # Script principal
│   ├── install-docker.sh       # Instalar Docker y Docker Compose
│   ├── docker-compose.yml      # Orquestación de contenedores
│   ├── Dockerfile.api          # Imagen del backend
│   ├── Dockerfile.frontend     # Imagen del frontend
│   └── config/
│       ├── Caddyfile           # Configuración Caddy para Docker
│       ├── mosquitto.conf      # Configuración Mosquitto
│       └── .env.docker         # Variables de entorno Docker
└── shared/
    ├── common-functions.sh     # Funciones compartidas
    └── verify-installation.sh  # Verificar instalación
```

---

## Métodos de Instalación

Existen dos métodos de instalación. **Elija solo uno**.

### Opción A: Instalación Nativa

Instalación directa en el servidor, sin contenedores. Recomendada para:
- Servidores dedicados
- Mayor control sobre los servicios
- Menor overhead de recursos

### Opción B: Instalación con Docker

Instalación usando contenedores Docker. Recomendada para:
- Entornos de desarrollo
- Despliegues rápidos
- Aislamiento de servicios
- Facilidad de actualización

---

## Guía de Instalación

### Paso 1: Clonar el Repositorio

```bash
# Clonar el repositorio
git clone <URL_DEL_REPOSITORIO> /apps-node/app-turnos

# Ir al directorio del proyecto
cd /apps-node/app-turnos
```

### Paso 2a: Instalación Nativa

```bash
# Ir al directorio de instalación nativa
cd setup_hp/setup_nativo

# Dar permisos de ejecución a los scripts
sudo chmod +x *.sh
sudo chmod +x ../shared/*.sh

# Ejecutar instalación
sudo ./install.sh
```

**El script realizará automáticamente:**
1. Verificación del sistema operativo
2. Instalación de Node.js 20 LTS
3. Instalación de PM2
4. Instalación de PostgreSQL 15
5. Instalación de Mosquitto MQTT
6. Instalación de Caddy
7. Configuración de la base de datos
8. Instalación de dependencias del proyecto
9. Construcción del frontend
10. Configuración de servicios
11. Verificación de la instalación

### Paso 2b: Instalación con Docker (Alternativa)

```bash
# Ir al directorio de instalación Docker
cd setup_hp/setup_docker

# Dar permisos de ejecución a los scripts
sudo chmod +x *.sh
sudo chmod +x ../shared/*.sh

# Ejecutar instalación
sudo ./install.sh
```

**El script realizará automáticamente:**
1. Verificación del sistema operativo
2. Instalación de Docker y Docker Compose
3. Generación de credenciales seguras
4. Construcción de imágenes Docker
5. Inicio de contenedores
6. Ejecución de migraciones
7. Verificación de la instalación

---

## Acceso al Sistema

Una vez completada la instalación:

| Campo | Valor |
|-------|-------|
| URL | `http://<IP_DEL_SERVIDOR>` |
| Usuario | `admin` |
| Contraseña | `admin123` |

> ⚠️ **IMPORTANTE**: Cambiar la contraseña del administrador después del primer login.

---

## Comandos Útiles

### Instalación Nativa

```bash
# Ver logs del backend
pm2 logs app-turnos-backend

# Reiniciar backend
pm2 restart app-turnos-backend

# Estado de PM2
pm2 status

# Estado de servicios
systemctl status postgresql
systemctl status mosquitto
systemctl status caddy

# Reiniciar servicios
sudo systemctl restart postgresql
sudo systemctl restart mosquitto
sudo systemctl restart caddy
```

### Instalación Docker

```bash
# Ver todos los logs
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f api
docker compose logs -f postgres

# Estado de contenedores
docker compose ps

# Reiniciar todos los servicios
docker compose restart

# Reiniciar un servicio específico
docker compose restart api

# Detener todos los servicios
docker compose down

# Iniciar servicios
docker compose up -d

# Acceder a la base de datos
docker compose exec postgres psql -U postgres -d app_turnos

# Acceder al contenedor de la API
docker compose exec api sh

# Ver uso de recursos
docker stats
```

---

## Verificación de la Instalación

Puede verificar el estado de la instalación en cualquier momento:

```bash
# Desde el directorio del proyecto
cd /apps-node/app-turnos/setup_hp

# Verificar instalación nativa
./shared/verify-installation.sh nativo

# Verificar instalación Docker
./shared/verify-installation.sh docker

# Detección automática
./shared/verify-installation.sh
```

---

## Configuración Adicional

### Cambiar Puerto HTTP

**Nativo:**
Editar `/etc/caddy/Caddyfile` y cambiar `:80` por el puerto deseado.

**Docker:**
Editar `setup_docker/docker-compose.yml` y cambiar `"80:80"` en el servicio caddy.

### Habilitar Acceso MQTT Externo

Por defecto, los puertos MQTT (1883, 9001) están expuestos. Si se configuró firewall:

```bash
# UFW (Nativo)
sudo ufw allow 1883/tcp
sudo ufw allow 9001/tcp
```

### Backup de Base de Datos

**Nativo:**
```bash
sudo -u postgres pg_dump app_turnos > backup_$(date +%Y%m%d).sql
```

**Docker:**
```bash
docker compose exec postgres pg_dump -U postgres app_turnos > backup_$(date +%Y%m%d).sql
```

### Restaurar Base de Datos

**Nativo:**
```bash
sudo -u postgres psql app_turnos < backup.sql
```

**Docker:**
```bash
cat backup.sql | docker compose exec -T postgres psql -U postgres app_turnos
```

---

## Solución de Problemas

### PostgreSQL no inicia

```bash
# Ver logs
journalctl -u postgresql -n 50

# Verificar que el puerto no esté en uso
netstat -tlnp | grep 5432
```

### Backend no responde

**Nativo:**
```bash
# Ver logs de PM2
pm2 logs app-turnos-backend --lines 100

# Reiniciar
pm2 restart app-turnos-backend
```

**Docker:**
```bash
# Ver logs
docker compose logs api --tail 100

# Reiniciar
docker compose restart api
```

### Mosquitto no acepta conexiones

```bash
# Verificar configuración
mosquitto -c /etc/mosquitto/conf.d/app-turnos.conf -v

# Ver logs
journalctl -u mosquitto -n 50
```

### Caddy muestra error 502

El backend no está respondiendo. Verificar:
1. Que el backend esté corriendo
2. Que el puerto 3000 esté accesible
3. Revisar logs del backend

### Docker: Contenedor en reinicio constante

```bash
# Ver logs del contenedor
docker compose logs <nombre_servicio>

# Inspeccionar contenedor
docker inspect turnos-<nombre_servicio>
```

---

## Archivos de Credenciales

Después de la instalación, las credenciales se guardan en:

- `setup_hp/.db_credentials` - Credenciales de base de datos
- `setup_hp/.install_info` - Información de la instalación
- `setup_hp/setup_docker/.env` - Variables de entorno Docker (solo Docker)

> ⚠️ Estos archivos tienen permisos restringidos (600). No compartir.

---

## Desinstalación

### Instalación Nativa

```bash
# Detener servicios
pm2 delete app-turnos-backend
sudo systemctl stop caddy mosquitto postgresql

# Eliminar base de datos (opcional)
sudo -u postgres dropdb app_turnos
sudo -u postgres dropuser app_turnos_user

# Eliminar archivos del proyecto
rm -rf /apps-node/app-turnos
```

### Instalación Docker

```bash
# Detener y eliminar contenedores
cd setup_hp/setup_docker
docker compose down

# Eliminar volúmenes (ELIMINA DATOS)
docker compose down -v

# Eliminar imágenes
docker rmi turnos-api turnos-frontend

# Eliminar archivos del proyecto
rm -rf /apps-node/app-turnos
```

---

## Soporte

Si encuentra problemas durante la instalación:

1. Revisar el archivo de log: `setup_hp/install-*.log`
2. Ejecutar verificación: `./shared/verify-installation.sh`
3. Consultar la documentación del proyecto

---

## Licencia

Este proyecto y sus scripts de instalación están bajo licencia [especificar licencia].
