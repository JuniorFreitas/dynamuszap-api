# 🔐 Sistema de Autenticação Frontend - DynamusZap

## 📋 Visão Geral

Sistema completo de autenticação JWT implementado para proteger todas as páginas frontend do DynamusZap API, com integração automática entre backend e frontend.

## 🎯 Funcionalidades Implementadas

### ✅ Autenticação JWT
- Login com usuário e senha
- Tokens de acesso e refresh automáticos
- Renovação automática de tokens
- Logout seguro

### ✅ Proteção de Rotas
- Middleware de proteção automática
- Redirecionamento para login quando não autenticado
- Verificação de token em tempo real

### ✅ Interface de Usuario
- Página de login moderna e responsiva
- Indicador visual de status de autenticação
- Mensagens de erro e sucesso

### ✅ Proteção Universal
- Todas as páginas HTML protegidas (exceto login.html)
- Sistema `authenticatedFetch()` para todas as requisições
- Indicadores visuais de status de autenticação
- Logout seguro

### ✅ Login Seguro
- Interface moderna e responsiva
- Indicador visual de status de autenticação
- Mensagens de erro e sucesso

### ✅ Refresh Automático
- Tokens renovados automaticamente 2min antes do vencimento
- Sistema de retry em caso de falha na renovação
- Logout automático se renovação falhar

### ✅ Autenticação Transparente
- Sistema `authenticatedFetch()` para todas as requisições
- Verificação automática de expiração
- Limpeza de tokens no logout
- Redirecionamento seguro para login

### ✅ Indicadores Visuais
- Status de autenticação em tempo real
- Indicador visual de status de autenticação

### ✅ Logout Seguro
- Limpeza completa de tokens
- Verificação automática de expiração
- Redirecionamento seguro para login

### ✅ Compatibilidade
- Mantém suporte a API Keys existentes
- Verificação automática de expiração
- Limpeza de tokens no logout
- Redirecionamento seguro para login

### ✅ Limpeza Automática de Tokens
- **Remoção Automática**: Pasta `tokens/{sessionName}` removida automaticamente quando sessão é excluída
- **Limpeza Completa**: Remove todos os arquivos e subpastas da sessão
- **Segurança**: Processo não interrompe limpeza da sessão mesmo se houver erro na remoção de tokens
- **Logs Detalhados**: Registra todas as operações de limpeza de tokens

## 📁 Arquivos Implementados

### 🆕 Novos Arquivos

1. **`public/login.html`** - Página de login
2. **`public/js/auth.js`** - Manager de autenticação JavaScript
3. **`AUTH_FRONTEND_GUIDE.md`** - Esta documentação

### 🔧 Arquivos Modificados

1. **`src/routes/whatsapp.routes.js`** - Protegido com middleware `flexibleAuth`
2. **`public/index.html`** - Adicionado indicador de autenticação
3. **`public/sessions.html`** - Protegido e usando requisições autenticadas
4. **`public/api-test.html`** - Protegido e usando requisições autenticadas

## 🚀 Como Usar

### 1. Fazer Login
- Acesse `/login.html`
- Use as credenciais configuradas em `APP_CONFIG`:
  - Username: `admin` (padrão)
  - Password: `admin@password` (padrão)
- Marque "Lembrar-me" para persistir a sessão

### 2. Páginas Protegidas
**TODAS** as páginas agora requerem autenticação, exceto:
- `/login.html` - Página de login (única não protegida)

**Páginas protegidas:**
- `/` - Página inicial (index.html)
- `/index.html` - Página principal
- `/sessions.html` - Gerenciador de Sessões
- `/api-test.html` - Testador de APIs
- Qualquer outra página HTML que seja adicionada no futuro

### 3. Indicador de Status
Todas as páginas mostram um indicador no canto superior direito:
- 🟢 **Verde**: Autenticado - mostra usuário e opção de logout
- 🔴 **Vermelho**: Não autenticado - clique para fazer login

## 🔧 Funcionalidades Técnicas

### Sistema de Proteção Universal
- **Lista de Exclusão**: Apenas `/login.html` não é protegida
- **Proteção Automática**: Todas as outras páginas HTML são automaticamente protegidas
- **Verificação Frontend**: Cada página verifica autenticação no carregamento
- **Redirecionamento**: Usuários não autenticados são redirecionados para login

### AuthManager (`public/js/auth.js`)

```javascript
// Verificar se está autenticado
authManager.isAuthenticated()

// Fazer requisição autenticada
authenticatedFetch('/api/endpoint', options)

// Proteger página
protectPage()

// Fazer logout
authManager.logout()
```

### Renovação Automática de Tokens
- Tokens são renovados automaticamente 2 minutos antes de expirar
- Sistema de retry em caso de falha na renovação
- Logout automático se renovação falhar

### Proteção de Rotas Backend
Todas as rotas do WhatsApp agora usam o middleware `flexibleAuth`:
- Aceita JWT Bearer tokens
- Aceita API Keys no header `x-api-key`
- Retorna 401 se não autenticado

## 🛡️ Segurança

### Frontend
- Tokens armazenados no localStorage/sessionStorage
- Verificação automática de expiração
- Limpeza de tokens no logout
- Redirecionamento seguro para login

### Backend
- JWT com assinatura e verificação
- Rate limiting para tentativas de login
- Logs de segurança para eventos de auth
- Middleware flexível (JWT + API Key)

## 🔄 Fluxo de Autenticação

1. **Login**: Usuario faz login → recebe access + refresh tokens
2. **Requisições**: Todas as requisições incluem Authorization header
3. **Renovação**: Token renovado automaticamente quando prestes a expirar
4. **Expiração**: Se refresh falhar → logout automático → redirect para login

## 📝 Configuração

### Variáveis de Ambiente
```env
# Credenciais de login (em APP_CONFIG)
BASIC_AUTH_USER=admin
BASIC_AUTH_PASSWORD=admin@password

# JWT Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

### Personalização
Para alterar credenciais, edite `src/config/app.config.js`:
```javascript
BASIC_AUTH_USER: process.env.BASIC_AUTH_USER || "seu_usuario",
BASIC_AUTH_PASSWORD: process.env.BASIC_AUTH_PASSWORD || "sua_senha",
```

## 🧪 Testando

1. **Teste de Login**:
   - Acesse `/login.html`
   - Tente credenciais incorretas (deve falhar)
   - Use credenciais corretas (deve redirecionar)

2. **Teste de Proteção**:
   - Acesse `/sessions.html` sem estar logado (deve redirecionar para login)
   - Faça login e acesse novamente (deve funcionar)

3. **Teste de Renovação**:
   - Deixe a página aberta por 15+ minutos
   - Verifique se token foi renovado automaticamente

4. **Teste de Logout**:
   - Clique no indicador de status → Sair
   - Tente acessar página protegida (deve redirecionar)

## 🚨 Resolução de Problemas

### Problema: "Token expirado"
- **Solução**: Faça logout e login novamente

### Problema: "Não consegue fazer login"
- **Solução**: Verifique credenciais em `APP_CONFIG`

### Problema: "Página protegida não redireciona"
- **Solução**: Verifique se `auth.js` foi carregado corretamente

### Problema: "Requisições retornam 401"
- **Solução**: Verifique se todas as chamadas fetch foram substituídas por `authenticatedFetch`

## 🎉 Benefícios

1. **Segurança**: Todas as rotas estão protegidas
2. **UX**: Login fluído com renovação automática
3. **Manutenibilidade**: Sistema centralizado e reutilizável
4. **Flexibilidade**: Suporte a JWT e API Keys
5. **Observabilidade**: Logs de segurança e indicadores visuais

## 🧹 Limpeza Automática de Tokens

### Funcionalidade Implementada

A partir da versão atual, quando uma sessão do WhatsApp é removida através do sistema, a pasta correspondente de tokens JWT também é automaticamente removida. Isso garante:

- **Limpeza Completa**: Não há acúmulo de pastas de tokens órfãs
- **Gerenciamento Automático**: Zero intervenção manual necessária
- **Segurança**: Remove dados de autenticação relacionados à sessão

### Implementação Técnica

```javascript
// Em src/services/SessionManager.js
async removeSessionTokensFolder(sessionName) {
  try {
    const tokensPath = path.join(__dirname, "..", "..", "tokens", sessionName);
    
    if (fs.existsSync(tokensPath)) {
      console.log(`[SessionManager] Removendo pasta de tokens: ${tokensPath}`);
      await fs.promises.rm(tokensPath, { recursive: true, force: true });
      console.log(`[SessionManager] Pasta de tokens removida com sucesso: ${sessionName}`);
    }
  } catch (error) {
    console.error(`[SessionManager] Erro ao remover pasta de tokens: ${error.message}`);
    // Não interrompe o processo de limpeza da sessão
  }
}
```

### Características

- ✅ **Automática**: Executada automaticamente quando sessão é removida
- ✅ **Segura**: Não falha se pasta não existir
- ✅ **Não Bloqueante**: Erro na remoção não impede limpeza da sessão
- ✅ **Recursiva**: Remove toda a árvore de arquivos e pastas
- ✅ **Logs Detalhados**: Registra todas as operações

### Como Funciona

1. **Usuário remove sessão** via interface (sessions.html ou api-test.html)
2. **Controller chama** `WhatsAppService.removeSession(sessionName)`
3. **Service chama** `SessionManager.cleanupSession(sessionName)`
4. **SessionManager executa**:
   - Para health checks
   - Fecha cliente WhatsApp
   - **Remove pasta de tokens** (NOVA FUNCIONALIDADE)
   - Limpa da memória
   - Remove contadores

### Estrutura de Pastas

```
tokens/
├── sessao1/           # 🗑️ Removida automaticamente quando sessao1 é excluída
│   ├── SingletonLock
│   └── ...
├── sessao2/           # 🗑️ Removida automaticamente quando sessao2 é excluída
│   ├── data.json
│   └── ...
└── .gitkeep
```

---

**✅ Sistema de autenticação completamente implementado e funcional com limpeza automática de tokens!** 