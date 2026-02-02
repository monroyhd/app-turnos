#!/bin/bash
# =============================================================================
# reload.sh - Actualizar y reiniciar App-Turnos
# Uso: sudo ./reload.sh
# =============================================================================

set -e

# Obtener directorio del script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Cargar funciones comunes
source "$SCRIPT_DIR/setup_hp/shared/common-functions.sh"

# =============================================================================
# Funciones del Script
# =============================================================================

pull_changes() {
    print_step "Actualizando repositorio desde GitHub..."
    cd "$SCRIPT_DIR"

    if git pull origin main; then
        print_success "Repositorio actualizado"
    else
        print_error "Error al actualizar repositorio"
        exit 1
    fi
}

update_backend() {
    print_step "Instalando dependencias del backend..."
    cd "$SCRIPT_DIR/backend"

    if npm install --production; then
        print_success "Dependencias del backend instaladas"
    else
        print_error "Error instalando dependencias del backend"
        exit 1
    fi
}

run_migrations() {
    print_step "Ejecutando migraciones de base de datos..."
    cd "$SCRIPT_DIR/backend"

    if npx knex migrate:latest; then
        print_success "Migraciones ejecutadas correctamente"
    else
        print_error "Error ejecutando migraciones"
        exit 1
    fi
}

build_frontend() {
    print_step "Instalando dependencias y compilando frontend..."
    cd "$SCRIPT_DIR/frontend"

    if npm install; then
        print_success "Dependencias del frontend instaladas"
    else
        print_error "Error instalando dependencias del frontend"
        exit 1
    fi

    print_step "Compilando frontend..."
    if npm run build; then
        print_success "Frontend compilado exitosamente"
    else
        print_error "Error compilando frontend"
        exit 1
    fi
}

restart_backend() {
    print_step "Reiniciando backend con PM2..."

    if pm2 restart app-turnos-backend; then
        print_success "Backend reiniciado"
    else
        print_warning "No se pudo reiniciar con nombre, intentando con ID..."
        if pm2 restart 0; then
            print_success "Backend reiniciado"
        else
            print_error "Error reiniciando backend"
            exit 1
        fi
    fi
}

verify_services() {
    print_step "Verificando estado de servicios..."
    echo ""
    pm2 status
    echo ""

    # Esperar un momento y verificar que el backend responda
    sleep 2
    if wait_for_http "http://localhost:3000/api/health" 30; then
        print_success "Backend respondiendo correctamente"
    else
        print_warning "Backend puede tardar en responder, verificar manualmente"
    fi
}

# =============================================================================
# Ejecución Principal
# =============================================================================

print_header "RELOAD - App-Turnos"

print_info "Directorio del proyecto: $SCRIPT_DIR"
echo ""

# Ejecutar pasos
pull_changes
update_backend
run_migrations
build_frontend
restart_backend
verify_services

echo ""
print_success "Reload completado exitosamente"
echo ""
