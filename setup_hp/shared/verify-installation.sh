#!/bin/bash
# =============================================================================
# verify-installation.sh - Verificar instalación de App-Turnos
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common-functions.sh"

# Modo de verificación (nativo o docker)
MODE=${1:-"auto"}

print_header "Verificando Instalación App-Turnos"

# Contadores
TESTS_PASSED=0
TESTS_FAILED=0

# =============================================================================
# Función de test
# =============================================================================

run_test() {
    local name=$1
    local command=$2

    echo -n "  $name: "

    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}OK${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}FALLO${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# =============================================================================
# Detectar modo de instalación
# =============================================================================

detect_mode() {
    if [ "$MODE" = "auto" ]; then
        if docker ps 2>/dev/null | grep -q "turnos"; then
            MODE="docker"
        else
            MODE="nativo"
        fi
    fi
    print_info "Modo de verificación: $MODE"
}

# =============================================================================
# Verificaciones para instalación nativa
# =============================================================================

verify_native() {
    print_step "Verificando servicios del sistema..."

    # PostgreSQL
    run_test "PostgreSQL servicio" "systemctl is-active postgresql"
    run_test "PostgreSQL conexión" "pg_isready -h localhost"

    # Mosquitto
    run_test "Mosquitto servicio" "systemctl is-active mosquitto"
    run_test "Mosquitto MQTT" "timeout 2 mosquitto_pub -h localhost -t test -m ping"

    # Caddy
    run_test "Caddy servicio" "systemctl is-active caddy"

    # PM2 / Backend
    run_test "PM2 proceso" "pm2 list | grep -q app-turnos"

    # Node.js
    run_test "Node.js instalado" "command -v node"
    run_test "NPM instalado" "command -v npm"
}

# =============================================================================
# Verificaciones para instalación Docker
# =============================================================================

verify_docker() {
    print_step "Verificando contenedores Docker..."

    # Docker
    run_test "Docker servicio" "systemctl is-active docker"

    # Contenedores
    run_test "Contenedor PostgreSQL" "docker ps | grep -q turnos-postgres"
    run_test "Contenedor Mosquitto" "docker ps | grep -q turnos-mosquitto"
    run_test "Contenedor API" "docker ps | grep -q turnos-api"
    run_test "Contenedor Frontend" "docker ps | grep -q turnos-frontend"
    run_test "Contenedor Caddy" "docker ps | grep -q turnos-caddy"

    # Health checks
    run_test "PostgreSQL healthy" "docker inspect turnos-postgres --format='{{.State.Health.Status}}' | grep -q healthy"
}

# =============================================================================
# Verificaciones de conectividad
# =============================================================================

verify_connectivity() {
    print_step "Verificando conectividad de servicios..."

    # API Backend
    run_test "API responde" "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ | grep -qE '200|404'"

    # Frontend via Caddy
    run_test "Frontend HTTP" "curl -s -o /dev/null -w '%{http_code}' http://localhost/ | grep -qE '200|301|302'"

    # MQTT WebSocket
    run_test "MQTT WebSocket puerto" "nc -z localhost 9001"

    # MQTT TCP
    run_test "MQTT TCP puerto" "nc -z localhost 1883"
}

# =============================================================================
# Verificaciones de API
# =============================================================================

verify_api() {
    print_step "Verificando endpoints de API..."

    # Health check si existe
    run_test "API /api/health" "curl -s http://localhost:3000/api/health 2>/dev/null | grep -qiE 'ok|healthy|status' || curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/health | grep -qE '200|404'"

    # Login endpoint
    run_test "API /api/auth/login" "curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{}' | grep -qE '200|400|401|422'"
}

# =============================================================================
# Verificación de base de datos
# =============================================================================

verify_database() {
    print_step "Verificando base de datos..."

    if [ "$MODE" = "docker" ]; then
        # Docker: verificar dentro del contenedor
        run_test "BD app_turnos existe" "docker exec turnos-postgres psql -U postgres -lqt | grep -q app_turnos"
        run_test "Tablas creadas" "docker exec turnos-postgres psql -U postgres -d app_turnos -c '\\dt' | grep -qE 'users|turns|services'"
    else
        # Nativo: verificar directamente
        run_test "BD app_turnos existe" "sudo -u postgres psql -lqt | grep -q app_turnos"
        run_test "Tablas creadas" "sudo -u postgres psql -d app_turnos -c '\\dt' | grep -qE 'users|turns|services'"
    fi
}

# =============================================================================
# Verificación de puertos
# =============================================================================

verify_ports() {
    print_step "Verificando puertos abiertos..."

    run_test "Puerto 80 (HTTP)" "nc -z localhost 80"
    run_test "Puerto 1883 (MQTT)" "nc -z localhost 1883"
    run_test "Puerto 9001 (MQTT WS)" "nc -z localhost 9001"
    run_test "Puerto 3000 (API)" "nc -z localhost 3000"
}

# =============================================================================
# Verificación de archivos
# =============================================================================

verify_files() {
    local project_root="${PROJECT_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"

    print_step "Verificando archivos del proyecto..."

    run_test "Backend server.js" "test -f $project_root/backend/server.js"
    run_test "Frontend dist" "test -d $project_root/frontend/dist"
    run_test "Frontend index.html" "test -f $project_root/frontend/dist/index.html"
}

# =============================================================================
# Resumen
# =============================================================================

print_summary() {
    echo ""
    print_header "Resumen de Verificación"

    local total=$((TESTS_PASSED + TESTS_FAILED))

    echo -e "  Tests ejecutados: $total"
    echo -e "  ${GREEN}Exitosos: $TESTS_PASSED${NC}"
    echo -e "  ${RED}Fallidos: $TESTS_FAILED${NC}"
    echo ""

    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}¡Todas las verificaciones pasaron exitosamente!${NC}"
        return 0
    else
        echo -e "${YELLOW}Algunas verificaciones fallaron. Revise los servicios indicados.${NC}"
        return 1
    fi
}

# =============================================================================
# Mostrar información de acceso
# =============================================================================

print_access_info() {
    local ip=$(get_server_ip)

    echo ""
    echo -e "${CYAN}============================================${NC}"
    echo -e "${CYAN}  Información de Acceso${NC}"
    echo -e "${CYAN}============================================${NC}"
    echo ""
    echo -e "  URL:      ${GREEN}http://$ip${NC}"
    echo -e "  Usuario:  ${YELLOW}admin${NC}"
    echo -e "  Password: ${YELLOW}admin123${NC}"
    echo ""
    echo -e "  ${RED}¡Cambiar contraseña después del primer login!${NC}"
    echo ""
}

# =============================================================================
# Main
# =============================================================================

main() {
    detect_mode

    if [ "$MODE" = "docker" ]; then
        verify_docker
    else
        verify_native
    fi

    verify_connectivity
    verify_api
    verify_database
    verify_ports
    verify_files

    print_summary
    local result=$?

    if [ $result -eq 0 ]; then
        print_access_info
    fi

    exit $result
}

# Ejecutar
main "$@"
