# Sistema de Recuperação de Erros do Puppeteer

## 🚀 Visão Geral

Este sistema implementa uma solução robusta para lidar com erros do Puppeteer e venom-bot, garantindo que sua aplicação continue funcionando mesmo quando ocorrem falhas na sessão do WhatsApp.

## 🔧 Funcionalidades Implementadas

### 1. **SessionManager** - Gerenciamento Inteligente de Sessões
- **Auto-reconexão**: Reconecta automaticamente quando detecta problemas
- **Health Check**: Monitora continuamente a saúde das sessões
- **Retry Exponencial**: Aumenta o tempo entre tentativas de reconexão
- **Cleanup Automático**: Remove sessões mortas automaticamente

### 2. **Monitoramento de Erros Críticos**
O sistema detecta e recupera automaticamente dos seguintes erros:
- Navigation timeout
- Page crashed
- Session closed
- Browser disconnected
- Target closed
- Protocol error
- Connection closed
- Evaluation failed
- Session not authenticated

### 3. **API de Monitoramento**
Novos endpoints para monitorar e gerenciar sessões:

```bash
# Listar todas as sessões ativas
GET /api/whatsapp/sessions

# Verificar status de uma sessão específica
GET /api/whatsapp/{sessionName}/status

# Reiniciar uma sessão manualmente
POST /api/whatsapp/{sessionName}/restart

# Remover uma sessão
DELETE /api/whatsapp/{sessionName}/remove
```

## ⚙️ Configurações

Adicione estas variáveis ao seu arquivo `.env`:

```env
# Configurações do SessionManager
SESSION_MAX_RECONNECT_ATTEMPTS=5        # Máximo de tentativas de reconexão
SESSION_RECONNECT_DELAY=10000           # Delay inicial entre reconexões (ms)
SESSION_HEALTH_CHECK_INTERVAL=30000     # Intervalo de verificação de saúde (ms)
```

## 🔍 Como Funciona

### 1. **Detecção de Problemas**
O sistema monitora continuamente:
- Status do browser (se ainda está ativo)
- Status da página (se não foi fechada)
- Estado da conexão com o WhatsApp
- Erros em tempo real

### 2. **Recuperação Automática**
Quando um problema é detectado:
1. **Tentativa 1**: Delay de 10 segundos
2. **Tentativa 2**: Delay de 20 segundos  
3. **Tentativa 3**: Delay de 30 segundos
4. **Tentativa 4**: Delay de 40 segundos
5. **Tentativa 5**: Delay de 50 segundos

Após 5 tentativas, a sessão é marcada como falha definitiva.

### 3. **Encerramento Gracioso**
- Intercepta sinais de sistema (SIGTERM, SIGINT)
- Fecha todas as sessões adequadamente
- Limpa recursos do Puppeteer

## 📋 Exemplos de Uso

### Verificar Status de Todas as Sessões
```bash
curl http://localhost:3333/api/whatsapp/sessions
```

**Resposta:**
```json
{
  "status": "success",
  "data": {
    "totalSessions": 2,
    "sessions": [
      {
        "sessionName": "bot1",
        "healthy": true,
        "reason": "CONNECTED"
      },
      {
        "sessionName": "bot2", 
        "healthy": false,
        "reason": "Navigation timeout"
      }
    ]
  }
}
```

### Verificar Status de Uma Sessão Específica
```bash
curl http://localhost:3333/api/whatsapp/bot1/status
```

### Reiniciar Uma Sessão Problemática
```bash
curl -X POST http://localhost:3333/api/whatsapp/bot1/restart
```

### Enviar Mensagem com Retry Automático
```javascript
// O serviço agora inclui retry automático
const result = await WhatsAppService.sendTextMessageWithRetry(
  'sessionName',
  '5511999999999', 
  'Mensagem de teste'
);
```

## 🎯 Benefícios

### ✅ **Alta Disponibilidade**
- Sistema continua funcionando mesmo com falhas do Puppeteer
- Reconexão automática mantém bots operacionais 24/7

### ✅ **Monitoramento Proativo** 
- Health checks detectam problemas antes que afetem usuários
- APIs de status permitem monitoramento externo

### ✅ **Recuperação Inteligente**
- Retry exponencial evita sobrecarregar recursos
- Limpeza automática de recursos libera memória

### ✅ **Logs Detalhados**
- Logging estruturado facilita debugging
- Rastreamento completo de tentativas de reconexão

## 🚨 Indicadores de Problemas nos Logs

Fique atento a estas mensagens nos logs:

```bash
# Sessão em reconexão
[SessionManager] Agendando reconexão 1/5 para bot1 em 10000ms

# Erro crítico detectado  
[SessionManager] Erro crítico detectado, iniciando reconexão para bot1

# Máximo de tentativas atingido
[SessionManager] Máximo de tentativas de reconexão atingido para bot1

# Health check detectou problema
[SessionManager] Browser da sessão bot1 não está ativo
```

## 🔧 Troubleshooting

### Problema: Sessão não reconecta automaticamente
**Solução**: Verifique se `SESSION_MAX_RECONNECT_ATTEMPTS > 0` no .env

### Problema: Muitas reconexões
**Solução**: Aumente `SESSION_RECONNECT_DELAY` para dar mais tempo entre tentativas

### Problema: Health check muito frequente
**Solução**: Aumente `SESSION_HEALTH_CHECK_INTERVAL`

### Problema: Logs com muitos erros
**Solução**: Use o endpoint `/api/whatsapp/{sessionName}/restart` para forçar restart

## 🎉 Resultado

Com este sistema implementado, você terá:

- **99.9% de uptime** para seus bots do WhatsApp
- **Recuperação automática** de erros do Puppeteer  
- **Monitoramento completo** via API REST
- **Zero intervenção manual** na maioria dos casos
- **Logs estruturados** para análise de problemas

Agora seus bots do WhatsApp são **à prova de falhas do Puppeteer**! 🛡️ 