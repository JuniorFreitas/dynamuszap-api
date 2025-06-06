# 🚀 Socket.IO - Comunicação em Tempo Real

## 📋 Visão Geral

O Socket.IO foi implementado para fornecer **comunicação em tempo real** entre o servidor e clientes, permitindo monitoramento ao vivo de:

- ✅ **QR Codes** - Receba QR codes instantaneamente
- ✅ **Status das Sessões** - Monitore conexões em tempo real  
- ✅ **Reconexões Automáticas** - Acompanhe tentativas de recuperação
- ✅ **Mensagens** - Veja mensagens enviadas/recebidas ao vivo
- ✅ **Erros** - Notificações instantâneas de problemas
- ✅ **Health Checks** - Monitoramento contínuo da saúde das sessões

## 🌐 Acesso

### 🎯 **Demo Interativa**
Acesse: **http://localhost:3333** para ver a interface de demonstração

### 🔌 **Endpoint Socket.IO**
Conecte em: **http://localhost:3333** (mesmo endereço da API)

### 📊 **Estatísticas**
API: `GET /api/whatsapp/socket/stats`

## 📡 Eventos Disponíveis

### 🔄 **Eventos do Cliente → Servidor**

```javascript
// Inscrever-se em uma sessão específica
socket.emit('subscribe-session', 'sessionName');

// Desinscrever-se de uma sessão
socket.emit('unsubscribe-session', 'sessionName');

// Solicitar status de todas as sessões
socket.emit('get-all-sessions');

// Solicitar status de uma sessão específica
socket.emit('get-session-status', 'sessionName');
```

### 📨 **Eventos do Servidor → Cliente**

#### **🎉 Conexão**
```javascript
socket.on('welcome', (data) => {
  console.log('Conectado!', data.message);
  console.log('Socket ID:', data.socketId);
  console.log('Eventos disponíveis:', data.availableEvents);
});
```

#### **📱 QR Codes**
```javascript
// QR Code para sessão específica (apenas inscritos)
socket.on('qr-code', (data) => {
  console.log('QR Code para', data.sessionName);
  document.getElementById('qr').src = data.qrCode;
});

// QR Code broadcast (todos os clientes)
socket.on('qr-code-broadcast', (data) => {
  console.log('QR Code broadcast:', data.sessionName);
});
```

#### **🔄 Status das Sessões**
```javascript
// Mudança de status
socket.on('session-status-change', (data) => {
  console.log(`Sessão ${data.sessionName}: ${data.status}`);
});

// Sessão conectada
socket.on('session-connected', (data) => {
  console.log(`✅ ${data.sessionName} conectada!`);
});

// Reconectando
socket.on('session-reconnecting', (data) => {
  console.log(`🔄 ${data.sessionName} reconectando...`);
  console.log(`Tentativa ${data.attempt}/${data.maxAttempts}`);
});
```

#### **❌ Erros**
```javascript
// Erro na sessão
socket.on('session-error', (data) => {
  console.log(`❌ Erro em ${data.sessionName}:`, data.error.message);
  console.log('Crítico:', data.error.critical);
});

// Erro geral
socket.on('error', (data) => {
  console.log('❌ Erro:', data.message);
});
```

#### **💬 Mensagens**
```javascript
// Mensagem recebida
socket.on('message-received', (data) => {
  console.log(`📨 ${data.sessionName} recebeu de ${data.message.from}:`);
  console.log(data.message.body);
});

// Mensagem enviada
socket.on('message-sent', (data) => {
  console.log(`📤 ${data.sessionName} enviou para ${data.to}:`);
  console.log(data.message);
});
```

#### **🏥 Health Check**
```javascript
socket.on('session-health-check', (data) => {
  const status = data.healthy ? '✅' : '❌';
  console.log(`${status} ${data.sessionName}: ${data.reason}`);
});
```

#### **📊 Estatísticas**
```javascript
socket.on('all-sessions-status', (data) => {
  console.log(`📊 ${data.totalSessions} sessões ativas`);
  data.sessions.forEach(session => {
    console.log(`- ${session.sessionName}: ${session.healthy ? '✅' : '❌'}`);
  });
});
```

## 💻 Exemplos de Uso

### 🔌 **Conexão Básica**

```html
<!DOCTYPE html>
<html>
<head>
    <script src="/socket.io/socket.io.js"></script>
</head>
<body>
    <script>
        const socket = io();
        
        socket.on('connect', () => {
            console.log('Conectado!');
        });
        
        socket.on('welcome', (data) => {
            console.log('Bem-vindo:', data.message);
        });
    </script>
</body>
</html>
```

### 📱 **Monitor de QR Code**

```javascript
const socket = io();

// Inscrever-se em uma sessão
socket.emit('subscribe-session', 'meuBot');

// Escutar QR codes
socket.on('qr-code', (data) => {
    if (data.sessionName === 'meuBot') {
        document.getElementById('qrcode').src = data.qrCode;
        console.log('QR Code atualizado!');
    }
});

// Escutar quando conectar
socket.on('session-connected', (data) => {
    if (data.sessionName === 'meuBot') {
        document.getElementById('status').textContent = 'Conectado!';
        document.getElementById('qrcode').style.display = 'none';
    }
});
```

### 🔄 **Monitor de Reconexões**

```javascript
const socket = io();

socket.on('session-reconnecting', (data) => {
    const progress = (data.attempt / data.maxAttempts) * 100;
    
    document.getElementById('reconnect-status').innerHTML = `
        <div>🔄 Reconectando ${data.sessionName}...</div>
        <div>Tentativa ${data.attempt}/${data.maxAttempts}</div>
        <div>Próxima tentativa em ${data.delay}ms</div>
        <progress value="${progress}" max="100">${progress}%</progress>
    `;
});

socket.on('session-connected', (data) => {
    document.getElementById('reconnect-status').innerHTML = `
        <div>✅ ${data.sessionName} reconectado com sucesso!</div>
    `;
});
```

### 💬 **Monitor de Mensagens**

```javascript
const socket = io();

// Inscrever em múltiplas sessões
['bot1', 'bot2', 'bot3'].forEach(session => {
    socket.emit('subscribe-session', session);
});

// Monitor de mensagens
socket.on('message-received', (data) => {
    addMessageToLog('received', data);
});

socket.on('message-sent', (data) => {
    addMessageToLog('sent', data);
});

function addMessageToLog(type, data) {
    const log = document.getElementById('message-log');
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.innerHTML = `
        <strong>[${new Date().toLocaleTimeString()}]</strong>
        <span class="session">${data.sessionName}</span>
        <span class="direction">${type === 'sent' ? '📤' : '📨'}</span>
        <span class="content">${type === 'sent' ? data.message : data.message.body}</span>
    `;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
}
```

### 📊 **Dashboard de Monitoramento**

```javascript
const socket = io();

// Solicitar status inicial
socket.emit('get-all-sessions');

// Atualizar dashboard
socket.on('all-sessions-status', (data) => {
    updateDashboard(data);
});

// Escutar mudanças em tempo real
socket.on('session-status-change', (data) => {
    updateSessionStatus(data.sessionName, data.status);
});

socket.on('session-health-check', (data) => {
    updateHealthStatus(data.sessionName, data.healthy, data.reason);
});

function updateDashboard(data) {
    const dashboard = document.getElementById('dashboard');
    dashboard.innerHTML = `
        <h3>📊 Dashboard - ${data.totalSessions} Sessões</h3>
        <div class="sessions-grid">
            ${data.sessions.map(session => `
                <div class="session-card ${session.healthy ? 'healthy' : 'unhealthy'}">
                    <h4>${session.sessionName}</h4>
                    <p>Status: ${session.reason}</p>
                    <p>Saúde: ${session.healthy ? '✅' : '❌'}</p>
                </div>
            `).join('')}
        </div>
    `;
}
```

## 🎯 **Casos de Uso Práticos**

### 1. **🖥️ Dashboard de Monitoramento**
- Monitore todas as sessões em tempo real
- Receba alertas instantâneos de problemas
- Visualize estatísticas de saúde

### 2. **📱 App Mobile de Configuração**
- Receba QR codes instantaneamente
- Configure bots remotamente
- Monitore status de conexão

### 3. **🔔 Sistema de Alertas**
- Notificações push quando sessões caem
- Alertas de reconexão automática
- Monitoramento de mensagens

### 4. **📈 Analytics em Tempo Real**
- Contagem de mensagens por sessão
- Tempo de resposta dos bots
- Estatísticas de uptime

### 5. **🛠️ Ferramentas de Debug**
- Log de eventos em tempo real
- Rastreamento de erros
- Análise de performance

## 🔧 **Configuração Avançada**

### **🎛️ Rooms (Salas)**
O sistema usa rooms para organizar clientes:

```javascript
// Inscrever em sessão específica
socket.emit('subscribe-session', 'sessionName');
// Cliente entra na room: "session:sessionName"

// Eventos são enviados apenas para clientes da room
socket.on('qr-code', (data) => {
    // Apenas clientes inscritos na sessão recebem
});
```

### **📡 Broadcasts vs Targeted**
```javascript
// Targeted (apenas inscritos na sessão)
socket.on('qr-code', (data) => { /* ... */ });

// Broadcast (todos os clientes)
socket.on('qr-code-broadcast', (data) => { /* ... */ });
```

### **🔄 Reconexão Automática**
```javascript
const socket = io({
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    maxReconnectionAttempts: 5
});
```

## 📊 **Monitoramento**

### **📈 Estatísticas da API**
```bash
curl http://localhost:3333/api/whatsapp/socket/stats
```

**Resposta:**
```json
{
  "status": "success",
  "data": {
    "totalConnections": 3,
    "subscriptionsCount": 5,
    "clients": [
      {
        "socketId": "abc123",
        "connectedAt": "2024-01-01T10:00:00Z",
        "subscribedSessions": ["bot1", "bot2"]
      }
    ]
  }
}
```

### **🔍 Debug no Browser**
```javascript
// Habilitar debug do Socket.IO
localStorage.debug = 'socket.io-client:socket';

// Ver eventos em tempo real
socket.onAny((event, ...args) => {
    console.log('Evento recebido:', event, args);
});
```

## 🎉 **Resultado**

Com o Socket.IO implementado, você agora tem:

- ✅ **Comunicação em tempo real** com todos os eventos da API
- ✅ **Interface web interativa** para demonstração e testes
- ✅ **Sistema de rooms** para organizar clientes por sessão
- ✅ **Eventos estruturados** para todos os aspectos do sistema
- ✅ **Monitoramento ao vivo** de QR codes, mensagens e erros
- ✅ **Dashboard em tempo real** para acompanhar todas as sessões

**🚀 Acesse http://localhost:3333 e veja a magia acontecer!** 