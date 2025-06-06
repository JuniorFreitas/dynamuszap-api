#!/bin/bash

# Script de Teste de Sessão - DynamusZap API
echo "🧪 TESTANDO CRIAÇÃO DE SESSÃO"
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

# Nome da sessão de teste
SESSION_NAME="teste-$(date +%H%M%S)"

echo ""
print_status "Criando sessão de teste: $SESSION_NAME"

# Criar sessão via API
RESPONSE=$(curl -s -X POST http://localhost:3333/api/whatsapp/start \
  -H "Content-Type: application/json" \
  -H "X-API-Key: 3fb57b986314face5622a786d7c6f8d68b2d2c8df1db6bfbc53589ab299bc19e" \
  -d "{\"sessionName\": \"$SESSION_NAME\"}")

echo "Resposta da API: $RESPONSE"

if echo "$RESPONSE" | grep -q "success\|iniciada"; then
    print_success "Sessão criada com sucesso via API"
else
    print_error "Falha ao criar sessão via API"
    echo "Resposta: $RESPONSE"
    exit 1
fi

echo ""
print_status "Monitorando logs por 60 segundos para detectar problemas..."

# Monitorar logs por 60 segundos para verificar se há loops
timeout 60s docker compose logs -f dynamuszap-api | while read line; do
    echo "$line"
    
    # Detectar problemas conhecidos
    if echo "$line" | grep -q "Was disconnected!"; then
        print_warning "⚠️  Detectada desconexão"
    fi
    
    if echo "$line" | grep -q "Disconnected by cell phone!"; then
        print_error "❌ Detectado reset pelo celular"
    fi
    
    if echo "$line" | grep -q "QR Code gerado"; then
        print_success "✅ QR Code gerado com sucesso"
    fi
    
    if echo "$line" | grep -q "Waiting for QRCode Scan"; then
        print_success "✅ Aguardando escaneamento do QR Code"
    fi
done

echo ""
print_status "Verificando status atual da sessão..."

# Verificar status da sessão
STATUS_RESPONSE=$(curl -s http://localhost:3333/api/whatsapp/status/$SESSION_NAME)
echo "Status da sessão: $STATUS_RESPONSE"

echo ""
print_status "Verificando sessões ativas..."

# Listar sessões
SESSIONS_RESPONSE=$(curl -s http://localhost:3333/api/whatsapp/sessions)
echo "Sessões ativas: $SESSIONS_RESPONSE"

echo ""
print_status "Análise dos logs completos..."

# Analisar logs para problemas
LOGS=$(docker compose logs dynamuszap-api 2>&1)

DISCONNECT_COUNT=$(echo "$LOGS" | grep -c "Was disconnected!")
PHONE_DISCONNECT_COUNT=$(echo "$LOGS" | grep -c "Disconnected by cell phone!")
QR_COUNT=$(echo "$LOGS" | grep -c "QR Code gerado")

echo ""
echo "📊 ESTATÍSTICAS:"
echo "   • Desconexões: $DISCONNECT_COUNT"
echo "   • Resets pelo celular: $PHONE_DISCONNECT_COUNT"
echo "   • QR Codes gerados: $QR_COUNT"

echo ""
if [ "$PHONE_DISCONNECT_COUNT" -eq 0 ]; then
    print_success "✅ Nenhum reset pelo celular detectado - PROBLEMA CORRIGIDO!"
elif [ "$PHONE_DISCONNECT_COUNT" -lt 3 ]; then
    print_warning "⚠️  Poucos resets detectados - MELHORIA SIGNIFICATIVA"
else
    print_error "❌ Muitos resets ainda ocorrendo - PROBLEMA PERSISTE"
fi

echo ""
print_status "Para continuar o teste:"
echo "1. Acesse: http://localhost:3333/sessions.html"
echo "2. Procure a sessão: $SESSION_NAME"
echo "3. Escaneie o QR Code com seu WhatsApp"
echo "4. Verifique se a conexão se mantém estável"

echo ""
print_status "Para monitorar logs em tempo real:"
echo "docker compose logs -f dynamuszap-api | grep '$SESSION_NAME'"

echo ""
echo "================================" 