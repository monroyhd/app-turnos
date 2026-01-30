#!/bin/bash
# Fix: PostgreSQL Enum user_role para Servidor Nuevo
# Este script resuelve el error: "type user_role does not exist"
#
# Uso: sudo ./fix-enum-servidor-nuevo.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}=== Fix: PostgreSQL Enum para Servidor Nuevo ===${NC}"

# Verificar que estamos en el directorio correcto
if [ ! -f "/apps-node/app-turnos/backend/database/migrations/001_initial_schema.js" ]; then
    echo -e "${RED}Error: No se encuentra el proyecto en /apps-node/app-turnos${NC}"
    exit 1
fi

cd /apps-node/app-turnos

# Paso 1: Actualizar código
echo -e "\n${YELLOW}[1/4] Actualizando código desde repositorio...${NC}"
git fetch origin
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" != "$REMOTE" ]; then
    echo "Código desactualizado, ejecutando git pull..."
    git pull origin main
    echo -e "${GREEN}✓ Código actualizado${NC}"
else
    echo -e "${GREEN}✓ Código ya está actualizado${NC}"
fi

# Verificar que el fix existe
if ! grep -q "CREATE TYPE user_role" /apps-node/app-turnos/backend/database/migrations/001_initial_schema.js; then
    echo -e "${RED}Error: El fix del enum no está en el código. Contactar soporte.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Fix de enum verificado en código${NC}"

# Paso 2: Verificar si la BD existe y tiene el problema
echo -e "\n${YELLOW}[2/4] Verificando estado de la base de datos...${NC}"
DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='app_turnos'" 2>/dev/null || echo "0")

if [ "$DB_EXISTS" = "1" ]; then
    echo "Base de datos existe, verificando enum..."
    ENUM_EXISTS=$(sudo -u postgres psql -d app_turnos -tAc "SELECT 1 FROM pg_type WHERE typname='user_role'" 2>/dev/null || echo "0")

    if [ "$ENUM_EXISTS" = "1" ]; then
        echo -e "${GREEN}✓ Enum user_role ya existe, no se requiere fix${NC}"
        echo -e "\nPuede verificar con:"
        echo "  sudo -u postgres psql -d app_turnos -c \"SELECT enumlabel FROM pg_enum WHERE enumtypid = 'user_role'::regtype;\""
        exit 0
    else
        echo -e "${YELLOW}Enum no existe. Se necesita reinstalar la BD.${NC}"
        echo ""
        read -p "¿Eliminar BD y reinstalar? (s/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Ss]$ ]]; then
            echo "Eliminando base de datos..."
            sudo -u postgres psql -c "DROP DATABASE IF EXISTS app_turnos;"
            sudo -u postgres psql -c "DROP USER IF EXISTS app_turnos_user;"
            echo -e "${GREEN}✓ BD eliminada${NC}"
        else
            echo -e "${YELLOW}Operación cancelada. Ejecute manualmente:${NC}"
            echo "  sudo -u postgres psql -c \"DROP DATABASE IF EXISTS app_turnos;\""
            echo "  sudo -u postgres psql -c \"DROP USER IF EXISTS app_turnos_user;\""
            exit 1
        fi
    fi
else
    echo -e "${GREEN}✓ Base de datos no existe (instalación limpia)${NC}"
fi

# Paso 3: Ejecutar instalación
echo -e "\n${YELLOW}[3/4] ¿Ejecutar instalación completa?${NC}"
read -p "(s/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    cd /apps-node/app-turnos/setup_hp/setup_nativo
    echo "Ejecutando install.sh..."
    ./install.sh
else
    echo -e "${YELLOW}Ejecute manualmente:${NC}"
    echo "  cd /apps-node/app-turnos/setup_hp/setup_nativo"
    echo "  sudo ./install.sh"
fi

# Paso 4: Verificación
echo -e "\n${YELLOW}[4/4] Verificación...${NC}"
sleep 2
if sudo -u postgres psql -d app_turnos -tAc "SELECT 1 FROM pg_type WHERE typname='user_role'" 2>/dev/null | grep -q 1; then
    echo -e "${GREEN}✓ Enum user_role creado correctamente${NC}"
    echo ""
    echo "Valores del enum:"
    sudo -u postgres psql -d app_turnos -c "SELECT enumlabel FROM pg_enum WHERE enumtypid = 'user_role'::regtype ORDER BY enumsortorder;"
else
    echo -e "${RED}✗ Verificación falló. Revisar logs de instalación.${NC}"
fi
