#!/bin/bash
# =============================================================================
# install-docker.sh - Instalar Docker y Docker Compose
# =============================================================================
#
# Este script instala Docker Engine y Docker Compose plugin
# en sistemas Ubuntu/Debian.
#
# Uso: sudo ./install-docker.sh
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../shared/common-functions.sh"

print_header "Instalando Docker"

# =============================================================================
# Verificar si Docker ya está instalado
# =============================================================================

print_step "Verificando instalación existente de Docker..."

if check_command docker; then
    DOCKER_VERSION=$(docker --version)
    print_info "Docker ya está instalado: $DOCKER_VERSION"

    # Verificar si está corriendo
    if check_service docker; then
        print_success "Docker está activo"
    else
        print_info "Iniciando Docker..."
        systemctl start docker
    fi

    # Verificar Docker Compose
    if docker compose version &> /dev/null; then
        print_success "Docker Compose: $(docker compose version --short)"
        print_info "Docker ya instalado y funcionando. Saltando instalación."
        exit 0
    fi
fi

# =============================================================================
# Desinstalar versiones antiguas
# =============================================================================

print_step "Removiendo versiones antiguas de Docker (si existen)..."

apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

print_success "Versiones antiguas removidas"

# =============================================================================
# Instalar dependencias
# =============================================================================

print_step "Instalando dependencias..."

apt-get update
apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

print_success "Dependencias instaladas"

# =============================================================================
# Agregar repositorio oficial de Docker
# =============================================================================

print_step "Configurando repositorio de Docker..."

# Crear directorio para keyrings
install -m 0755 -d /etc/apt/keyrings

# Descargar clave GPG
curl -fsSL https://download.docker.com/linux/$(. /etc/os-release && echo "$ID")/gpg | \
    gpg --dearmor -o /etc/apt/keyrings/docker.gpg

chmod a+r /etc/apt/keyrings/docker.gpg

# Agregar repositorio
echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$(. /etc/os-release && echo "$ID") \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null

print_success "Repositorio configurado"

# =============================================================================
# Instalar Docker Engine
# =============================================================================

print_step "Instalando Docker Engine..."

apt-get update
apt-get install -y \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin

print_success "Docker Engine instalado"

# =============================================================================
# Configurar Docker
# =============================================================================

print_step "Configurando Docker..."

# Habilitar e iniciar servicio
systemctl enable docker
systemctl start docker

# Esperar a que Docker esté listo
sleep 3

if check_service docker; then
    print_success "Docker está activo"
else
    print_error "Docker no pudo iniciar"
    journalctl -u docker -n 20 --no-pager
    exit 1
fi

# =============================================================================
# Configurar límites de Docker (opcional)
# =============================================================================

print_step "Configurando límites de Docker..."

# Crear o actualizar daemon.json
mkdir -p /etc/docker

cat > /etc/docker/daemon.json << EOF
{
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "10m",
        "max-file": "3"
    },
    "storage-driver": "overlay2"
}
EOF

# Reiniciar Docker para aplicar configuración
systemctl restart docker

print_success "Configuración de Docker aplicada"

# =============================================================================
# Verificar instalación
# =============================================================================

print_step "Verificando instalación..."

# Docker
if docker --version; then
    print_success "Docker instalado correctamente"
else
    print_error "Error verificando Docker"
    exit 1
fi

# Docker Compose
if docker compose version; then
    print_success "Docker Compose instalado correctamente"
else
    print_error "Error verificando Docker Compose"
    exit 1
fi

# Test: ejecutar contenedor hello-world
print_step "Ejecutando prueba de Docker..."

if docker run --rm hello-world > /dev/null 2>&1; then
    print_success "Docker funciona correctamente"
else
    print_warning "La prueba de Docker falló, pero puede funcionar igualmente"
fi

# =============================================================================
# Resumen
# =============================================================================

print_header "Docker Instalado"

echo "  Docker:         $(docker --version | cut -d' ' -f3 | tr -d ',')"
echo "  Docker Compose: $(docker compose version --short)"
echo ""

print_success "Docker y Docker Compose instalados correctamente"
