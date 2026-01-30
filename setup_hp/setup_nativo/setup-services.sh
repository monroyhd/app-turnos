#!/bin/bash
# =============================================================================
# setup-services.sh - Configurar servicios del sistema para App-Turnos
# =============================================================================
#
# Este script:
# - Configura Mosquitto MQTT
# - Configura Caddy como proxy reverso
# - Configura PM2 para el backend
# - Configura firewall (UFW)
# - Configura inicio automático con systemd
#
# Uso: sudo ./setup-services.sh [PROJECT_ROOT]
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../shared/common-functions.sh"

# Parámetros
PROJECT_ROOT="${1:-$(cd "$SCRIPT_DIR/../.." && pwd)}"

print_header "Configurando Servicios del Sistema"

print_info "Proyecto: $PROJECT_ROOT"

# =============================================================================
# Configurar Mosquitto
# =============================================================================

print_step "Configurando Mosquitto MQTT..."

# Crear directorio de configuración si no existe
mkdir -p /etc/mosquitto/conf.d

# Copiar configuración
MOSQUITTO_CONF="$SCRIPT_DIR/config/mosquitto.conf"
if [ -f "$MOSQUITTO_CONF" ]; then
    backup_file /etc/mosquitto/conf.d/app-turnos.conf
    cp "$MOSQUITTO_CONF" /etc/mosquitto/conf.d/app-turnos.conf
    print_success "Configuración de Mosquitto copiada"
else
    print_warning "Archivo mosquitto.conf no encontrado, creando configuración básica..."
    cat > /etc/mosquitto/conf.d/app-turnos.conf << EOF
# TCP solo localhost
listener 1883 127.0.0.1
protocol mqtt

# WebSocket (protegido por firewall)
listener 9001
protocol websockets

allow_anonymous true
EOF
    print_success "Configuración básica de Mosquitto creada"
fi

# Crear directorio de persistencia
mkdir -p /var/lib/mosquitto
chown mosquitto:mosquitto /var/lib/mosquitto

# Crear directorio de logs
mkdir -p /var/log/mosquitto
chown mosquitto:mosquitto /var/log/mosquitto

# Reiniciar servicio
systemctl restart mosquitto

if check_service mosquitto; then
    print_success "Mosquitto iniciado correctamente"
else
    print_error "Error iniciando Mosquitto"
    journalctl -u mosquitto -n 20 --no-pager
    exit 1
fi

# Verificar puertos
sleep 2
if nc -z localhost 1883 2>/dev/null; then
    print_success "Mosquitto escuchando en puerto 1883 (MQTT)"
else
    print_warning "Puerto 1883 no responde"
fi

if nc -z localhost 9001 2>/dev/null; then
    print_success "Mosquitto escuchando en puerto 9001 (WebSocket)"
else
    print_warning "Puerto 9001 no responde"
fi

# =============================================================================
# Configurar Caddy
# =============================================================================

print_step "Configurando Caddy..."

# Respaldar Caddyfile existente si existe
if [ -f /etc/caddy/Caddyfile ]; then
    BACKUP_NAME="/etc/caddy/Caddyfile.backup.$(date +%Y%m%d_%H%M%S)"
    cp /etc/caddy/Caddyfile "$BACKUP_NAME"
    print_info "Caddyfile existente respaldado en: $BACKUP_NAME"
fi

# Crear directorio si no existe
mkdir -p /etc/caddy

# Crear configuración de Caddy para App-Turnos
print_step "Creando configuración de Caddy para App-Turnos..."
cat > /etc/caddy/Caddyfile << EOF
# =============================================================================
# Caddyfile - Configuración de Caddy para App-Turnos (Instalación Nativa)
# =============================================================================

:80 {
    # Directorio raíz del frontend
    root * $PROJECT_ROOT/frontend/dist

    # Servir archivos estáticos
    file_server

    # Proxy reverso para API backend
    handle /api/* {
        reverse_proxy localhost:3000
    }

    # Proxy reverso para uploads/archivos subidos
    handle /uploads/* {
        reverse_proxy localhost:3000
    }

    # Proxy WebSocket para MQTT (permite conexión sin especificar IP/puerto)
    handle /mqtt-ws {
        reverse_proxy localhost:9001
    }

    # Manejo de SPA - redirigir rutas desconocidas a index.html
    handle {
        try_files {path} /index.html
    }

    # Logging
    log {
        output stdout
        format console
    }

    # Headers de seguridad básicos
    header {
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        X-XSS-Protection "1; mode=block"
        -Server
    }

    # Compresión
    encode gzip zstd

    # Cache para assets estáticos
    @static {
        path *.js *.css *.png *.jpg *.jpeg *.gif *.ico *.svg *.woff *.woff2
    }
    header @static Cache-Control "public, max-age=31536000"
}
EOF

print_success "Configuración de Caddy creada"

# Validar configuración
print_step "Validando configuración de Caddy..."
caddy validate --config /etc/caddy/Caddyfile

if [ $? -eq 0 ]; then
    print_success "Configuración de Caddy válida"
else
    print_error "Error en configuración de Caddy"
    exit 1
fi

# Reiniciar servicio
systemctl restart caddy

if check_service caddy; then
    print_success "Caddy iniciado correctamente"
else
    print_error "Error iniciando Caddy"
    journalctl -u caddy -n 20 --no-pager
    exit 1
fi

# =============================================================================
# Configurar PM2
# =============================================================================

print_step "Configurando PM2..."

BACKEND_DIR="$PROJECT_ROOT/backend"
PM2_CONFIG="$SCRIPT_DIR/config/ecosystem.config.js"

# Copiar configuración de PM2
if [ -f "$PM2_CONFIG" ]; then
    cp "$PM2_CONFIG" "$BACKEND_DIR/ecosystem.config.js"

    # Ajustar rutas
    sed -i "s|/apps-node/app-turnos|$PROJECT_ROOT|g" "$BACKEND_DIR/ecosystem.config.js"

    print_success "Configuración de PM2 copiada"
fi

# Crear directorios necesarios
mkdir -p "$BACKEND_DIR/logs"
mkdir -p "$BACKEND_DIR/public/uploads"

# Detener proceso existente si existe
pm2 delete app-turnos-backend 2>/dev/null || true

# Iniciar aplicación con PM2
cd "$BACKEND_DIR"

if [ -f "ecosystem.config.js" ]; then
    pm2 start ecosystem.config.js --env production
else
    pm2 start server.js --name app-turnos-backend --env production
fi

# Verificar que inició correctamente
sleep 3
if pm2 list | grep -q "app-turnos-backend"; then
    PM2_STATUS=$(pm2 jlist | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
    if [ "$PM2_STATUS" = "online" ]; then
        print_success "Backend iniciado con PM2"
    else
        print_warning "Backend en estado: $PM2_STATUS"
        pm2 logs app-turnos-backend --lines 20 --nostream
    fi
else
    print_error "Backend no pudo iniciar"
    pm2 logs app-turnos-backend --lines 30 --nostream
    exit 1
fi

# Guardar configuración de PM2
pm2 save

# Configurar inicio automático
print_step "Configurando inicio automático de PM2..."

# Obtener comando de startup
PM2_STARTUP=$(pm2 startup systemd -u root --hp /root 2>&1 | grep "sudo" | tail -1)

if [ -n "$PM2_STARTUP" ]; then
    eval "$PM2_STARTUP" 2>/dev/null || true
fi

# Alternativa: crear servicio systemd manualmente si pm2 startup falla
if ! systemctl is-enabled pm2-root 2>/dev/null; then
    print_info "Creando servicio systemd para PM2..."

    cat > /etc/systemd/system/pm2-root.service << EOF
[Unit]
Description=PM2 process manager
Documentation=https://pm2.keymetrics.io/
After=network.target

[Service]
Type=forking
User=root
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity
Environment=PATH=/usr/bin:/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin
Environment=PM2_HOME=/root/.pm2
PIDFile=/root/.pm2/pm2.pid
ExecStart=/usr/bin/pm2 resurrect
ExecReload=/usr/bin/pm2 reload all
ExecStop=/usr/bin/pm2 kill

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable pm2-root
fi

print_success "PM2 configurado para inicio automático"

# =============================================================================
# Configurar Firewall (UFW)
# =============================================================================

print_step "Configurando Firewall (UFW)..."

# Verificar si UFW está instalado
if check_command ufw; then
    # Configurar reglas
    ufw default deny incoming
    ufw default allow outgoing

    # SSH (importante: no bloquear)
    ufw allow 22/tcp comment 'SSH'

    # HTTP
    ufw allow 80/tcp comment 'HTTP - Caddy'

    # MQTT (opcional - solo si se necesita acceso externo)
    # ufw allow 1883/tcp comment 'MQTT'

    # MQTT WebSocket (opcional)
    # ufw allow 9001/tcp comment 'MQTT WebSocket'

    # Habilitar firewall
    echo "y" | ufw enable

    print_success "Firewall configurado"

    # Mostrar estado
    ufw status verbose
else
    print_warning "UFW no instalado, saltando configuración de firewall"
fi

# =============================================================================
# Verificar servicios
# =============================================================================

print_header "Verificación de Servicios"

echo ""
echo "Estado de servicios:"
echo ""

# PostgreSQL
echo -n "  PostgreSQL:  "
if check_service postgresql; then
    echo -e "${GREEN}activo${NC}"
else
    echo -e "${RED}inactivo${NC}"
fi

# Mosquitto
echo -n "  Mosquitto:   "
if check_service mosquitto; then
    echo -e "${GREEN}activo${NC}"
else
    echo -e "${RED}inactivo${NC}"
fi

# Caddy
echo -n "  Caddy:       "
if check_service caddy; then
    echo -e "${GREEN}activo${NC}"
else
    echo -e "${RED}inactivo${NC}"
fi

# PM2 Backend
echo -n "  Backend:     "
if pm2 list | grep -q "online"; then
    echo -e "${GREEN}activo${NC}"
else
    echo -e "${RED}inactivo${NC}"
fi

echo ""

# =============================================================================
# Verificar puertos
# =============================================================================

print_step "Verificando puertos..."

echo ""
echo "Puertos en uso:"
echo ""

# Puerto 80 (Caddy)
echo -n "  Puerto 80 (HTTP):     "
if nc -z localhost 80 2>/dev/null; then
    echo -e "${GREEN}abierto${NC}"
else
    echo -e "${RED}cerrado${NC}"
fi

# Puerto 3000 (API)
echo -n "  Puerto 3000 (API):    "
if nc -z localhost 3000 2>/dev/null; then
    echo -e "${GREEN}abierto${NC}"
else
    echo -e "${RED}cerrado${NC}"
fi

# Puerto 1883 (MQTT)
echo -n "  Puerto 1883 (MQTT):   "
if nc -z localhost 1883 2>/dev/null; then
    echo -e "${GREEN}abierto${NC}"
else
    echo -e "${RED}cerrado${NC}"
fi

# Puerto 9001 (MQTT WS)
echo -n "  Puerto 9001 (WS):     "
if nc -z localhost 9001 2>/dev/null; then
    echo -e "${GREEN}abierto${NC}"
else
    echo -e "${RED}cerrado${NC}"
fi

# Puerto 5432 (PostgreSQL)
echo -n "  Puerto 5432 (PG):     "
if nc -z localhost 5432 2>/dev/null; then
    echo -e "${GREEN}abierto${NC}"
else
    echo -e "${RED}cerrado${NC}"
fi

echo ""

print_success "Servicios configurados correctamente"
