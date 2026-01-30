#!/bin/bash
# =============================================================================
# install.sh - Script Principal de Instalación Docker App-Turnos
# =============================================================================
#
# Este script realiza una instalación completa del sistema de turnos
# hospitalarios usando Docker y Docker Compose.
#
# Requisitos:
#   - Ubuntu 22.04+ o Debian 12+
#   - Acceso root (sudo)
#   - Conexión a internet
#
# Uso:
#   git clone <REPO_URL> /apps-node/app-turnos
#   cd /apps-node/app-turnos/setup_hp/setup_docker
#   sudo chmod +x *.sh
#   sudo ./install.sh
#
# =============================================================================

set -e

# =============================================================================
# Variables
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SHARED_DIR="$SCRIPT_DIR/../shared"
LOG_FILE="$PROJECT_ROOT/setup_hp/install-docker.log"

# Cargar funciones comunes
source "$SHARED_DIR/common-functions.sh"

# =============================================================================
# Banner
# =============================================================================

clear
echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                                           ║${NC}"
echo -e "${BLUE}║   ${CYAN}App-Turnos - Sistema de Gestión de Turnos Hospitalarios${BLUE}                ║${NC}"
echo -e "${BLUE}║   ${YELLOW}Instalación con Docker${BLUE}                                                  ║${NC}"
echo -e "${BLUE}║                                                                           ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# =============================================================================
# Iniciar log
# =============================================================================

setup_log_file "$LOG_FILE"
log "Instalación Docker iniciada"

# =============================================================================
# Verificaciones previas
# =============================================================================

print_header "Verificaciones Previas"

# Verificar root
print_step "Verificando permisos de root..."
check_root
print_success "Ejecutando como root"

# Verificar sistema operativo
print_step "Verificando sistema operativo..."
check_os

# Verificar ruta del proyecto
print_step "Verificando ruta del proyecto..."
if [ -d "$PROJECT_ROOT/backend" ] && [ -d "$PROJECT_ROOT/frontend" ]; then
    print_success "Proyecto encontrado en: $PROJECT_ROOT"
else
    print_error "No se encontró el proyecto en: $PROJECT_ROOT"
    print_info "Asegúrese de haber clonado el repositorio correctamente"
    exit 1
fi

# Verificar conexión a internet
print_step "Verificando conexión a internet..."
if ping -c 1 google.com &> /dev/null; then
    print_success "Conexión a internet disponible"
else
    print_warning "No se detectó conexión a internet"
    print_info "Docker y las imágenes podrían no descargarse correctamente"
fi

# =============================================================================
# Resumen de instalación
# =============================================================================

echo ""
print_info "Se instalará lo siguiente:"
echo ""
echo "  - Docker Engine"
echo "  - Docker Compose"
echo ""
echo "  Contenedores:"
echo "    - PostgreSQL 15 (base de datos)"
echo "    - Mosquitto MQTT (mensajería)"
echo "    - API Backend (Node.js)"
echo "    - Frontend (Vue.js + nginx)"
echo "    - Caddy (proxy reverso)"
echo ""
echo "  Directorio del proyecto: $PROJECT_ROOT"
echo ""

# Confirmar instalación
read -p "¿Desea continuar con la instalación? (s/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    print_info "Instalación cancelada por el usuario"
    exit 0
fi

log "Usuario confirmó instalación"

# =============================================================================
# Paso 1: Instalar Docker
# =============================================================================

print_header "Paso 1/5: Instalando Docker"

chmod +x "$SCRIPT_DIR/install-docker.sh"
"$SCRIPT_DIR/install-docker.sh" 2>&1 | tee -a "$LOG_FILE"

log "Docker instalado"

# =============================================================================
# Paso 2: Generar credenciales
# =============================================================================

print_header "Paso 2/5: Generando Credenciales"

print_step "Generando contraseñas seguras..."

# Generar credenciales
DB_PASSWORD=$(generate_password 24)
JWT_SECRET=$(generate_jwt_secret)

# Crear archivo .env
ENV_FILE="$SCRIPT_DIR/.env"

cat > "$ENV_FILE" << EOF
# Variables de entorno para Docker Compose
# Generado automáticamente: $(date)

# Base de datos
DB_PASSWORD=$DB_PASSWORD
POSTGRES_PASSWORD=$DB_PASSWORD

# JWT
JWT_SECRET=$JWT_SECRET

# Hospital
HOSPITAL_ID=hospital-1
HOSPITAL_NAME=Hospital General
EOF

chmod 600 "$ENV_FILE"

print_success "Credenciales generadas y guardadas en $ENV_FILE"

log "Credenciales generadas"

# =============================================================================
# Paso 3: Construir imágenes Docker
# =============================================================================

print_header "Paso 3/5: Construyendo Imágenes Docker"

cd "$SCRIPT_DIR"

print_step "Construyendo imagen del backend..."
docker compose build api 2>&1 | tee -a "$LOG_FILE"
print_success "Imagen del backend construida"

print_step "Construyendo imagen del frontend..."
docker compose build frontend 2>&1 | tee -a "$LOG_FILE"
print_success "Imagen del frontend construida"

log "Imágenes Docker construidas"

# =============================================================================
# Paso 4: Iniciar servicios
# =============================================================================

print_header "Paso 4/5: Iniciando Servicios"

cd "$SCRIPT_DIR"

print_step "Iniciando contenedores..."
docker compose up -d 2>&1 | tee -a "$LOG_FILE"

print_success "Contenedores iniciados"

# Esperar a que PostgreSQL esté listo
print_step "Esperando a que PostgreSQL esté listo..."
RETRIES=30
COUNT=0
while [ $COUNT -lt $RETRIES ]; do
    if docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        print_success "PostgreSQL está listo"
        break
    fi
    COUNT=$((COUNT + 1))
    echo -n "."
    sleep 2
done

if [ $COUNT -eq $RETRIES ]; then
    print_error "Timeout esperando PostgreSQL"
    docker compose logs postgres
    exit 1
fi

# Esperar a que la API esté lista
print_step "Esperando a que la API esté lista..."
RETRIES=30
COUNT=0
while [ $COUNT -lt $RETRIES ]; do
    if docker compose exec -T api wget --no-verbose --tries=1 --spider http://localhost:3000/ > /dev/null 2>&1; then
        print_success "API está lista"
        break
    fi
    COUNT=$((COUNT + 1))
    echo -n "."
    sleep 2
done

if [ $COUNT -eq $RETRIES ]; then
    print_warning "API tardando en responder, continuando..."
fi

log "Servicios iniciados"

# =============================================================================
# Paso 4.5: Ejecutar migraciones y seeds
# =============================================================================

print_step "Ejecutando migraciones de base de datos..."

# Ejecutar migraciones dentro del contenedor
docker compose exec -T api sh -c "npm run migrate 2>/dev/null || npx knex migrate:latest" 2>&1 | tee -a "$LOG_FILE" || {
    print_warning "Advertencia ejecutando migraciones"
}

print_step "Ejecutando seeds..."
docker compose exec -T api sh -c "npm run seed 2>/dev/null || npx knex seed:run" 2>&1 | tee -a "$LOG_FILE" || {
    print_warning "Advertencia ejecutando seeds"
}

print_success "Migraciones y seeds ejecutados"

log "Migraciones y seeds completados"

# =============================================================================
# Paso 5: Verificar instalación
# =============================================================================

print_header "Paso 5/5: Verificando Instalación"

# Dar tiempo a que todo se estabilice
sleep 5

chmod +x "$SHARED_DIR/verify-installation.sh"
"$SHARED_DIR/verify-installation.sh" docker 2>&1 | tee -a "$LOG_FILE"

log "Verificación completada"

# =============================================================================
# Finalización
# =============================================================================

print_credentials

# Información adicional para Docker
echo ""
echo -e "${CYAN}Comandos útiles de Docker:${NC}"
echo ""
echo "  Ver logs:           docker compose logs -f"
echo "  Ver logs de API:    docker compose logs -f api"
echo "  Reiniciar todo:     docker compose restart"
echo "  Detener todo:       docker compose down"
echo "  Ver contenedores:   docker compose ps"
echo ""
echo "  Acceder a BD:       docker compose exec postgres psql -U postgres -d app_turnos"
echo "  Acceder a API:      docker compose exec api sh"
echo ""
echo "  Log de instalación: $LOG_FILE"
echo ""

# Guardar información de instalación
INSTALL_INFO="$PROJECT_ROOT/setup_hp/.install_info"
cat > "$INSTALL_INFO" << EOF
# Información de Instalación
# Fecha: $(date)
# Tipo: Docker

PROJECT_ROOT=$PROJECT_ROOT
INSTALL_TYPE=docker
INSTALL_DATE=$(date -Iseconds)
SERVER_IP=$(get_server_ip)

# Servicios
FRONTEND_URL=http://$(get_server_ip)
MQTT_PORT=1883
MQTT_WS_PORT=9001

# Contenedores
CONTAINERS=turnos-postgres,turnos-mosquitto,turnos-api,turnos-frontend,turnos-caddy

# Comandos útiles
# docker compose logs -f
# docker compose restart
# docker compose down
# docker compose ps
EOF
chmod 600 "$INSTALL_INFO"

# Guardar credenciales
CREDENTIALS_FILE="$PROJECT_ROOT/setup_hp/.db_credentials"
cat > "$CREDENTIALS_FILE" << EOF
# Credenciales de Base de Datos (Docker)
# Fecha: $(date)
DB_NAME=app_turnos
DB_USER=postgres
DB_PASSWORD=$DB_PASSWORD
DB_HOST=turnos-postgres
DB_PORT=5432

JWT_SECRET=$JWT_SECRET
EOF
chmod 600 "$CREDENTIALS_FILE"

log "Instalación completada exitosamente"

print_success "¡Instalación con Docker completada exitosamente!"
