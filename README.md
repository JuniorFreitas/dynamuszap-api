# DynamusZap API - WhatsApp Automation Platform

Uma plataforma completa para automação do WhatsApp com interface web moderna, Socket.IO para comunicação em tempo real e integração com venom-bot.

## 🚀 Funcionalidades

### WhatsApp
- ✅ **Conexão Real com WhatsApp** - Conecte sua conta WhatsApp via QR Code
- ✅ **Gerenciamento de Sessões** - Múltiplas sessões simultâneas
- ✅ **Envio de Mensagens** - Texto, imagens e documentos PDF
- ✅ **Envio em Massa** - Disparo para múltiplos contatos com delay configurável
- ✅ **Validação de Números** - Verificação automática de números válidos
- ✅ **Histórico de Mensagens** - Acompanhe todas as mensagens enviadas
- ✅ **Status em Tempo Real** - Monitore o status da conexão

### Socket.IO & Tempo Real
- ✅ **Comunicação Bidirecional** - Eventos em tempo real
- ✅ **Salas de Chat** - Sistema de salas para organização
- ✅ **Notificações Push** - Alertas instantâneos
- ✅ **QR Code Automático** - Exibição automática via Socket.IO
- ✅ **Status de Conexão** - Monitoramento em tempo real

### Interface Web
- ✅ **Dashboard Moderno** - Interface responsiva e intuitiva
- ✅ **Autenticação** - Sistema de login seguro
- ✅ **Logs do Sistema** - Monitoramento completo
- ✅ **Configurações** - Personalização da API
- ✅ **Tema WhatsApp** - Design inspirado no WhatsApp oficial

## 🛠️ Tecnologias

- **Backend**: Node.js, Express.js
- **WhatsApp**: venom-bot
- **Tempo Real**: Socket.IO
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Documentação**: Swagger/OpenAPI
- **Containerização**: Docker

## 📦 Instalação e Uso

### Usando Docker (Recomendado)

1. **Clone o repositório**
```bash
git clone <repository-url>
cd dynamuszap-api
```

2. **Inicie com Docker**
```bash
docker compose up -d
```

3. **Acesse a aplicação**
- Interface Principal: http://localhost:3000
- Login: http://localhost:3000/login.html
- Documentação API: http://localhost:3000/api-docs
- Teste Socket.IO: http://localhost:3000/socket-test.html

### Instalação Manual

1. **Instale as dependências**
```bash
npm install
```

2. **Configure as variáveis de ambiente**
```bash
cp .env.example .env
# Edite o arquivo .env conforme necessário
```

3. **Inicie a aplicação**
```bash
npm start
```

## 🔐 Autenticação

**Credenciais padrão:**
- Usuário: `admin`
- Senha: `admin@password`

## 📱 Como Conectar o WhatsApp

### 1. Via Interface Web

1. Acesse http://localhost:3000
2. Faça login com as credenciais
3. Vá para a seção "WhatsApp"
4. Clique em "Conectar WhatsApp" ou "Gerar QR Code"
5. Escaneie o QR Code com seu WhatsApp
6. Aguarde a confirmação de conexão

### 2. Via API

**Conectar WhatsApp:**
```bash
curl -X POST http://localhost:3000/api/whatsapp/connect \
  -H "Content-Type: application/json" \
  -d '{"sessionName": "default"}'
```

**Verificar Status:**
```bash
curl http://localhost:3000/api/whatsapp/status?sessionName=default
```

**Gerar QR Code:**
```bash
curl -X POST http://localhost:3000/api/whatsapp/qr-code \
  -H "Content-Type: application/json" \
  -d '{"sessionName": "default"}'
```

## 📨 Enviando Mensagens

### Mensagem Simples
```bash
curl -X POST http://localhost:3000/api/whatsapp/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "number": "5511999999999",
    "message": "Olá! Esta é uma mensagem de teste.",
    "sessionName": "default"
  }'
```

### Envio em Massa
```bash
curl -X POST http://localhost:3000/api/whatsapp/send-bulk-message \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumbers": ["5511999999999", "5511888888888"],
    "message": "Mensagem em massa!",
    "delay": 2000,
    "sessionName": "default"
  }'
```

## 🔌 Socket.IO - Eventos em Tempo Real

### Eventos do Cliente (Frontend → Backend)

```javascript
// Conectar ao Socket.IO
const socket = io();

// Entrar em uma sala
socket.emit('joinRoom', 'whatsapp-room');

// Enviar mensagem
socket.emit('sendMessage', {
  message: 'Olá!',
  room: 'whatsapp-room'
});

// Solicitar QR Code
socket.emit('requestWhatsAppQR');
```

### Eventos do Servidor (Backend → Frontend)

```javascript
// QR Code recebido
socket.on('whatsappQR', (data) => {
  console.log('QR Code:', data.qrCode);
  // Exibir QR Code na interface
});

// WhatsApp conectado
socket.on('whatsappConnected', (data) => {
  console.log('WhatsApp conectado:', data);
});

// WhatsApp desconectado
socket.on('whatsappDisconnected', () => {
  console.log('WhatsApp desconectado');
});

// Nova mensagem recebida
socket.on('whatsappMessage', (data) => {
  console.log('Mensagem recebida:', data);
});

// Notificações
socket.on('notification', (data) => {
  console.log('Notificação:', data.message);
});
```

## 📊 API Endpoints

### WhatsApp
- `POST /api/whatsapp/connect` - Conectar WhatsApp
- `POST /api/whatsapp/disconnect` - Desconectar WhatsApp
- `POST /api/whatsapp/qr-code` - Gerar QR Code
- `GET /api/whatsapp/status` - Status da conexão
- `GET /api/whatsapp/sessions` - Listar sessões ativas
- `POST /api/whatsapp/send-message` - Enviar mensagem
- `POST /api/whatsapp/send-bulk-message` - Envio em massa

### Socket.IO
- `GET /api/socket/stats` - Estatísticas de conexão
- `POST /api/socket/broadcast` - Broadcast para todos
- `POST /api/socket/notification` - Enviar notificação

## 🏗️ Estrutura do Projeto

```
dynamuszap-api/
├── src/
│   ├── controllers/        # Controladores da API
│   ├── services/          # Serviços (WhatsApp, Socket.IO)
│   ├── routes/            # Rotas da API
│   ├── middleware/        # Middlewares
│   ├── models/            # Modelos de dados
│   └── config/            # Configurações
├── public/                # Interface web
│   ├── css/              # Estilos
│   ├── js/               # JavaScript
│   ├── index.html        # Dashboard principal
│   ├── login.html        # Página de login
│   └── socket-test.html  # Teste Socket.IO
├── tokens/               # Tokens de sessão WhatsApp
├── docker-compose.yml    # Configuração Docker
└── package.json         # Dependências
```

## 🔧 Configuração Avançada

### Variáveis de Ambiente

```env
PORT=3333
NODE_ENV=production
BOT_ATIVO=S
CORS_ORIGIN=*
```

### Configuração do Socket.IO

```javascript
// src/config/socket.config.js
module.exports = {
  events: {
    CONNECTION: 'connection',
    DISCONNECT: 'disconnect',
    WHATSAPP_QR_CODE: 'whatsappQR',
    WHATSAPP_CONNECTED: 'whatsappConnected',
    WHATSAPP_DISCONNECTED: 'whatsappDisconnected',
    WHATSAPP_MESSAGE: 'whatsappMessage'
  },
  defaultRooms: {
    WHATSAPP: 'whatsapp-room',
    GENERAL: 'general-room',
    NOTIFICATIONS: 'notifications-room'
  }
};
```

## 🐛 Troubleshooting

### WhatsApp não conecta
1. Verifique se o QR Code foi escaneado corretamente
2. Certifique-se de que o WhatsApp Web está funcionando
3. Verifique os logs: `docker logs dynamuszap-api`

### Socket.IO não funciona
1. Verifique se a porta 3000 está acessível
2. Confirme se o CORS está configurado corretamente
3. Teste a conexão em http://localhost:3000/socket-test.html

### Problemas de Performance
1. Ajuste o delay entre mensagens em massa
2. Monitore o uso de memória
3. Considere usar múltiplas sessões para alto volume

## 📝 Logs e Monitoramento

### Visualizar Logs
```bash
# Logs em tempo real
docker logs -f dynamuszap-api

# Logs específicos
docker logs dynamuszap-api | grep "WhatsApp"
```

### Interface de Logs
- Acesse a seção "Logs" no dashboard
- Filtre por nível (info, warning, error, success)
- Exporte logs para arquivo

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 🆘 Suporte

- Documentação: http://localhost:3000/api-docs
- Issues: GitHub Issues
- Teste Socket.IO: http://localhost:3000/socket-test.html

---

**Desenvolvido com ❤️ para automação WhatsApp**