#!/bin/bash
# =============================================================================
# install.sh - Script Principal de Instalación Nativa App-Turnos
# =============================================================================
#
# Este script realiza una instalación completa del sistema de turnos
# hospitalarios en un servidor Ubuntu/Debian.
#
# Requisitos:
#   - Ubuntu 22.04+ o Debian 12+
#   - Acceso root (sudo)
#   - Conexión a internet
#
# Uso:
#   git clone <REPO_URL> /apps-node/app-turnos
#   cd /apps-node/app-turnos/setup_hp/setup_nativo
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
LOG_FILE="$PROJECT_ROOT/setup_hp/install-nativo.log"

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
echo -e "${BLUE}║   ${YELLOW}Instalación Nativa${BLUE}                                                     ║${NC}"
echo -e "${BLUE}║                                                                           ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# =============================================================================
# Iniciar log
# =============================================================================

setup_log_file "$LOG_FILE"
log "Instalación iniciada"

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
    print_info "Algunos paquetes podrían no instalarse correctamente"
fi

# =============================================================================
# Resumen de instalación
# =============================================================================

echo ""
print_info "Se instalará lo siguiente:"
echo ""
echo "  - Node.js 20 LTS"
echo "  - PM2 (gestor de procesos)"
echo "  - PostgreSQL 15 (base de datos)"
echo "  - Mosquitto MQTT (mensajería)"
echo "  - Caddy (servidor web/proxy)"
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
# Paso 1: Instalar dependencias del sistema
# =============================================================================

print_header "Paso 1/6: Instalando Dependencias del Sistema"

chmod +x "$SCRIPT_DIR/install-dependencies.sh"
"$SCRIPT_DIR/install-dependencies.sh" 2>&1 | tee -a "$LOG_FILE"

log "Dependencias instaladas"

# =============================================================================
# Paso 2: Configurar base de datos
# =============================================================================

print_header "Paso 2/6: Configurando Base de Datos"

# Generar contraseña segura
DB_PASSWORD=$(generate_password 24)

chmod +x "$SCRIPT_DIR/setup-database.sh"
"$SCRIPT_DIR/setup-database.sh" "$PROJECT_ROOT" "$DB_PASSWORD" 2>&1 | tee -a "$LOG_FILE"

log "Base de datos configurada"

# =============================================================================
# Paso 3: Instalar dependencias del frontend
# =============================================================================

print_header "Paso 3/6: Instalando Dependencias del Frontend"

FRONTEND_DIR="$PROJECT_ROOT/frontend"

print_step "Instalando dependencias npm del frontend..."
cd "$FRONTEND_DIR"

if [ -f "package.json" ]; then
    # Usar --unsafe-perm para evitar problemas al ejecutar como root
    npm install --unsafe-perm 2>&1 | tee -a "$LOG_FILE" || {
        print_warning "npm install con --unsafe-perm falló, intentando sin..."
        npm install 2>&1 | tee -a "$LOG_FILE" || {
            print_error "Error instalando dependencias del frontend"
            exit 1
        }
    }
    print_success "Dependencias del frontend instaladas"
else
    print_error "package.json no encontrado en $FRONTEND_DIR"
    exit 1
fi

log "Dependencias del frontend instaladas"

# =============================================================================
# Paso 4: Construir frontend
# =============================================================================

print_header "Paso 4/6: Construyendo Frontend"

print_step "Ejecutando build del frontend..."
cd "$FRONTEND_DIR"

# Configurar API URL para producción si es necesario
if [ -f ".env.production" ]; then
    print_info "Usando .env.production existente"
elif [ -f ".env.example" ]; then
    cp .env.example .env.production
    print_info "Creado .env.production desde .env.example"
fi

# Ejecutar build
npm run build 2>&1 | tee -a "$LOG_FILE"

# Verificar que se creó el directorio dist
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    print_success "Frontend construido correctamente"
else
    print_error "Error construyendo frontend - dist/index.html no encontrado"
    exit 1
fi

log "Frontend construido"

# =============================================================================
# Paso 5: Configurar servicios
# =============================================================================

print_header "Paso 5/6: Configurando Servicios"

chmod +x "$SCRIPT_DIR/setup-services.sh"
"$SCRIPT_DIR/setup-services.sh" "$PROJECT_ROOT" 2>&1 | tee -a "$LOG_FILE"

log "Servicios configurados"

# =============================================================================
# Paso 6: Verificar instalación
# =============================================================================

print_header "Paso 6/6: Verificando Instalación"

# Esperar a que los servicios estén listos
print_step "Esperando a que los servicios estén listos..."
sleep 5

chmod +x "$SHARED_DIR/verify-installation.sh"
"$SHARED_DIR/verify-installation.sh" nativo 2>&1 | tee -a "$LOG_FILE"

log "Verificación completada"

# =============================================================================
# Finalización
# =============================================================================

print_credentials

# Información adicional
echo ""
echo -e "${CYAN}Información adicional:${NC}"
echo ""
echo "  Logs del backend:    pm2 logs app-turnos-backend"
echo "  Reiniciar backend:   pm2 restart app-turnos-backend"
echo "  Estado de PM2:       pm2 status"
echo ""
echo "  Log de instalación:  $LOG_FILE"
echo ""

# Guardar información de instalación
INSTALL_INFO="$PROJECT_ROOT/setup_hp/.install_info"
cat > "$INSTALL_INFO" << EOF
# Información de Instalación
# Fecha: $(date)
# Tipo: Nativo

PROJECT_ROOT=$PROJECT_ROOT
INSTALL_TYPE=nativo
INSTALL_DATE=$(date -Iseconds)
SERVER_IP=$(get_server_ip)

# Servicios
BACKEND_PORT=3000
FRONTEND_URL=http://$(get_server_ip)
MQTT_PORT=1883
MQTT_WS_PORT=9001
DB_PORT=5432

# Comandos útiles
# pm2 logs app-turnos-backend
# pm2 restart app-turnos-backend
# systemctl status caddy
# systemctl status mosquitto
# systemctl status postgresql
EOF
chmod 600 "$INSTALL_INFO"

log "Instalación completada exitosamente"

print_success "¡Instalación completada exitosamente!"
