# 🐳 Docker Security Guide - DynamusZap API

Este guia explica como usar o DynamusZap API com Docker de forma segura.

## 🚀 Quick Start

### 1. Configuração Inicial

```bash
# Copiar arquivo de exemplo
cp env.example .env

# Editar configurações (OBRIGATÓRIO)
nano .env
```

### 2. Deploy Simples (Desenvolvimento)

```bash
# Usar o docker-compose padrão
docker-compose up -d
```

### 3. Deploy Seguro (Produção)

```bash
# Usar o script de deploy
./scripts/deploy.sh

# Ou manualmente com docker-compose de produção
docker-compose -f docker-compose.prod.yml up -d
```

## 🛡️ Medidas de Segurança Implementadas

### Container Security

#### 1. Usuário Não-Root
```dockerfile
# Container roda como usuário 'dynamuszap' (UID 1001)
USER dynamuszap
```

#### 2. Capabilities Limitadas
```yaml
cap_drop:
  - ALL
cap_add:
  - CHOWN
  - DAC_OVERRIDE
  - SETGID
  - SETUID
```

#### 3. Security Options
```yaml
security_opt:
  - no-new-privileges:true
  - seccomp=unconfined  # Necessário para Chromium
```

#### 4. Read-Only Root (quando possível)
```yaml
read_only: false  # Necessário para logs e tokens
tmpfs:
  - /tmp:noexec,nosuid,size=100m
```

### Network Security

#### 1. Isolated Network
```yaml
networks:
  dynamuszap-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

#### 2. Port Binding
```yaml
# Desenvolvimento
ports:
  - "3000:3000"

# Produção (apenas localhost)
ports:
  - "127.0.0.1:3000:3000"
```

### Resource Limits

#### 1. Memory Limits
```yaml
mem_limit: 1g
mem_reservation: 512m
```

#### 2. CPU Limits
```yaml
cpus: '2.0'
```

### Volume Security

#### 1. Volumes Específicos (Produção)
```yaml
volumes:
  - ./tokens:/app/tokens:rw,Z
  - ./logs:/app/logs:rw,Z
  - dynamuszap_node_modules:/app/node_modules:ro,Z
```

#### 2. SELinux Labels
- `:Z` - Private unshared label
- `:rw` - Read-write access
- `:ro` - Read-only access

### Health Checks

```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api/health"]
  interval: 30s
  timeout: 10s
  retries: 5
  start_period: 60s
```

## 🔧 Configurações Específicas do Docker

### Variáveis de Ambiente

```bash
# Docker específico
DOCKER_ENV=true
NODE_ENV=production

# Trust proxy para containers
# Automaticamente configurado quando DOCKER_ENV=true
```

### CORS para Docker

```javascript
// Automaticamente inclui IPs do Docker
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://0.0.0.0:3000
```

### Trust Proxy

```javascript
// Confia em proxies do Docker network
if (process.env.DOCKER_ENV === 'true') {
  app.set("trust proxy", true);
}
```

## 🌐 Nginx Proxy Reverso

### 1. Com SSL/TLS

```bash
# Usar docker-compose de produção (inclui Nginx)
docker-compose -f docker-compose.prod.yml up -d
```

### 2. Configurações do Nginx

- Rate limiting por rota
- Headers de segurança
- SSL/TLS termination
- Proxy para container da API

### 3. Certificados SSL

```bash
# Criar diretório SSL
mkdir -p ssl

# Copiar certificados
cp /path/to/certificate.crt ssl/
cp /path/to/private.key ssl/

# Ou gerar auto-assinado (desenvolvimento)
openssl req -x509 -newkey rsa:4096 -keyout ssl/private.key -out ssl/certificate.crt -days 365 -nodes
```

## 📊 Monitoramento

### 1. Health Check

```bash
# Verificar status
curl http://localhost:3000/api/health

# Response esperada
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "memory": {...},
  "security": {
    "helmet": true,
    "rateLimit": true,
    "cors": true,
    "jwtAuth": true,
    "apiKeyAuth": true
  }
}
```

### 2. Logs

```bash
# Logs em tempo real
docker-compose logs -f dynamuszap-api

# Logs de segurança
docker-compose exec dynamuszap-api cat logs/security.log | jq .

# Logs de acesso
docker-compose exec dynamuszap-api cat logs/access.log
```

### 3. Métricas do Container

```bash
# Uso de recursos
docker stats dynamuszap-api

# Informações do container
docker inspect dynamuszap-api
```

## 🚨 Alertas e Segurança

### 1. Detecção de Anomalias

```bash
# Verificar tentativas de ataque
docker-compose exec dynamuszap-api grep "SECURITY ALERT" logs/security.log

# Rate limit hits
docker-compose exec dynamuszap-api grep "RATE_LIMIT_EXCEEDED" logs/security.log

# Login failures
docker-compose exec dynamuszap-api grep "LOGIN_FAILED" logs/security.log
```

### 2. Backup de Segurança

```bash
# Backup dos logs
docker cp dynamuszap-api:/app/logs ./logs-backup-$(date +%Y%m%d)

# Backup dos tokens
docker cp dynamuszap-api:/app/tokens ./tokens-backup-$(date +%Y%m%d)
```

## 🔍 Troubleshooting

### 1. Container não inicia

```bash
# Verificar logs
docker-compose logs dynamuszap-api

# Verificar configurações
docker-compose config

# Verificar health check
docker-compose exec dynamuszap-api wget -qO- http://localhost:3000/api/health
```

### 2. Problemas de Permissão

```bash
# Verificar usuário do container
docker-compose exec dynamuszap-api whoami

# Verificar permissões dos volumes
docker-compose exec dynamuszap-api ls -la /app/logs
docker-compose exec dynamuszap-api ls -la /app/tokens
```

### 3. Problemas de Rede

```bash
# Verificar conectividade
docker-compose exec dynamuszap-api ping google.com

# Verificar portas
docker-compose port dynamuszap-api 3000

# Verificar network
docker network ls
docker network inspect dynamuszap_dynamuszap-network
```

## 📋 Checklist de Segurança

### Antes do Deploy

- [ ] Arquivo .env configurado
- [ ] JWT_SECRET alterado (32+ caracteres)
- [ ] BASIC_AUTH_PASSWORD alterado
- [ ] API_KEYS configuradas
- [ ] NODE_ENV=production
- [ ] Certificados SSL (se HTTPS)
- [ ] Firewall configurado
- [ ] Backup configurado

### Após o Deploy

- [ ] Health check funcionando
- [ ] Logs sendo gerados
- [ ] Container como usuário não-root
- [ ] Rate limiting ativo
- [ ] CORS configurado
- [ ] Headers de segurança presentes
- [ ] Monitoramento ativo

## 🔧 Comandos Úteis

```bash
# Build e start
docker-compose up -d --build

# Parar e remover
docker-compose down

# Logs em tempo real
docker-compose logs -f

# Shell no container
docker-compose exec dynamuszap-api sh

# Reiniciar apenas a API
docker-compose restart dynamuszap-api

# Ver status
docker-compose ps

# Limpar recursos
docker system prune -f

# Deploy com verificações
./scripts/deploy.sh

# Deploy limpo (rebuild)
./scripts/deploy.sh --clean
```

## 🆘 Suporte

Para problemas específicos do Docker:

1. Verificar logs: `docker-compose logs dynamuszap-api`
2. Verificar health: `curl http://localhost:3000/api/health`
3. Verificar configuração: `docker-compose config`
4. Abrir issue com logs completos 