#!/bin/bash
# =============================================================================
# common-functions.sh - Funciones compartidas para scripts de instalación
# App-Turnos - Sistema de Gestión de Turnos Hospitalarios
# =============================================================================

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# =============================================================================
# Funciones de Output
# =============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}=============================================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}=============================================================================${NC}"
    echo ""
}

print_step() {
    echo -e "${CYAN}[PASO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[ADVERTENCIA]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# =============================================================================
# Funciones de Verificación
# =============================================================================

check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "Este script debe ejecutarse como root (sudo)"
        exit 1
    fi
}

check_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID

        case $OS in
            ubuntu|debian)
                print_success "Sistema operativo detectado: $PRETTY_NAME"
                ;;
            *)
                print_warning "Sistema operativo no probado: $PRETTY_NAME"
                print_info "Este script está diseñado para Ubuntu 22.04+ o Debian 12+"
                read -p "¿Desea continuar de todos modos? (s/n): " -n 1 -r
                echo
                if [[ ! $REPLY =~ ^[Ss]$ ]]; then
                    exit 1
                fi
                ;;
        esac
    else
        print_error "No se puede detectar el sistema operativo"
        exit 1
    fi
}

check_command() {
    if command -v "$1" &> /dev/null; then
        return 0
    else
        return 1
    fi
}

check_service() {
    if systemctl is-active --quiet "$1" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# =============================================================================
# Funciones de Generación
# =============================================================================

generate_password() {
    local length=${1:-32}
    openssl rand -base64 $length | tr -dc 'a-zA-Z0-9' | head -c $length
}

generate_jwt_secret() {
    openssl rand -base64 64 | tr -dc 'a-zA-Z0-9' | head -c 64
}

# =============================================================================
# Funciones de Detección de Rutas
# =============================================================================

get_project_root() {
    # Obtiene la ruta raíz del proyecto desde la ubicación del script
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[1]}")" && pwd)"
    # Subir dos niveles desde setup_nativo o setup_docker
    echo "$(cd "$script_dir/../.." && pwd)"
}

get_script_dir() {
    echo "$(cd "$(dirname "${BASH_SOURCE[1]}")" && pwd)"
}

# =============================================================================
# Funciones de Red
# =============================================================================

get_server_ip() {
    # Obtiene la IP principal del servidor
    hostname -I | awk '{print $1}'
}

wait_for_port() {
    local host=$1
    local port=$2
    local timeout=${3:-30}
    local count=0

    print_info "Esperando que $host:$port esté disponible..."

    while ! nc -z "$host" "$port" 2>/dev/null; do
        sleep 1
        count=$((count + 1))
        if [ $count -ge $timeout ]; then
            print_error "Timeout esperando $host:$port"
            return 1
        fi
    done

    print_success "$host:$port está disponible"
    return 0
}

wait_for_http() {
    local url=$1
    local timeout=${2:-60}
    local count=0

    print_info "Esperando respuesta HTTP de $url..."

    while ! curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200\|301\|302"; do
        sleep 2
        count=$((count + 2))
        if [ $count -ge $timeout ]; then
            print_error "Timeout esperando respuesta de $url"
            return 1
        fi
    done

    print_success "$url responde correctamente"
    return 0
}

# =============================================================================
# Funciones de Archivo
# =============================================================================

backup_file() {
    local file=$1
    if [ -f "$file" ]; then
        local backup="${file}.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$file" "$backup"
        print_info "Backup creado: $backup"
    fi
}

create_dir_if_not_exists() {
    local dir=$1
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        print_success "Directorio creado: $dir"
    fi
}

# =============================================================================
# Funciones de Entorno
# =============================================================================

load_env_file() {
    local env_file=$1
    if [ -f "$env_file" ]; then
        export $(cat "$env_file" | grep -v '^#' | xargs)
        print_success "Variables de entorno cargadas desde $env_file"
    else
        print_warning "Archivo de entorno no encontrado: $env_file"
    fi
}

replace_in_file() {
    local file=$1
    local search=$2
    local replace=$3

    if [ -f "$file" ]; then
        sed -i "s|$search|$replace|g" "$file"
    fi
}

# =============================================================================
# Funciones de Instalación
# =============================================================================

install_package() {
    local package=$1
    print_step "Instalando $package..."

    if apt-get install -y "$package" > /dev/null 2>&1; then
        print_success "$package instalado"
        return 0
    else
        print_error "Error instalando $package"
        return 1
    fi
}

# =============================================================================
# Funciones de Logs
# =============================================================================

setup_log_file() {
    local log_file=$1
    LOG_FILE=$log_file

    # Crear directorio si no existe
    mkdir -p "$(dirname "$log_file")"

    # Iniciar log
    echo "=== Instalación iniciada: $(date) ===" >> "$log_file"
}

log() {
    local message=$1
    if [ -n "$LOG_FILE" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] $message" >> "$LOG_FILE"
    fi
}

# =============================================================================
# Funciones de Credenciales
# =============================================================================

print_credentials() {
    local ip=$(get_server_ip)

    echo ""
    echo -e "${GREEN}=============================================================================${NC}"
    echo -e "${GREEN}  INSTALACIÓN COMPLETADA EXITOSAMENTE${NC}"
    echo -e "${GREEN}=============================================================================${NC}"
    echo ""
    echo -e "${CYAN}URL de acceso:${NC}"
    echo -e "  http://$ip"
    echo ""
    echo -e "${CYAN}Credenciales de administrador:${NC}"
    echo -e "  Usuario: ${YELLOW}admin${NC}"
    echo -e "  Password: ${YELLOW}admin123${NC}"
    echo ""
    echo -e "${RED}¡IMPORTANTE!${NC} Cambiar la contraseña después del primer login"
    echo ""
    echo -e "${GREEN}=============================================================================${NC}"
}

# =============================================================================
# Exportar funciones para uso en subshells
# =============================================================================

export -f print_header print_step print_success print_warning print_error print_info
export -f check_root check_os check_command check_service
export -f generate_password generate_jwt_secret
export -f get_project_root get_script_dir get_server_ip
export -f wait_for_port wait_for_http
export -f backup_file create_dir_if_not_exists
export -f load_env_file replace_in_file
export -f install_package setup_log_file log print_credentials
