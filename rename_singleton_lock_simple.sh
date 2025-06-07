#!/bin/bash

# Script simplificado para renomear arquivos SingletonLock para SingletonLock-{timestamp}
# em todas as pastas dentro do diretório tokens

echo "🔍 Procurando e renomeando arquivos SingletonLock..."

# Gerar timestamp
timestamp=$(date +"%Y%m%d_%H%M%S")

# Encontrar e renomear todos os arquivos SingletonLock
contador=0
for arquivo in $(find ./tokens -name "SingletonLock" -type l 2>/dev/null); do
    pasta_pai=$(dirname "$arquivo")
    novo_nome="$pasta_pai/SingletonLock-$timestamp"
    
    echo "📁 Encontrado: $arquivo"
    if mv "$arquivo" "$novo_nome" 2>/dev/null; then
        echo "✅ Renomeado para: SingletonLock-$timestamp"
        contador=$((contador + 1))
    else
        echo "❌ Erro ao renomear: $arquivo"
    fi
    echo ""
done

# Resumo
if [ $contador -eq 0 ]; then
    echo "ℹ️  Nenhum arquivo SingletonLock foi encontrado."
else
    echo "🎉 $contador arquivo(s) foram renomeados com sucesso!"
fi 