#!/bin/bash
# =============================================================================
# install-dependencies.sh - Instalar dependencias del sistema para App-Turnos
# =============================================================================
#
# Este script instala:
# - Node.js 20 LTS (desde NodeSource)
# - PM2 (gestor de procesos Node.js)
# - PostgreSQL 15
# - Mosquitto MQTT Broker
# - Caddy Web Server
# - Herramientas de desarrollo
#
# Uso: sudo ./install-dependencies.sh
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../shared/common-functions.sh"

print_header "Instalando Dependencias del Sistema"

# =============================================================================
# Actualizar sistema
# =============================================================================

print_step "Actualizando sistema..."
apt-get update
apt-get upgrade -y
print_success "Sistema actualizado"

# =============================================================================
# Instalar dependencias básicas
# =============================================================================

print_step "Instalando dependencias básicas..."
apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    ca-certificates \
    gnupg \
    lsb-release \
    software-properties-common \
    apt-transport-https \
    netcat-openbsd \
    openssl \
    ufw

print_success "Dependencias básicas instaladas"

# =============================================================================
# Instalar Node.js 20 LTS
# =============================================================================

print_step "Instalando Node.js 20 LTS..."

if check_command node; then
    NODE_VERSION=$(node --version)
    print_info "Node.js ya instalado: $NODE_VERSION"
else
    # Agregar repositorio NodeSource
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -

    # Instalar Node.js
    apt-get install -y nodejs

    print_success "Node.js instalado: $(node --version)"
fi

# Verificar npm
if check_command npm; then
    print_success "NPM instalado: $(npm --version)"
else
    print_error "NPM no encontrado"
    exit 1
fi

# =============================================================================
# Instalar PM2
# =============================================================================

print_step "Instalando PM2..."

if check_command pm2; then
    print_info "PM2 ya instalado: $(pm2 --version)"
else
    npm install -g pm2
    print_success "PM2 instalado: $(pm2 --version)"
fi

# =============================================================================
# Instalar PostgreSQL 15
# =============================================================================

print_step "Instalando PostgreSQL 15..."

if check_command psql; then
    PG_VERSION=$(psql --version)
    print_info "PostgreSQL ya instalado: $PG_VERSION"
else
    # Agregar repositorio PostgreSQL
    sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'

    # Agregar clave GPG
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -

    # Actualizar e instalar
    apt-get update
    apt-get install -y postgresql-15 postgresql-contrib-15

    print_success "PostgreSQL instalado"
fi

# Habilitar e iniciar servicio
systemctl enable postgresql
systemctl start postgresql

if check_service postgresql; then
    print_success "PostgreSQL servicio activo"
else
    print_error "PostgreSQL servicio no pudo iniciar"
    exit 1
fi

# =============================================================================
# Instalar Mosquitto MQTT
# =============================================================================

print_step "Instalando Mosquitto MQTT..."

if check_command mosquitto; then
    print_info "Mosquitto ya instalado"
else
    apt-get install -y mosquitto mosquitto-clients
    print_success "Mosquitto instalado"
fi

# Habilitar servicio (no iniciar aún, se configurará después)
systemctl enable mosquitto

print_success "Mosquitto habilitado"

# =============================================================================
# Instalar Caddy
# =============================================================================

print_step "Instalando Caddy..."

if check_command caddy; then
    CADDY_VERSION=$(caddy version)
    print_info "Caddy ya instalado: $CADDY_VERSION"
else
    # Agregar repositorio Caddy
    apt-get install -y debian-keyring debian-archive-keyring

    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | \
        gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg

    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | \
        tee /etc/apt/sources.list.d/caddy-stable.list

    apt-get update
    apt-get install -y caddy

    print_success "Caddy instalado: $(caddy version)"
fi

# Habilitar servicio (no iniciar aún, se configurará después)
systemctl enable caddy

print_success "Caddy habilitado"

# =============================================================================
# Resumen
# =============================================================================

print_header "Dependencias Instaladas"

echo "  Node.js:     $(node --version)"
echo "  NPM:         $(npm --version)"
echo "  PM2:         $(pm2 --version)"
echo "  PostgreSQL:  $(psql --version | head -1)"
echo "  Mosquitto:   $(mosquitto -h 2>&1 | head -1 || echo 'instalado')"
echo "  Caddy:       $(caddy version)"

print_success "Todas las dependencias instaladas correctamente"
