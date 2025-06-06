# 🔧 Guia de Solução de Problemas - WhatsApp Sessions

## 🚨 Problemas Comuns e Soluções

### 1. 📱 Sessão não conecta ou fica travada

#### ❌ Sintomas:
- QR Code não aparece
- Sessão fica em "connecting" indefinidamente
- Erro "Page crashed" ou "Browser disconnected"

#### ✅ Soluções:

**Solução 1: Reiniciar container com limpeza**
```bash
# Parar container
docker compose down

# Limpar cache do Docker
docker system prune -f

# Reconstruir e iniciar
docker compose build --no-cache
docker compose up -d
```

**Solução 2: Limpar sessões corrompidas**
```bash
# Remover sessões corrompidas
rm -rf ./tokens/[nome-da-sessao]

# Reiniciar container
docker compose restart
```

**Solução 3: Verificar logs detalhados**
```bash
# Ver logs em tempo real
docker compose logs -f dynamuszap-api

# Ver logs específicos de erro
docker compose logs dynamuszap-api | grep -i error
```

### 2. 🔄 Sessão desconecta frequentemente

#### ❌ Sintomas:
- Sessão conecta mas desconecta após alguns minutos
- Mensagem "WhatsApp Web logged out"
- Precisa escanear QR Code constantemente

#### ✅ Soluções:

**Solução 1: Verificar recursos do container**
```bash
# Verificar uso de recursos
docker stats dynamuszap-api

# Se necessário, aumentar recursos no docker-compose.yml:
# mem_limit: 2g
# cpus: '4.0'
```

**Solução 2: Configurar timeout adequado**
Edite o arquivo `.env`:
```env
SESSION_TIMEOUT=60
SESSION_MAX_RECONNECT_ATTEMPTS=10
SESSION_RECONNECT_DELAY=5000
SESSION_HEALTH_CHECK_INTERVAL=15000
```

**Solução 3: Verificar conectividade**
```bash
# Testar conectividade dentro do container
docker exec -it dynamuszap-api ping -c 3 web.whatsapp.com
```

### 3. 🖼️ QR Code não aparece na interface

#### ❌ Sintomas:
- Interface carrega mas QR Code não é exibido
- Socket.IO não conecta
- Console mostra erros de WebSocket

#### ✅ Soluções:

**Solução 1: Verificar Socket.IO**
```bash
# Verificar se Socket.IO está funcionando
curl http://localhost:3333/socket.io/socket.io.js
```

**Solução 2: Verificar CORS**
Edite o arquivo `.env`:
```env
CORS_ORIGINS=http://localhost:3333,http://127.0.0.1:3333,http://0.0.0.0:3333
```

**Solução 3: Acessar interface diretamente**
- Acesse: http://localhost:3333/sessions.html
- Abra o console do navegador (F12) para ver erros

### 4. 🐳 Container não inicia ou trava

#### ❌ Sintomas:
- Container para logo após iniciar
- Status "Exited" no `docker compose ps`
- Erro de permissões

#### ✅ Soluções:

**Solução 1: Verificar permissões**
```bash
# Ajustar permissões dos diretórios
sudo chown -R 1001:1001 ./tokens ./logs
chmod -R 755 ./tokens ./logs
```

**Solução 2: Verificar arquivo .env**
```bash
# Verificar se .env existe e está correto
cat .env | grep -E "(PORT|NODE_ENV|DOCKER_ENV)"

# Deve mostrar:
# PORT=3333
# NODE_ENV=production
# DOCKER_ENV=true
```

**Solução 3: Reconstruir imagem**
```bash
# Remover imagem antiga
docker rmi dynamuszap-dynamuszap-api

# Reconstruir
docker compose build --no-cache
```

### 5. 💾 Sessões não são salvas

#### ❌ Sintomas:
- Precisa escanear QR Code toda vez
- Diretório `./tokens` vazio
- Sessões não persistem após restart

#### ✅ Soluções:

**Solução 1: Verificar volumes**
```bash
# Verificar se volumes estão montados
docker compose config | grep -A 5 volumes

# Verificar conteúdo do diretório
ls -la ./tokens/
```

**Solução 2: Verificar permissões de escrita**
```bash
# Testar escrita no diretório
touch ./tokens/test.txt && rm ./tokens/test.txt
echo "Permissão OK" || echo "Erro de permissão"
```

**Solução 3: Verificar configuração do container**
```bash
# Verificar se diretório existe dentro do container
docker exec -it dynamuszap-api ls -la /app/tokens/
```

## 🛠️ Comandos Úteis para Debug

### Logs e Monitoramento
```bash
# Ver logs em tempo real
docker compose logs -f dynamuszap-api

# Ver apenas erros
docker compose logs dynamuszap-api 2>&1 | grep -i error

# Ver logs das últimas 100 linhas
docker compose logs --tail=100 dynamuszap-api

# Monitorar recursos
docker stats dynamuszap-api
```

### Acesso ao Container
```bash
# Entrar no container
docker exec -it dynamuszap-api sh

# Verificar processos
docker exec -it dynamuszap-api ps aux

# Verificar arquivos de sessão
docker exec -it dynamuszap-api ls -la /app/tokens/
```

### Testes de Conectividade
```bash
# Testar API
curl http://localhost:3333/api/health

# Testar Socket.IO
curl http://localhost:3333/socket.io/socket.io.js

# Testar interface
curl -I http://localhost:3333/sessions.html
```

## 🔍 Diagnóstico Avançado

### Script de Diagnóstico Completo
```bash
#!/bin/bash
echo "=== DIAGNÓSTICO DYNAMUSZAP ==="

echo "1. Status do Container:"
docker compose ps

echo -e "\n2. Recursos do Container:"
docker stats --no-stream dynamuszap-api

echo -e "\n3. Logs Recentes:"
docker compose logs --tail=20 dynamuszap-api

echo -e "\n4. Verificação de Rede:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3333/api/health

echo -e "\n5. Arquivos de Sessão:"
ls -la ./tokens/

echo -e "\n6. Espaço em Disco:"
df -h

echo -e "\n7. Memória Disponível:"
free -h

echo "=== FIM DO DIAGNÓSTICO ==="
```

### Configurações Recomendadas para Produção

**docker-compose.yml otimizado:**
```yaml
services:
  dynamuszap-api:
    # ... outras configurações ...
    mem_limit: 2g
    mem_reservation: 1g
    cpus: '2.0'
    shm_size: '512m'
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3333/api/health"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s
```

**.env otimizado:**
```env
# Configurações de sessão otimizadas
SESSION_TIMEOUT=60
SESSION_MAX_RECONNECT_ATTEMPTS=10
SESSION_RECONNECT_DELAY=5000
SESSION_HEALTH_CHECK_INTERVAL=15000

# Configurações de performance
QUEUE_CONCURRENT=2
QUEUE_MAX_RETRIES=5
REQUEST_TIMEOUT=45000

# Configurações de log
LOG_LEVEL=info
ENABLE_ACCESS_LOGS=true
```

## 📞 Suporte

Se os problemas persistirem:

1. **Colete informações:**
   - Logs completos: `docker compose logs dynamuszap-api > logs.txt`
   - Configuração: `docker compose config > config.yml`
   - Status: `docker compose ps > status.txt`

2. **Verifique a documentação:**
   - `SESSIONS_MANAGER.md` - Gerenciamento de sessões
   - `DOCKER_SECURITY.md` - Configurações de segurança
   - `API_ROUTES.md` - Rotas da API

3. **Teste em ambiente limpo:**
   ```bash
   # Backup das sessões
   cp -r ./tokens ./tokens_backup
   
   # Reset completo
   docker compose down -v
   docker system prune -f
   rm -rf ./tokens/*
   
   # Reiniciar
   ./start-docker.sh
   ```

## 🎯 Dicas de Performance

1. **Monitoramento contínuo:**
   ```bash
   # Script para monitorar sessões
   watch -n 30 'curl -s http://localhost:3333/api/whatsapp/sessions | jq'
   ```

2. **Backup automático:**
   ```bash
   # Cron job para backup diário das sessões
   0 2 * * * tar -czf /backup/tokens_$(date +\%Y\%m\%d).tar.gz /path/to/tokens/
   ```

3. **Limpeza automática:**
   ```bash
   # Limpar logs antigos
   find ./logs -name "*.log" -mtime +7 -delete
   ``` 