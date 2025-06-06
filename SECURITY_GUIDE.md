# 🛡️ Guia de Segurança - DynamusZap API

Este documento descreve todas as medidas de segurança implementadas na API do DynamusZap.

## 📋 Índice

1. [Autenticação](#autenticação)
2. [Autorização](#autorização)
3. [Proteção contra Ataques](#proteção-contra-ataques)
4. [Logs de Segurança](#logs-de-segurança)
5. [Configuração em Produção](#configuração-em-produção)
6. [Monitoramento](#monitoramento)

## 🔐 Autenticação

### JWT (JSON Web Tokens)
- **Access Token**: Válido por 15 minutos (configurável)
- **Refresh Token**: Válido por 7 dias (configurável)
- **Algoritmo**: HS256 com secrets fortes
- **Claims**: userId, username, role, iat

#### Endpoints de Autenticação:
```bash
# Login
POST /api/auth/login
{
  "username": "admin",
  "password": "sua_senha"
}

# Renovar token
POST /api/auth/refresh
{
  "refreshToken": "seu_refresh_token"
}

# Logout
POST /api/auth/logout
```

### API Key Authentication
- **Formato**: 64 caracteres hexadecimais
- **Header**: `X-API-Key: sua_api_key`
- **Query Parameter**: `?apikey=sua_api_key`

#### Gerar API Key:
```bash
POST /api/auth/generate-api-key
Authorization: Bearer seu_jwt_token
```

### Basic Authentication (Legado)
- Ainda suportado para compatibilidade
- Header: `Authorization: Basic base64(username:password)`

## 🔒 Autorização

### Middleware Flexível
O sistema suporta múltiplos métodos de autenticação:
- JWT Bearer Token
- API Key
- Basic Auth (legado)

### Proteção de Rotas
```javascript
const { flexibleAuth } = require('./middleware/apiKeyAuth');
const { verifyToken } = require('./middleware/jwtAuth');

// Aceita JWT ou API Key
app.use('/api/whatsapp', flexibleAuth, whatsappRoutes);

// Apenas JWT
app.use('/api/admin', verifyToken, adminRoutes);
```

## 🛡️ Proteção contra Ataques

### Rate Limiting
- **API Geral**: 100 requisições por 15 minutos
- **Autenticação**: 5 tentativas por 15 minutos
- **Endpoints Críticos**: 10 requisições por hora
- **Speed Limiting**: Reduz velocidade após 50% do limite

### Proteção contra Força Bruta
- Detecta tentativas de login falhadas
- Bloqueia IP após 5 tentativas
- Janela de tempo: 15 minutos
- Log de tentativas suspeitas

### Headers de Segurança (Helmet)
```javascript
Content-Security-Policy: default-src 'self'
Strict-Transport-Security: max-age=31536000
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: same-origin
```

### Sanitização de Entrada
- **XSS Protection**: Escape de caracteres perigosos
- **SQL Injection**: Detecção de padrões maliciosos
- **HTML Tags**: Remoção de tags não permitidas

### CORS Restritivo
```javascript
// Apenas origins configuradas
origin: process.env.CORS_ORIGINS.split(',')
credentials: true
methods: ['GET', 'POST', 'PUT', 'DELETE']
```

### Detecção de Injeção
Padrões detectados:
- SQL Injection: `'`, `--`, `#`
- XSS: `<script>`, `<img>`, tags HTML
- Command Injection: caracteres especiais

## 📝 Logs de Segurança

### Tipos de Log
- **access.log**: Todas as requisições HTTP
- **security.log**: Eventos de segurança em JSON
- **error.log**: Erros do sistema

### Eventos Logados
- Login/logout bem-sucedidos
- Tentativas de login falhadas
- Rate limit excedido
- Tentativas de injeção
- Acesso a arquivos sensíveis
- Bots suspeitos
- Geração de API Keys

### Formato do Log de Segurança
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "eventType": "LOGIN_FAILED",
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "details": {
    "username": "admin",
    "reason": "invalid_password"
  }
}
```

## 🚀 Configuração em Produção

### Variáveis de Ambiente Obrigatórias
```bash
# Secrets fortes (mínimo 32 caracteres)
JWT_SECRET=sua_chave_secreta_muito_forte_aqui
JWT_REFRESH_SECRET=outra_chave_secreta_muito_forte_aqui

# API Keys válidas
VALID_API_KEYS=key1,key2,key3

# HTTPS
ENABLE_HTTPS=true
SSL_KEY_PATH=/path/to/private.key
SSL_CERT_PATH=/path/to/certificate.crt

# Ambiente
NODE_ENV=production
```

### Checklist de Segurança
- [ ] JWT secrets com 32+ caracteres
- [ ] HTTPS habilitado
- [ ] API Keys configuradas
- [ ] CORS origins específicos
- [ ] Logs habilitados
- [ ] Rate limits configurados
- [ ] Firewall configurado
- [ ] Certificados SSL válidos

### HTTPS/SSL
```bash
# Gerar certificado auto-assinado (desenvolvimento)
openssl req -x509 -newkey rsa:4096 -keyout private.key -out certificate.crt -days 365 -nodes

# Configurar no .env
ENABLE_HTTPS=true
SSL_KEY_PATH=/path/to/private.key
SSL_CERT_PATH=/path/to/certificate.crt
```

## 📊 Monitoramento

### Métricas de Segurança
- Tentativas de login por IP
- Rate limit hits por endpoint
- Tentativas de injeção
- Bots detectados
- API Keys utilizadas

### Alertas Recomendados
- Múltiplas tentativas de login falhadas
- Rate limit excedido frequentemente
- Tentativas de injeção
- Acesso a arquivos sensíveis
- Erro ao carregar certificados SSL

### Comandos Úteis
```bash
# Gerar API Key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Gerar JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Verificar logs de segurança
tail -f logs/security.log | jq .

# Verificar tentativas de login
grep "LOGIN_FAILED" logs/security.log | jq .
```

## 🔧 Configuração de Proxy Reverso

### Nginx (Recomendado)
```nginx
server {
    listen 443 ssl;
    server_name seu-dominio.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Rate limiting adicional
    limit_req_zone $binary_remote_addr zone=api:10m rate=1r/s;
    limit_req zone=api burst=5 nodelay;
}
```

## 📚 Referências

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

## 🆘 Suporte

Para questões de segurança ou vulnerabilidades, entre em contato:
- Email: security@dynamusti.com.br
- Abra uma issue com label 'security' 