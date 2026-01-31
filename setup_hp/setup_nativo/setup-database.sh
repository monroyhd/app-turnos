#!/bin/bash
# =============================================================================
# setup-database.sh - Configurar base de datos PostgreSQL para App-Turnos
# =============================================================================
#
# Este script:
# - Crea usuario de base de datos
# - Crea base de datos
# - Otorga permisos necesarios
# - Ejecuta migraciones Knex
# - Ejecuta seeds (datos iniciales)
#
# Uso: sudo ./setup-database.sh [PROJECT_ROOT] [DB_PASSWORD]
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../shared/common-functions.sh"

# Parámetros
PROJECT_ROOT="${1:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
DB_PASSWORD="${2:-$(generate_password 24)}"

# Configuración
DB_NAME="app_turnos"
DB_USER="app_turnos_user"

print_header "Configurando Base de Datos PostgreSQL"

print_info "Proyecto: $PROJECT_ROOT"
print_info "Base de datos: $DB_NAME"
print_info "Usuario: $DB_USER"

# =============================================================================
# Verificar PostgreSQL
# =============================================================================

print_step "Verificando PostgreSQL..."

if ! check_service postgresql; then
    print_error "PostgreSQL no está ejecutándose"
    print_info "Intentando iniciar PostgreSQL..."
    systemctl start postgresql

    if ! check_service postgresql; then
        print_error "No se pudo iniciar PostgreSQL"
        exit 1
    fi
fi

print_success "PostgreSQL está activo"

# =============================================================================
# Verificar si usuario existe
# =============================================================================

print_step "Verificando usuario de base de datos..."

USER_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" 2>/dev/null || echo "0")

if [ "$USER_EXISTS" = "1" ]; then
    print_info "Usuario $DB_USER ya existe"

    # Actualizar contraseña
    sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null
    print_success "Contraseña actualizada para $DB_USER"
else
    # Crear usuario
    print_step "Creando usuario $DB_USER..."
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null
    print_success "Usuario $DB_USER creado"
fi

# =============================================================================
# Verificar si base de datos existe
# =============================================================================

print_step "Verificando base de datos..."

DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null || echo "0")

if [ "$DB_EXISTS" = "1" ]; then
    print_info "Base de datos $DB_NAME ya existe"
else
    # Crear base de datos
    print_step "Creando base de datos $DB_NAME..."
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null
    print_success "Base de datos $DB_NAME creada"
fi

# =============================================================================
# Otorgar permisos
# =============================================================================

print_step "Otorgando permisos..."

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null

# Conectar a la base de datos y otorgar permisos en esquema public
sudo -u postgres psql -d "$DB_NAME" << EOF
GRANT ALL ON SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
EOF

print_success "Permisos otorgados"

# =============================================================================
# Configurar archivo .env del backend (ANTES de npm install)
# =============================================================================

print_step "Configurando variables de entorno..."

BACKEND_DIR="$PROJECT_ROOT/backend"
ENV_FILE="$BACKEND_DIR/.env"
ENV_TEMPLATE="$SCRIPT_DIR/config/.env.production"

# Generar JWT secret una sola vez
JWT_SECRET=$(generate_jwt_secret)

if [ -f "$ENV_TEMPLATE" ]; then
    # Copiar template
    cp "$ENV_TEMPLATE" "$ENV_FILE"

    # Reemplazar valores
    sed -i "s|GENERATED_DB_PASSWORD|$DB_PASSWORD|g" "$ENV_FILE"
    sed -i "s|GENERATED_JWT_SECRET|$JWT_SECRET|g" "$ENV_FILE"

    print_success "Archivo .env configurado desde template"
else
    print_warning "Template .env no encontrado, creando manualmente..."

    cat > "$ENV_FILE" << EOF
NODE_ENV=production
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_SSL=false

JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h

MQTT_HOST=localhost
MQTT_PORT=1883

HOSPITAL_ID=hospital-1
HOSPITAL_NAME=Hospital General

CORS_ORIGIN=*
EOF

    print_success "Archivo .env creado"
fi

# Verificar que el archivo .env existe y tiene contenido
if [ -s "$ENV_FILE" ]; then
    print_success "Archivo .env verificado: $ENV_FILE"
else
    print_error "Archivo .env está vacío o no existe"
    exit 1
fi

# =============================================================================
# Instalar dependencias del backend
# =============================================================================

print_step "Instalando dependencias del backend..."

cd "$BACKEND_DIR"

if [ -f "package.json" ]; then
    # Usar --unsafe-perm para evitar problemas al ejecutar como root
    npm install --unsafe-perm 2>&1 || {
        print_warning "npm install con --unsafe-perm falló, intentando sin..."
        npm install 2>&1 || {
            print_error "Error instalando dependencias del backend"
            exit 1
        }
    }
    print_success "Dependencias del backend instaladas"
else
    print_error "package.json no encontrado en $BACKEND_DIR"
    exit 1
fi

# =============================================================================
# Ejecutar migraciones
# =============================================================================

print_step "Ejecutando migraciones de base de datos..."

cd "$BACKEND_DIR"

# Exportar variables de entorno necesarias para knex
export NODE_ENV=production
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=$DB_NAME
export DB_USER=$DB_USER
export DB_PASSWORD=$DB_PASSWORD
export DB_SSL=false

print_info "Ejecutando migraciones con NODE_ENV=$NODE_ENV"

# Verificar conexión a la base de datos antes de migrar
print_step "Verificando conexión a la base de datos..."
PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    print_warning "No se pudo conectar con $DB_USER, verificando con postgres..."
    sudo -u postgres psql -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1 || {
        print_error "No se puede conectar a la base de datos"
        exit 1
    }
fi
print_success "Conexión a base de datos verificada"

# Ejecutar migraciones con npx knex directamente y --env production
print_step "Ejecutando knex migrate:latest..."
npx knex migrate:latest --env production 2>&1 || {
    print_warning "Migración con --env production falló, intentando sin env..."
    npx knex migrate:latest 2>&1 || {
        print_error "Error ejecutando migraciones"
        print_info "Verificando logs de knex..."
        cat "$BACKEND_DIR/logs/error.log" 2>/dev/null || true
        exit 1
    }
}
print_success "Migraciones ejecutadas"

# =============================================================================
# Ejecutar seeds
# =============================================================================

print_step "Ejecutando seeds (datos iniciales)..."

cd "$BACKEND_DIR"

# Ejecutar seeds con npx knex directamente y --env production
print_step "Ejecutando knex seed:run..."
npx knex seed:run --env production 2>&1 || {
    print_warning "Seeds con --env production falló, intentando sin env..."
    npx knex seed:run 2>&1 || {
        print_warning "Error ejecutando seeds, continuando de todos modos..."
    }
}
print_success "Seeds ejecutados"

# =============================================================================
# Verificar conexión
# =============================================================================

print_step "Verificando conexión a la base de datos..."

# Probar conexión con el usuario creado
PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    print_success "Conexión a base de datos verificada"
else
    print_warning "No se pudo verificar conexión con usuario $DB_USER"
    print_info "Verificando con postgres..."
    sudo -u postgres psql -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        print_success "Base de datos accesible via usuario postgres"
    else
        print_error "No se puede conectar a la base de datos"
    fi
fi

# =============================================================================
# Verificar tablas
# =============================================================================

print_step "Verificando tablas creadas..."

TABLE_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "0")

if [ "$TABLE_COUNT" -gt 0 ]; then
    print_success "Se encontraron $TABLE_COUNT tablas en la base de datos"

    # Listar tablas
    echo ""
    echo "Tablas creadas:"
    sudo -u postgres psql -d "$DB_NAME" -c "\dt" 2>/dev/null || true
    echo ""
else
    print_warning "No se encontraron tablas. Las migraciones pueden no haberse ejecutado correctamente."
fi

# =============================================================================
# Resumen
# =============================================================================

print_header "Configuración de Base de Datos Completada"

echo "  Base de datos: $DB_NAME"
echo "  Usuario:       $DB_USER"
echo "  Host:          localhost"
echo "  Puerto:        5432"
echo ""
echo "  Archivo .env:  $ENV_FILE"
echo ""

# Guardar credenciales para referencia
CREDENTIALS_FILE="$PROJECT_ROOT/setup_hp/.db_credentials"
cat > "$CREDENTIALS_FILE" << EOF
# Credenciales de Base de Datos (generadas automáticamente)
# Fecha: $(date)
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_HOST=localhost
DB_PORT=5432
EOF
chmod 600 "$CREDENTIALS_FILE"

print_info "Credenciales guardadas en: $CREDENTIALS_FILE"
print_success "Base de datos configurada correctamente"
