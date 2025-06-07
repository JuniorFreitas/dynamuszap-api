#!/bin/bash

# Script para renomear arquivos SingletonLock para SingletonLock-{timestamp}
# em todas as pastas dentro do diretório tokens

# Definir o diretório base
TOKENS_DIR="./tokens"

# Verificar se o diretório tokens existe
if [ ! -d "$TOKENS_DIR" ]; then
    echo "❌ Erro: Diretório '$TOKENS_DIR' não encontrado!"
    exit 1
fi

echo "🔍 Procurando por arquivos SingletonLock em todas as pastas dentro de $TOKENS_DIR..."
echo ""

# Contador para tracking
contador_encontrados=0
contador_renomeados=0

# Função para processar recursivamente
processar_pasta() {
    local pasta_atual="$1"
    
    # Percorrer todos os itens na pasta atual
    for item in "$pasta_atual"/*; do
        # Verificar se o item existe (evita problemas com wildcards vazios)
        [ -e "$item" ] || [ -L "$item" ] || continue
        
        # Se for um diretório, processar recursivamente
        if [ -d "$item" ]; then
            processar_pasta "$item"
        # Se for um arquivo ou link simbólico chamado SingletonLock
        elif ([ -f "$item" ] || [ -L "$item" ]) && [ "$(basename "$item")" = "SingletonLock" ]; then
            echo "📁 Encontrado: $item"
            contador_encontrados=$((contador_encontrados + 1))
            
            # Gerar timestamp
            timestamp=$(date +"%Y%m%d_%H%M%S")
            
            # Definir novo nome
            pasta_pai=$(dirname "$item")
            novo_nome="$pasta_pai/SingletonLock-$timestamp"
            
            # Tentar renomear o arquivo
            if mv "$item" "$novo_nome" 2>/dev/null; then
                echo "✅ Renomeado para: SingletonLock-$timestamp"
                contador_renomeados=$((contador_renomeados + 1))
            else
                echo "❌ Erro ao renomear: $item"
            fi
            echo ""
        fi
    done
}

# Iniciar o processamento
processar_pasta "$TOKENS_DIR"

# Mostrar resumo
echo "📊 RESUMO:"
echo "   Arquivos SingletonLock encontrados: $contador_encontrados"
echo "   Arquivos renomeados com sucesso: $contador_renomeados"

if [ $contador_encontrados -eq 0 ]; then
    echo "ℹ️  Nenhum arquivo SingletonLock foi encontrado em nenhuma pasta."
elif [ $contador_renomeados -eq $contador_encontrados ]; then
    echo "🎉 Todos os arquivos foram renomeados com sucesso!"
else
    echo "⚠️  Alguns arquivos não puderam ser renomeados. Verifique as permissões."
fi 