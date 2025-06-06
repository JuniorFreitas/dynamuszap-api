# 🚀 DynamusZap API - WhatsApp Bot com Docker

[![Version](https://img.shields.io/github/tag/JuniorFreitas/dynamuszap-api.svg)](https://github.com/JuniorFreitas/dynamuszap-api/releases)
[![Downloads](https://img.shields.io/github/downloads/JuniorFreitas/dynamuszap-api/total)](https://github.com/JuniorFreitas/dynamuszap-api/releases)
[![Issues](https://img.shields.io/github/issues/JuniorFreitas/dynamuszap-api.svg)](https://github.com/JuniorFreitas/dynamuszap-api/issues)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

API robusta para integração com WhatsApp usando Venom Bot, otimizada para Docker com gerenciamento avançado de sessões.

## ✨ Funcionalidades

- **🔄 Gerenciamento Inteligente de Sessões**: Criação, monitoramento e recuperação automática
- **🌐 Interface Web Moderna**: Gerenciador de sessões com QR code em tempo real via Socket.IO
- **📡 API RESTful Completa**: Endpoints para mensagens, sessões, webhooks e muito mais
- **🔐 Segurança Avançada**: JWT + API Keys, Rate Limiting, CORS, Input Sanitization
- **🐳 Docker Otimizado**: Configuração completa para produção com healthchecks
- **📊 Monitoramento**: Logs estruturados, métricas e diagnósticos automáticos
- **📚 Documentação Swagger**: API totalmente documentada e testável

## 🎯 Início Rápido

### 1. Pré-requisitos
- Docker e Docker Compose
- WhatsApp no celular para escanear QR Code

### 2. Instalação Automática
```bash
# Clonar o repositório
git clone <repository-url>
cd dynamuszap-api

# Iniciar com um comando (recomendado)
./start-docker.sh
```

### 3. Acesso Imediato
- **🌐 API**: http://localhost:3333
- **📖 Documentação**: http://localhost:3333/api-docs  
- **📱 Gerenciador de Sessões**: http://localhost:3333/sessions.html

## 🔧 Configuração Avançada

### Variáveis de Ambiente Otimizadas
```env
# Configurações do Servidor
PORT=3333
NODE_ENV=production
DOCKER_ENV=true

# Otimizações para WhatsApp
SESSION_TIMEOUT=60
SESSION_MAX_RECONNECT_ATTEMPTS=10
SESSION_RECONNECT_DELAY=5000
SESSION_HEALTH_CHECK_INTERVAL=15000

# Segurança
JWT_SECRET=sua_jwt_secret_super_secreta_com_32_caracteres
VALID_API_KEYS=3fb57b986314face5622a786d7c6f8d68b2d2c8df1db6bfbc53589ab299bc19e

# Performance
QUEUE_CONCURRENT=2
QUEUE_MAX_RETRIES=5
REQUEST_TIMEOUT=45000
```

## 📱 Criando Sessões WhatsApp

### Método 1: Interface Web (Recomendado)
1. Acesse: http://localhost:3333/sessions.html
2. Digite um nome único para a sessão (3-50 caracteres)
3. Clique em "Criar Sessão"
4. QR Code aparece automaticamente via Socket.IO
5. Escaneie com WhatsApp e pronto! 🎉

### Método 2: API
```bash
# Criar sessão via API
curl -X POST http://localhost:3333/api/whatsapp/start \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua_api_key" \
  -d '{"session": "minha-sessao"}'
```

## 🔌 API Endpoints

### 🔐 Autenticação
```bash
POST /api/auth/login          # Login com JWT
POST /api/auth/refresh        # Renovar token
```

### 📱 Gerenciamento de Sessões
```bash
GET    /api/whatsapp/sessions           # Listar todas as sessões
POST   /api/whatsapp/start              # Criar nova sessão
DELETE /api/whatsapp/logout/:session    # Desconectar sessão
GET    /api/whatsapp/status/:session    # Status da sessão
POST   /api/whatsapp/restart/:session   # Reiniciar sessão
```

### 💬 Envio de Mensagens
```bash
POST /api/whatsapp/send-text     # Enviar texto
POST /api/whatsapp/send-image    # Enviar imagem
POST /api/whatsapp/send-file     # Enviar arquivo
POST /api/whatsapp/send-audio    # Enviar áudio
```

### 📊 Monitoramento
```bash
GET /api/health                  # Status da API
GET /api/whatsapp/sessions       # Status das sessões
```

## 🛠️ Comandos Úteis

### Gerenciamento Docker
```bash
# Iniciar projeto (script automático)
./start-docker.sh

# Comandos manuais
docker compose up -d              # Iniciar
docker compose down               # Parar
docker compose restart           # Reiniciar
docker compose logs -f           # Ver logs
docker compose ps                # Status

# Diagnóstico completo
./diagnose.sh
```

### Solução de Problemas
```bash
# Limpeza completa (resolve 90% dos problemas)
docker compose down -v
docker system prune -f
./start-docker.sh

# Verificar logs de erro
docker compose logs dynamuszap-api | grep -i error

# Verificar recursos
docker stats dynamuszap-api

# Testar conectividade
curl http://localhost:3333/api/health
```

## 🚨 Problemas Comuns e Soluções

### ❌ Sessão não conecta
```bash
# Solução rápida
docker compose restart
./diagnose.sh

# Limpeza de sessão corrompida
rm -rf ./tokens/nome-da-sessao
docker compose restart
```

### ❌ QR Code não aparece
- Verificar Socket.IO: http://localhost:3333/socket.io/socket.io.js
- Verificar console do navegador (F12)
- Verificar CORS no `.env`

### ❌ Container não inicia
```bash
# Verificar permissões
sudo chown -R 1001:1001 ./tokens ./logs

# Reconstruir imagem
docker compose build --no-cache
```

### ❌ Sessões não persistem
```bash
# Verificar volumes
docker compose config | grep -A 5 volumes

# Testar permissões
touch ./tokens/test.txt && rm ./tokens/test.txt
```

## 🛡️ Segurança Implementada

- **🔒 Helmet**: Headers de segurança HTTP
- **⚡ Rate Limiting**: 100 req/15min por IP
- **🌐 CORS Restritivo**: Origins específicos
- **🧹 Input Sanitization**: Limpeza automática de dados
- **🔑 Autenticação Dupla**: JWT + API Keys
- **🛡️ Brute Force Protection**: Proteção contra ataques
- **📝 Security Logging**: Log de atividades suspeitas
- **🔐 Container Security**: Usuário não-root, capabilities limitadas

## 📊 Monitoramento e Logs

### Logs Estruturados
```bash
# Logs em tempo real
docker compose logs -f dynamuszap-api

# Filtrar por tipo
docker compose logs dynamuszap-api | grep -i error
docker compose logs dynamuszap-api | grep -i session
docker compose logs dynamuszap-api | grep -i api
```

### Métricas de Sistema
```bash
# Recursos do container
docker stats dynamuszap-api

# Diagnóstico completo
./diagnose.sh

# Health check
curl http://localhost:3333/api/health | jq
```

## 📁 Estrutura Otimizada

```
dynamuszap-api/
├── 🐳 Docker
│   ├── docker-compose.yml         # Configuração principal
│   ├── Dockerfile                 # Imagem otimizada
│   └── start-docker.sh           # Script de inicialização
├── 🔧 Configuração
│   ├── .env                      # Variáveis de ambiente
│   ├── env.example               # Template de configuração
│   └── src/config/               # Configurações da aplicação
├── 📱 Aplicação
│   ├── src/                      # Código fonte
│   ├── public/                   # Interface web
│   └── tokens/                   # Sessões WhatsApp (persistente)
├── 📊 Monitoramento
│   ├── logs/                     # Logs da aplicação
│   ├── diagnose.sh              # Script de diagnóstico
│   └── WHATSAPP_TROUBLESHOOTING.md
└── 📚 Documentação
    ├── README.md                 # Este arquivo
    ├── SESSIONS_MANAGER.md       # Gerenciamento de sessões
    ├── API_ROUTES.md            # Documentação da API
    └── DOCKER_SECURITY.md       # Segurança do Docker
```

## 🎯 Performance e Otimizações

### Configurações Recomendadas para Produção
```yaml
# docker-compose.yml
services:
  dynamuszap-api:
    mem_limit: 2g
    mem_reservation: 1g
    cpus: '2.0'
    shm_size: '512m'
    restart: unless-stopped
```

### Backup Automático
```bash
# Cron job para backup diário das sessões
0 2 * * * tar -czf /backup/tokens_$(date +\%Y\%m\%d).tar.gz ./tokens/
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit: `git commit -m 'Adiciona nova funcionalidade'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

## 📞 Suporte e Documentação

### 📚 Documentação Completa
- **SESSIONS_MANAGER.md** - Gerenciamento avançado de sessões
- **WHATSAPP_TROUBLESHOOTING.md** - Solução de problemas específicos
- **API_ROUTES.md** - Documentação completa da API
- **DOCKER_SECURITY.md** - Configurações de segurança

### 🔧 Ferramentas de Debug
- `./diagnose.sh` - Diagnóstico automático completo
- `docker compose logs -f` - Logs em tempo real
- http://localhost:3333/api-docs - Documentação interativa

### 🆘 Suporte
- **Issues**: Abra uma issue no repositório
- **Logs**: Sempre inclua logs ao reportar problemas
- **Diagnóstico**: Execute `./diagnose.sh` antes de reportar

---

## 📄 Licença

Este projeto está sob a licença MIT.

**Desenvolvido com ❤️ para facilitar a integração com WhatsApp**