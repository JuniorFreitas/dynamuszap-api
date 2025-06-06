#!/bin/bash

# DynamusZap API - Script de Deploy Seguro
# Este script automatiza o deploy da aplicação com verificações de segurança

set -e  # Parar execução em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_message() {
    echo -e "${BLUE}[DEPLOY]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    print_error "Este script deve ser executado na raiz do projeto!"
    exit 1
fi

print_message "Iniciando deploy da DynamusZap API..."

# Verificar se o arquivo .env existe
if [ ! -f ".env" ]; then
    print_warning "Arquivo .env não encontrado. Criando a partir do template..."
    if [ -f "env.example" ]; then
        cp env.example .env
        print_warning "Configure o arquivo .env antes de continuar!"
        exit 1
    else
        print_error "Template env.example não encontrado!"
        exit 1
    fi
fi

# Verificações de segurança
print_message "Executando verificações de segurança..."

# Verificar se JWT_SECRET está configurado
if grep -q "sua_jwt_secret_super_secreta_aqui" .env 2>/dev/null; then
    print_error "JWT_SECRET não foi alterado do valor padrão!"
    print_error "Configure um JWT_SECRET seguro no arquivo .env"
    exit 1
fi

# Verificar se BASIC_AUTH_PASSWORD foi alterado
if grep -q "admin@password" .env 2>/dev/null; then
    print_warning "BASIC_AUTH_PASSWORD ainda está usando o valor padrão!"
    print_warning "Considere alterar para uma senha mais segura"
fi

# Verificar se NODE_ENV está configurado para produção
if ! grep -q "NODE_ENV=production" .env 2>/dev/null; then
    print_warning "NODE_ENV não está configurado para 'production'"
fi

# Criar diretórios necessários
print_message "Criando diretórios necessários..."
mkdir -p logs tokens ssl

# Parar containers existentes
print_message "Parando containers existentes..."
docker-compose down 2>/dev/null || true

# Limpar imagens antigas (opcional)
if [ "$1" = "--clean" ]; then
    print_message "Limpando imagens antigas..."
    docker system prune -f
    docker image prune -f
fi

# Construir nova imagem
print_message "Construindo nova imagem Docker..."
docker-compose build --no-cache

# Verificar se a imagem foi criada com sucesso
if ! docker images | grep -q "dynamuszap"; then
    print_error "Falha ao construir a imagem Docker!"
    exit 1
fi

# Executar testes de segurança (se existirem)
print_message "Executando testes..."
if [ -f "package.json" ] && grep -q '"test"' package.json; then
    npm test || print_warning "Alguns testes falharam, mas continuando o deploy..."
fi

# Iniciar containers
print_message "Iniciando containers..."
docker-compose up -d

# Aguardar o container ficar saudável
print_message "Aguardando container ficar saudável..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if docker-compose exec -T dynamuszap-api wget --quiet --tries=1 --spider http://localhost:3000/api/health 2>/dev/null; then
        print_success "Container está saudável!"
        break
    fi
    
    attempt=$((attempt + 1))
    print_message "Tentativa $attempt/$max_attempts..."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    print_error "Container não ficou saudável no tempo esperado!"
    docker-compose logs dynamuszap-api
    exit 1
fi

# Exibir status
print_message "Verificando status dos containers..."
docker-compose ps

# Exibir logs recentes
print_message "Logs recentes:"
docker-compose logs --tail=20 dynamuszap-api

# Informações finais
print_success "Deploy concluído com sucesso!"
print_message "API disponível em: http://localhost:$(grep PORT .env | cut -d'=' -f2 || echo 3000)"
print_message "Health check: http://localhost:$(grep PORT .env | cut -d'=' -f2 || echo 3000)/api/health"
print_message "Logs em tempo real: docker-compose logs -f dynamuszap-api"

# Verificações finais de segurança
print_message "Verificações finais de segurança:"

# Verificar se o container está rodando como usuário não-root
container_user=$(docker-compose exec -T dynamuszap-api whoami 2>/dev/null || echo "unknown")
if [ "$container_user" = "dynamuszap" ]; then
    print_success "✅ Container rodando como usuário não-root"
else
    print_warning "⚠️  Container pode estar rodando como root"
fi

# Verificar se as portas estão expostas corretamente
if docker-compose port dynamuszap-api 3000 >/dev/null 2>&1; then
    print_success "✅ Porta 3000 exposta corretamente"
else
    print_warning "⚠️  Porta 3000 não está exposta"
fi

# Verificar se os logs estão sendo gerados
if [ -d "logs" ] && [ "$(ls -A logs 2>/dev/null)" ]; then
    print_success "✅ Logs sendo gerados"
else
    print_warning "⚠️  Diretório de logs vazio"
fi

print_success "Deploy completo! 🚀" 