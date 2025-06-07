#!/bin/bash

# Script de inicialização para DynamusZap API no Alpine Linux

echo "🚀 Iniciando DynamusZap API..."

# Verificar se o Xvfb está disponível e iniciar se necessário
if command -v Xvfb >/dev/null 2>&1; then
    echo "📺 Iniciando Xvfb (display virtual)..."
    Xvfb :99 -screen 0 1024x768x24 -ac +extension GLX +render -noreset &
    export DISPLAY=:99
    sleep 2
fi

# Verificar se o Chromium está disponível
if command -v chromium-browser >/dev/null 2>&1; then
    echo "🌐 Chromium encontrado: $(chromium-browser --version)"
else
    echo "❌ Chromium não encontrado!"
    exit 1
fi

# Verificar Node.js
echo "📦 Node.js version: $(node --version)"

# Criar diretório de tokens se não existir
mkdir -p /app/tokens
chmod 755 /app/tokens

# Limpar arquivos SingletonLock órfãos
echo "🧹 Limpando arquivos SingletonLock órfãos..."
find /app/tokens -name "SingletonLock" -type l -delete 2>/dev/null || true
find /app/tokens -name "SingletonLock" -type f -exec mv {} {}_$(date +%Y%m%d_%H%M%S) \; 2>/dev/null || true
find /app/tokens -name "lockfile" -delete 2>/dev/null || true
find /app/tokens -name "DevToolsActivePort" -delete 2>/dev/null || true

# Verificar permissões
echo "🔐 Verificando permissões..."
ls -la /app/tokens

# Iniciar a aplicação
echo "🚀 Iniciando aplicação Node.js..."
exec node ./src/app.js 