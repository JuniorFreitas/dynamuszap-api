#!/bin/bash

# Script de Diagnóstico Rápido - DynamusZap API
echo "🔍 DIAGNÓSTICO DYNAMUSZAP API"
echo "================================"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[AVISO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERRO]${NC} $1"
}

# 1. Verificar status do container
echo ""
print_status "1. Status do Container:"
if docker compose ps | grep -q "dynamuszap-api.*Up"; then
    print_success "Container está rodando"
    CONTAINER_STATUS="UP"
else
    print_error "Container não está rodando"
    CONTAINER_STATUS="DOWN"
fi

# 2. Verificar saúde da API
echo ""
print_status "2. Saúde da API:"
if [ "$CONTAINER_STATUS" = "UP" ]; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3333/api/health)
    if [ "$HTTP_CODE" = "200" ]; then
        print_success "API respondendo (HTTP $HTTP_CODE)"
        API_STATUS="OK"
    else
        print_error "API não está respondendo (HTTP $HTTP_CODE)"
        API_STATUS="ERROR"
    fi
else
    print_error "Container não está rodando - não é possível testar API"
    API_STATUS="ERROR"
fi

# 3. Verificar recursos do container
echo ""
print_status "3. Recursos do Container:"
if [ "$CONTAINER_STATUS" = "UP" ]; then
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" dynamuszap-api
else
    print_error "Container não está rodando"
fi

# 4. Verificar arquivos de sessão
echo ""
print_status "4. Arquivos de Sessão:"
if [ -d "./tokens" ]; then
    SESSION_COUNT=$(find ./tokens -maxdepth 1 -type d ! -path ./tokens | wc -l)
    if [ "$SESSION_COUNT" -gt 0 ]; then
        print_success "$SESSION_COUNT sessão(ões) encontrada(s)"
        ls -la ./tokens/ | grep -v "^total\|^d.*\.$\|^d.*\.\.$"
    else
        print_warning "Nenhuma sessão encontrada"
    fi
else
    print_error "Diretório ./tokens não existe"
fi

# 5. Verificar logs recentes
echo ""
print_status "5. Logs Recentes (últimas 10 linhas):"
if [ "$CONTAINER_STATUS" = "UP" ]; then
    docker compose logs --tail=10 dynamuszap-api
else
    print_error "Container não está rodando"
fi

# 6. Verificar erros nos logs
echo ""
print_status "6. Verificação de Erros:"
if [ "$CONTAINER_STATUS" = "UP" ]; then
    ERROR_COUNT=$(docker compose logs dynamuszap-api 2>&1 | grep -i error | wc -l)
    if [ "$ERROR_COUNT" -gt 0 ]; then
        print_warning "$ERROR_COUNT erro(s) encontrado(s) nos logs"
        echo "Últimos erros:"
        docker compose logs dynamuszap-api 2>&1 | grep -i error | tail -5
    else
        print_success "Nenhum erro encontrado nos logs"
    fi
else
    print_error "Container não está rodando"
fi

# 7. Verificar conectividade
echo ""
print_status "7. Conectividade:"
if [ "$CONTAINER_STATUS" = "UP" ]; then
    # Testar Socket.IO
    SOCKETIO_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3333/socket.io/socket.io.js)
    if [ "$SOCKETIO_CODE" = "200" ]; then
        print_success "Socket.IO funcionando (HTTP $SOCKETIO_CODE)"
    else
        print_error "Socket.IO com problema (HTTP $SOCKETIO_CODE)"
    fi
    
    # Testar interface de sessões
    SESSIONS_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3333/sessions.html)
    if [ "$SESSIONS_CODE" = "200" ]; then
        print_success "Interface de sessões funcionando (HTTP $SESSIONS_CODE)"
    else
        print_error "Interface de sessões com problema (HTTP $SESSIONS_CODE)"
    fi
else
    print_error "Container não está rodando"
fi

# 8. Verificar espaço em disco
echo ""
print_status "8. Espaço em Disco:"
df -h . | tail -1 | awk '{
    if ($5+0 > 90) 
        printf "\033[0;31m[ERRO]\033[0m Espaço em disco crítico: %s usado\n", $5
    else if ($5+0 > 80) 
        printf "\033[1;33m[AVISO]\033[0m Espaço em disco alto: %s usado\n", $5
    else 
        printf "\033[0;32m[OK]\033[0m Espaço em disco: %s usado\n", $5
}'

# 9. Verificar arquivo .env
echo ""
print_status "9. Configuração (.env):"
if [ -f ".env" ]; then
    print_success "Arquivo .env existe"
    
    # Verificar configurações importantes
    if grep -q "DOCKER_ENV=true" .env; then
        print_success "DOCKER_ENV configurado corretamente"
    else
        print_warning "DOCKER_ENV não está configurado como 'true'"
    fi
    
    if grep -q "PORT=3333" .env; then
        print_success "PORT configurado corretamente"
    else
        print_warning "PORT pode não estar configurado corretamente"
    fi
else
    print_error "Arquivo .env não encontrado"
fi

# 10. Resumo e recomendações
echo ""
echo "================================"
print_status "RESUMO DO DIAGNÓSTICO:"

if [ "$CONTAINER_STATUS" = "UP" ] && [ "$API_STATUS" = "OK" ]; then
    print_success "✅ Sistema funcionando normalmente"
    echo ""
    echo "🌐 Acesse:"
    echo "   • API: http://localhost:3333"
    echo "   • Documentação: http://localhost:3333/api-docs"
    echo "   • Gerenciador de Sessões: http://localhost:3333/sessions.html"
else
    print_error "❌ Sistema com problemas"
    echo ""
    echo "🔧 Soluções recomendadas:"
    
    if [ "$CONTAINER_STATUS" = "DOWN" ]; then
        echo "   1. Iniciar container: docker compose up -d"
        echo "   2. Ou usar o script: ./start-docker.sh"
    fi
    
    if [ "$API_STATUS" = "ERROR" ] && [ "$CONTAINER_STATUS" = "UP" ]; then
        echo "   1. Verificar logs: docker compose logs -f dynamuszap-api"
        echo "   2. Reiniciar container: docker compose restart"
    fi
fi

echo ""
echo "📚 Para mais ajuda, consulte:"
echo "   • WHATSAPP_TROUBLESHOOTING.md"
echo "   • SESSIONS_MANAGER.md"
echo "   • docker compose logs -f dynamuszap-api"

echo ""
echo "================================" 