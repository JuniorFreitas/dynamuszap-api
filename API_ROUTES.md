# 📡 DynamusZap API - Rotas e Socket.IO

## 🚀 Rotas Implementadas com Socket.IO

### 📱 **Gerenciamento de Sessões**

#### `POST /api/whatsapp/start`
**Criar nova sessão WhatsApp**
- **Body**: `{ "sessionName": "string" }`
- **Socket.IO**: `qr-code`, `session-status-change`, `session-connected`
- **Resposta**: Imediata, QR code via websocket

#### `GET /api/whatsapp/sessions`
**Listar todas as sessões ativas**
- **Resposta**: Lista com status de saúde de cada sessão
- **Socket.IO**: Dados sincronizados em tempo real

#### `GET /api/whatsapp/{sessionName}/status`
**Status de uma sessão específica**
- **Resposta**: Status de saúde da sessão

#### `POST /api/whatsapp/{sessionName}/restart`
**Reiniciar sessão**
- **Socket.IO**: `session-restart-start`, `session-restart-success`, `session-restart-error`
- **Resposta**: Processo assíncrono via websocket

#### `DELETE /api/whatsapp/{sessionName}/remove`
**Remover sessão permanentemente**
- **Socket.IO**: `session-remove-start`, `session-removed`, `session-remove-error`

#### `POST /api/whatsapp/{sessionName}/logout`
**Fazer logout do WhatsApp**
- **Socket.IO**: `session-logout-start`, `session-logout-complete`, `session-logout-error`

---

### 💬 **Envio de Mensagens**

#### `POST /api/whatsapp/{sessionName}/send`
**Enviar mensagem de texto**
- **Body**: `{ "number": "string", "message": "string" }`
- **Socket.IO**: `message-sent`, `message-send-error`
- **Validação**: Número validado em tempo real

#### `POST /api/whatsapp/{sessionName}/send-bulk`
**Envio em massa** ⚡ *NOVO*
- **Body**: 
  ```json
  {
    "recipients": ["5511999999999", "5511888888888"],
    "message": "string",
    "delay": 1000
  }
  ```
- **Socket.IO**: 
  - `bulk-send-start` - Início do processo
  - `bulk-send-progress` - Progresso em tempo real
  - `bulk-send-complete` - Conclusão com estatísticas
  - `bulk-send-error` - Erros durante o processo
- **Features**: 
  - Progresso em tempo real
  - Controle de delay entre mensagens
  - Estatísticas de sucesso/erro
  - Não trava a interface

#### `POST /api/whatsapp/{sessionName}/check-number`
**Validar número WhatsApp**
- **Body**: `{ "number": "string" }`
- **Resposta**: Status de validade do número

---

### 📎 **Envio de Arquivos**

#### `POST /api/whatsapp/{sessionName}/send-image`
**Enviar imagem**
- **Body**: 
  ```json
  {
    "number": "string",
    "base64Image": "string",
    "caption": "string"
  }
  ```
- **Socket.IO**: `file-send-start`, `file-send-success`, `file-send-error`

#### `POST /api/whatsapp/{sessionName}/send-pdf`
**Enviar PDF**
- **Body**: 
  ```json
  {
    "number": "string",
    "base64PDF": "string",
    "fileName": "string",
    "message": "string"
  }
  ```
- **Socket.IO**: `file-send-start`, `file-send-success`, `file-send-error`

---

### 👤 **Informações da Conta** ⚡ *NOVO*

#### `GET /api/whatsapp/{sessionName}/profile`
**Obter informações do perfil**
- **Socket.IO**: `profile-fetched`
- **Resposta**: Dados do dispositivo/perfil

#### `GET /api/whatsapp/{sessionName}/contacts`
**Listar contatos**
- **Socket.IO**: `contacts-fetched`
- **Resposta**: Lista de contatos (limitada a 100)

#### `GET /api/whatsapp/{sessionName}/chats`
**Listar conversas ativas**
- **Socket.IO**: `chats-fetched`
- **Resposta**: Lista de conversas (limitada a 50)

---

### 📊 **Monitoramento e Saúde** ⚡ *NOVO*

#### `GET /api/whatsapp/health`
**Status geral da API**
- **Socket.IO**: `api-health-check`, `api-health-error`
- **Resposta**: 
  ```json
  {
    "status": "healthy",
    "uptime": 3600,
    "memory": {...},
    "sessions": {
      "total": 5,
      "healthy": 4,
      "unhealthy": 1
    },
    "socket": {...}
  }
  ```

#### `GET /api/whatsapp/socket/stats`
**Estatísticas do Socket.IO**
- **Resposta**: Informações de conexões ativas, subscrições, etc.

---

## 🔗 **Eventos Socket.IO em Tempo Real**

### 📱 **Eventos de Sessão**
- `qr-code` - QR code gerado
- `qr-code-broadcast` - QR code para todos os clientes
- `session-status-change` - Mudança de status
- `session-connected` - Sessão conectada
- `session-error` - Erro na sessão
- `session-reconnecting` - Reconectando
- `session-health-check` - Verificação de saúde

### 🔄 **Eventos de Restart/Remove**
- `session-restart-start` - Início do restart
- `session-restart-success` - Restart concluído
- `session-restart-error` - Erro no restart
- `session-remove-start` - Início da remoção
- `session-removed` - Sessão removida
- `session-remove-error` - Erro na remoção
- `session-logout-start` - Início do logout
- `session-logout-complete` - Logout concluído
- `session-logout-error` - Erro no logout

### 💬 **Eventos de Mensagem**
- `message-received` - Mensagem recebida
- `message-sent` - Mensagem enviada
- `message-send-error` - Erro no envio

### 📤 **Eventos de Envio em Massa**
- `bulk-send-start` - Início do envio em massa
- `bulk-send-progress` - Progresso (atual/total)
- `bulk-send-complete` - Envio concluído
- `bulk-send-error` - Erro no envio em massa

### 📎 **Eventos de Arquivo**
- `file-send-start` - Início do envio de arquivo
- `file-send-success` - Arquivo enviado
- `file-send-error` - Erro no envio de arquivo

### 📊 **Eventos de Sistema**
- `api-health-check` - Verificação de saúde da API
- `api-health-error` - Erro na API
- `profile-fetched` - Perfil obtido
- `contacts-fetched` - Contatos obtidos
- `chats-fetched` - Conversas obtidas

---

## 🎯 **Como Usar Socket.IO**

### 📝 **Conectar e Subscrever**
```javascript
const socket = io();

// Subscrever a uma sessão específica
socket.emit('subscribe-session', 'minha-sessao');

// Escutar QR codes
socket.on('qr-code', (data) => {
    console.log('QR Code para', data.sessionName);
    displayQRCode(data.qrCode);
});

// Escutar status de sessão
socket.on('session-connected', (data) => {
    console.log('Sessão conectada:', data.sessionName);
});
```

### 📊 **Monitorar Envio em Massa**
```javascript
// Progresso em tempo real
socket.on('bulk-send-progress', (data) => {
    console.log(`${data.current}/${data.total} - ${data.currentNumber}`);
    updateProgressBar(data.current, data.total);
});

// Conclusão
socket.on('bulk-send-complete', (data) => {
    console.log(`Concluído: ${data.successCount} sucessos, ${data.errorCount} erros`);
});
```

### 🎮 **Eventos Disponíveis**
```javascript
// Obter todos os eventos disponíveis
socket.on('welcome', (data) => {
    console.log('Eventos:', data.availableEvents);
});

// Obter status de todas as sessões
socket.emit('get-all-sessions');
socket.on('all-sessions-status', (data) => {
    console.log('Sessões:', data.sessions);
});
```

---

## 🚀 **Páginas Web Disponíveis**

### 🏠 `/index.html`
**Página principal** - Demo básico do Socket.IO

### 📱 `/sessions.html`
**Gerenciador de Sessões** - Interface completa para:
- ✅ Criar sessões com QR code em tempo real
- ✅ Monitorar sessões ativas
- ✅ Reiniciar/remover sessões
- ✅ Log de eventos em tempo real
- ✅ Interface moderna e responsiva

### 🧪 `/api-test.html` ⚡ *NOVO*
**Testador de APIs** - Interface para testar todas as funcionalidades:
- ✅ Enviar mensagens individuais
- ✅ Envio em massa com progresso
- ✅ Upload de arquivos (imagem/PDF)
- ✅ Gerenciar sessões
- ✅ Obter informações da conta
- ✅ Monitorar saúde da API
- ✅ Log completo em tempo real

### 📚 `/api-docs`
**Documentação Swagger** - Documentação interativa das APIs

---

## ⚡ **Melhorias Implementadas**

### 🚫 **Sem Travamento**
- ✅ Respostas HTTP imediatas
- ✅ QR codes via Socket.IO assíncrono
- ✅ Interface reativa e não bloqueante
- ✅ Operações em background

### 🎨 **Interface Moderna**
- ✅ Design glassmorphism
- ✅ Animações suaves
- ✅ Notificações toast
- ✅ Responsivo para mobile

### 📊 **Monitoramento Avançado**
- ✅ Health check da API
- ✅ Estatísticas do Socket.IO
- ✅ Log estruturado em tempo real
- ✅ Progresso de operações

### 🔒 **Validação Robusta**
- ✅ Validação de entrada completa
- ✅ Tratamento de erros avançado
- ✅ Feedback visual em tempo real
- ✅ Prevenção de ações inválidas

### 🚀 **Performance**
- ✅ Auto-refresh inteligente
- ✅ Limitação de resultados para não sobrecarregar
- ✅ Otimização de Socket.IO
- ✅ Cleanup automático de recursos

---

## 🔧 **Configuração Recomendada**

### 📡 **Socket.IO Client**
```javascript
const socket = io({
    transports: ['websocket', 'polling'],
    timeout: 10000,
    forceNew: true
});
```

### ⚙️ **Variáveis de Ambiente**
```env
PORT=3000
SESSION_MAX_RECONNECT_ATTEMPTS=5
SESSION_RECONNECT_DELAY=10000
SESSION_HEALTH_CHECK_INTERVAL=30000
BOT_ATIVO=S
```

### 🎯 **Rate Limiting**
- Aplicado automaticamente em `/api/`
- Configurável via middleware

---

## 🎉 **Resumo das Funcionalidades**

✅ **12 rotas** completamente integradas com Socket.IO  
✅ **20+ eventos** Socket.IO em tempo real  
✅ **3 interfaces web** modernas e funcionais  
✅ **Envio em massa** com progresso em tempo real  
✅ **Gerenciamento completo** de sessões  
✅ **Upload de arquivos** (imagem/PDF)  
✅ **Monitoramento** de saúde da API  
✅ **Documentação** completa e interativa  

Todas as operações são **assíncronas**, **não travantes** e com **feedback visual em tempo real**! 🚀 