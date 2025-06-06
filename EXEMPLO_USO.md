# Exemplos Práticos de Uso - DynamusZap API

Este documento contém exemplos práticos de como usar a DynamusZap API para automação do WhatsApp.

## 🚀 Início Rápido

### 1. Conectar WhatsApp

Primeiro, você precisa conectar sua conta WhatsApp:

```bash
# Conectar WhatsApp
curl -X POST http://localhost:3000/api/whatsapp/connect \
  -H "Content-Type: application/json" \
  -d '{"sessionName": "default"}'
```

### 2. Gerar QR Code

Se precisar gerar um novo QR Code:

```bash
curl -X POST http://localhost:3000/api/whatsapp/qr-code \
  -H "Content-Type: application/json" \
  -d '{"sessionName": "default"}'
```

### 3. Verificar Status

```bash
curl http://localhost:3000/api/whatsapp/status?sessionName=default
```

## 📨 Exemplos de Envio de Mensagens

### Mensagem Simples

```bash
curl -X POST http://localhost:3000/api/whatsapp/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "number": "5511999999999",
    "message": "Olá! Esta é uma mensagem de teste da DynamusZap API.",
    "sessionName": "default"
  }'
```

### Mensagem com Emojis

```bash
curl -X POST http://localhost:3000/api/whatsapp/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "number": "5511999999999",
    "message": "🚀 Bem-vindo à DynamusZap API! 🎉\n\nSua automação WhatsApp está funcionando perfeitamente! ✅",
    "sessionName": "default"
  }'
```

### Envio em Massa

```bash
curl -X POST http://localhost:3000/api/whatsapp/send-bulk-message \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumbers": [
      "5511999999999",
      "5511888888888",
      "5511777777777"
    ],
    "message": "📢 Mensagem em massa!\n\nEsta mensagem foi enviada para múltiplos contatos usando a DynamusZap API.",
    "delay": 2000,
    "sessionName": "default"
  }'
```

## 🔌 Exemplos com Socket.IO

### Cliente JavaScript Básico

```html
<!DOCTYPE html>
<html>
<head>
    <title>DynamusZap - Socket.IO Test</title>
    <script src="/socket.io/socket.io.js"></script>
</head>
<body>
    <div id="status">Conectando...</div>
    <div id="qr-code"></div>
    <div id="messages"></div>

    <script>
        const socket = io();

        // Conectar
        socket.on('connect', () => {
            document.getElementById('status').textContent = 'Conectado!';
            
            // Entrar na sala do WhatsApp
            socket.emit('joinRoom', 'whatsapp-room');
        });

        // QR Code recebido
        socket.on('whatsappQR', (data) => {
            const qrDiv = document.getElementById('qr-code');
            qrDiv.innerHTML = `<img src="${data.qrCode}" alt="QR Code">`;
        });

        // WhatsApp conectado
        socket.on('whatsappConnected', (data) => {
            document.getElementById('status').textContent = 'WhatsApp Conectado!';
            document.getElementById('qr-code').innerHTML = '<p>✅ WhatsApp conectado com sucesso!</p>';
        });

        // Nova mensagem recebida
        socket.on('whatsappMessage', (data) => {
            const messagesDiv = document.getElementById('messages');
            messagesDiv.innerHTML += `<p><strong>${data.from}:</strong> ${data.body}</p>`;
        });
    </script>
</body>
</html>
```

### Cliente Node.js

```javascript
const io = require('socket.io-client');

// Conectar ao servidor
const socket = io('http://localhost:3000');

socket.on('connect', () => {
    console.log('Conectado ao servidor!');
    
    // Entrar na sala do WhatsApp
    socket.emit('joinRoom', 'whatsapp-room');
});

// Escutar QR Code
socket.on('whatsappQR', (data) => {
    console.log('QR Code recebido!');
    // Aqui você pode salvar o QR Code ou exibi-lo
});

// WhatsApp conectado
socket.on('whatsappConnected', (data) => {
    console.log('WhatsApp conectado:', data);
});

// Nova mensagem
socket.on('whatsappMessage', (data) => {
    console.log(`Nova mensagem de ${data.from}: ${data.body}`);
});

// Desconectar
socket.on('disconnect', () => {
    console.log('Desconectado do servidor');
});
```

## 🤖 Automação Avançada

### Script Python para Envio Automático

```python
import requests
import time
import json

class DynamusZapAPI:
    def __init__(self, base_url="http://localhost:3000"):
        self.base_url = base_url
        self.session_name = "default"
    
    def connect_whatsapp(self):
        """Conectar WhatsApp"""
        url = f"{self.base_url}/api/whatsapp/connect"
        data = {"sessionName": self.session_name}
        
        response = requests.post(url, json=data)
        return response.json()
    
    def get_status(self):
        """Verificar status da conexão"""
        url = f"{self.base_url}/api/whatsapp/status"
        params = {"sessionName": self.session_name}
        
        response = requests.get(url, params=params)
        return response.json()
    
    def send_message(self, number, message):
        """Enviar mensagem individual"""
        url = f"{self.base_url}/api/whatsapp/send-message"
        data = {
            "number": number,
            "message": message,
            "sessionName": self.session_name
        }
        
        response = requests.post(url, json=data)
        return response.json()
    
    def send_bulk_message(self, phone_numbers, message, delay=2000):
        """Enviar mensagem em massa"""
        url = f"{self.base_url}/api/whatsapp/send-bulk-message"
        data = {
            "phoneNumbers": phone_numbers,
            "message": message,
            "delay": delay,
            "sessionName": self.session_name
        }
        
        response = requests.post(url, json=data)
        return response.json()

# Exemplo de uso
if __name__ == "__main__":
    api = DynamusZapAPI()
    
    # Conectar WhatsApp
    print("Conectando WhatsApp...")
    result = api.connect_whatsapp()
    print(f"Resultado: {result}")
    
    # Aguardar conexão
    time.sleep(10)
    
    # Verificar status
    status = api.get_status()
    print(f"Status: {status}")
    
    # Enviar mensagem
    if status.get('data', {}).get('connected'):
        message_result = api.send_message(
            "5511999999999",
            "🤖 Mensagem automática enviada via Python!"
        )
        print(f"Mensagem enviada: {message_result}")
```

### Script Node.js para Monitoramento

```javascript
const axios = require('axios');
const io = require('socket.io-client');

class WhatsAppMonitor {
    constructor(apiUrl = 'http://localhost:3000') {
        this.apiUrl = apiUrl;
        this.socket = io(apiUrl);
        this.setupSocketEvents();
    }

    setupSocketEvents() {
        this.socket.on('connect', () => {
            console.log('📡 Conectado ao servidor');
            this.socket.emit('joinRoom', 'whatsapp-room');
        });

        this.socket.on('whatsappConnected', (data) => {
            console.log('✅ WhatsApp conectado:', data);
            this.onWhatsAppConnected(data);
        });

        this.socket.on('whatsappMessage', (data) => {
            console.log('📨 Nova mensagem:', data);
            this.onNewMessage(data);
        });

        this.socket.on('whatsappDisconnected', () => {
            console.log('❌ WhatsApp desconectado');
            this.onWhatsAppDisconnected();
        });
    }

    async onWhatsAppConnected(data) {
        // Enviar mensagem de boas-vindas
        await this.sendWelcomeMessage();
    }

    async onNewMessage(data) {
        // Resposta automática para mensagens específicas
        if (data.body.toLowerCase().includes('oi') || data.body.toLowerCase().includes('olá')) {
            await this.sendAutoReply(data.from);
        }
    }

    async onWhatsAppDisconnected() {
        // Tentar reconectar automaticamente
        setTimeout(() => {
            this.reconnectWhatsApp();
        }, 5000);
    }

    async sendWelcomeMessage() {
        const message = `🎉 Sistema DynamusZap ativo!
        
✅ WhatsApp conectado com sucesso
🤖 Respostas automáticas ativadas
📊 Monitoramento em tempo real

Digite "ajuda" para ver os comandos disponíveis.`;

        // Aqui você enviaria para um número específico de administrador
        // await this.sendMessage('5511999999999', message);
    }

    async sendAutoReply(to) {
        const message = `Olá! 👋

Obrigado por entrar em contato. Esta é uma resposta automática.

Nossa equipe retornará em breve!`;

        await this.sendMessage(to.replace('@c.us', ''), message);
    }

    async sendMessage(number, message) {
        try {
            const response = await axios.post(`${this.apiUrl}/api/whatsapp/send-message`, {
                number,
                message,
                sessionName: 'default'
            });
            
            console.log('✅ Mensagem enviada:', response.data);
            return response.data;
        } catch (error) {
            console.error('❌ Erro ao enviar mensagem:', error.message);
        }
    }

    async reconnectWhatsApp() {
        try {
            console.log('🔄 Tentando reconectar WhatsApp...');
            const response = await axios.post(`${this.apiUrl}/api/whatsapp/connect`, {
                sessionName: 'default'
            });
            
            console.log('Resultado da reconexão:', response.data);
        } catch (error) {
            console.error('❌ Erro na reconexão:', error.message);
        }
    }
}

// Iniciar monitor
const monitor = new WhatsAppMonitor();
console.log('🚀 Monitor WhatsApp iniciado!');
```

## 📊 Monitoramento e Estatísticas

### Obter Estatísticas do Socket.IO

```bash
curl http://localhost:3000/api/socket/stats
```

### Enviar Notificação para Todos

```bash
curl -X POST http://localhost:3000/api/socket/notification \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Sistema atualizado com sucesso!",
    "type": "success"
  }'
```

### Broadcast para Sala Específica

```bash
curl -X POST http://localhost:3000/api/socket/broadcast \
  -H "Content-Type: application/json" \
  -d '{
    "event": "customEvent",
    "data": {"message": "Evento personalizado"},
    "room": "whatsapp-room"
  }'
```

## 🔧 Integração com Webhooks

### Webhook para Receber Mensagens

```javascript
const express = require('express');
const app = express();

app.use(express.json());

// Endpoint para receber webhooks
app.post('/webhook/whatsapp', (req, res) => {
    const { from, body, timestamp } = req.body;
    
    console.log(`Nova mensagem de ${from}: ${body}`);
    
    // Processar mensagem
    processMessage(from, body);
    
    res.json({ status: 'received' });
});

function processMessage(from, message) {
    // Lógica para processar mensagens recebidas
    if (message.toLowerCase().includes('pedido')) {
        // Processar pedido
        console.log('Processando pedido...');
    }
}

app.listen(3001, () => {
    console.log('Webhook server rodando na porta 3001');
});
```

## 🎯 Casos de Uso Práticos

### 1. Sistema de Atendimento

```javascript
// Resposta automática baseada em palavras-chave
const autoResponses = {
    'horario': 'Nosso horário de funcionamento é de segunda a sexta, das 8h às 18h.',
    'preço': 'Para informações sobre preços, entre em contato com nossa equipe comercial.',
    'suporte': 'Você foi direcionado para o suporte técnico. Aguarde um momento.',
    'vendas': 'Você foi direcionado para o setor de vendas. Em breve entraremos em contato.'
};

function handleMessage(from, message) {
    const lowerMessage = message.toLowerCase();
    
    for (const [keyword, response] of Object.entries(autoResponses)) {
        if (lowerMessage.includes(keyword)) {
            sendMessage(from, response);
            break;
        }
    }
}
```

### 2. Notificações de Sistema

```javascript
// Enviar notificações de sistema
async function sendSystemNotification(type, message) {
    const adminNumbers = ['5511999999999', '5511888888888'];
    
    const notification = `🔔 NOTIFICAÇÃO DO SISTEMA
    
Tipo: ${type.toUpperCase()}
Mensagem: ${message}
Horário: ${new Date().toLocaleString()}

---
Sistema DynamusZap`;

    for (const number of adminNumbers) {
        await sendMessage(number, notification);
    }
}

// Uso
sendSystemNotification('error', 'Falha na conexão com banco de dados');
sendSystemNotification('success', 'Backup realizado com sucesso');
```

### 3. Marketing Automatizado

```javascript
// Campanha de marketing segmentada
async function sendMarketingCampaign() {
    const customers = [
        { number: '5511999999999', name: 'João', segment: 'premium' },
        { number: '5511888888888', name: 'Maria', segment: 'regular' }
    ];
    
    for (const customer of customers) {
        const message = getPersonalizedMessage(customer);
        await sendMessage(customer.number, message);
        
        // Delay entre envios
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
}

function getPersonalizedMessage(customer) {
    const messages = {
        premium: `Olá ${customer.name}! 🌟
        
Como cliente premium, você tem 20% de desconto em todos os produtos!
        
Aproveite esta oferta exclusiva até o final do mês.`,
        
        regular: `Oi ${customer.name}! 😊
        
Temos uma promoção especial para você: 10% de desconto na primeira compra!
        
Não perca esta oportunidade!`
    };
    
    return messages[customer.segment] || messages.regular;
}
```

## 🚨 Tratamento de Erros

```javascript
async function sendMessageWithRetry(number, message, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await sendMessage(number, message);
            
            if (result.status === 'success') {
                console.log(`✅ Mensagem enviada na tentativa ${attempt}`);
                return result;
            }
        } catch (error) {
            console.log(`❌ Tentativa ${attempt} falhou:`, error.message);
            
            if (attempt === maxRetries) {
                throw new Error(`Falha após ${maxRetries} tentativas`);
            }
            
            // Aguardar antes da próxima tentativa
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
    }
}
```

---

## 📚 Recursos Adicionais

- **Documentação Swagger**: http://localhost:3000/api-docs
- **Interface de Teste**: http://localhost:3000/socket-test.html
- **Dashboard Principal**: http://localhost:3000

Para mais exemplos e documentação detalhada, consulte o README.md principal do projeto. 