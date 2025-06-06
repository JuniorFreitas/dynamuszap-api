#!/bin/bash

# Script de inicialização do DynamusZap API com Docker
echo "🚀 Iniciando DynamusZap API com Docker..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCESSO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[AVISO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERRO]${NC} $1"
}

# Verificar se o Docker está instalado e rodando
print_status "Verificando se o Docker está instalado e rodando..."
if ! command -v docker &> /dev/null; then
    print_error "Docker não está instalado. Por favor, instale o Docker primeiro."
    exit 1
fi

if ! docker info &> /dev/null; then
    print_error "Docker não está rodando. Por favor, inicie o Docker."
    exit 1
fi

print_success "Docker está funcionando corretamente!"

# Verificar se o docker-compose está disponível
print_status "Verificando docker-compose..."
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "docker-compose não está disponível. Por favor, instale o docker-compose."
    exit 1
fi

# Usar docker compose ou docker-compose
DOCKER_COMPOSE_CMD="docker compose"
if ! docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
fi

print_success "Docker Compose está disponível!"

# Verificar se o arquivo .env existe
print_status "Verificando arquivo .env..."
if [ ! -f ".env" ]; then
    print_warning "Arquivo .env não encontrado. Criando a partir do env.example..."
    if [ -f "env.example" ]; then
        cp env.example .env
        print_success "Arquivo .env criado com sucesso!"
    else
        print_error "Arquivo env.example não encontrado. Não é possível criar .env automaticamente."
        exit 1
    fi
else
    print_success "Arquivo .env encontrado!"
fi

# Criar diretórios necessários se não existirem
print_status "Criando diretórios necessários..."
mkdir -p tokens logs
print_success "Diretórios criados/verificados!"

# Limpar containers e volumes antigos (opcional)
echo ""
read -p "🧹 Deseja limpar containers e volumes antigos? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Limpando containers e volumes antigos..."
    $DOCKER_COMPOSE_CMD down -v --remove-orphans
    docker system prune -f --volumes
    print_success "Limpeza concluída!"
else
    print_status "Parando containers existentes..."
    $DOCKER_COMPOSE_CMD down
fi

# Construir e iniciar os containers
print_status "Construindo e iniciando os containers..."
$DOCKER_COMPOSE_CMD build --no-cache
$DOCKER_COMPOSE_CMD up -d

# Verificar se o container está rodando
print_status "Verificando status dos containers..."
if $DOCKER_COMPOSE_CMD ps | grep -q "dynamuszap-api.*Up"; then
    print_success "Container iniciado com sucesso!"
    
    # Aguardar alguns segundos para a aplicação inicializar
    print_status "Aguardando aplicação inicializar..."
    sleep 10
    
    # Verificar logs
    print_status "Exibindo logs recentes..."
    $DOCKER_COMPOSE_CMD logs --tail=20 dynamuszap-api
    
    echo ""
    print_success "✨ DynamusZap API está rodando!"
    echo ""
    echo "📝 Informações importantes:"
    echo "   • API: http://localhost:3333"
    echo "   • Documentação: http://localhost:3333/api-docs"
    echo "   • Gerenciador de Sessões: http://localhost:3333/sessions.html"
    echo ""
    echo "🔧 Comandos úteis:"
    echo "   • Ver logs: $DOCKER_COMPOSE_CMD logs -f dynamuszap-api"
    echo "   • Parar: $DOCKER_COMPOSE_CMD down"
    echo "   • Reiniciar: $DOCKER_COMPOSE_CMD restart"
    echo "   • Status: $DOCKER_COMPOSE_CMD ps"
    echo ""
    print_warning "IMPORTANTE: As sessões do WhatsApp são salvas em ./tokens/"
    print_warning "           Mantenha backup deste diretório para não perder as sessões!"
    
else
    print_error "Falha ao iniciar o container. Verificando logs..."
    $DOCKER_COMPOSE_CMD logs dynamuszap-api
    exit 1
fi 