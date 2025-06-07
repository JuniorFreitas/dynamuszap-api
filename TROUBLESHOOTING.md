# Troubleshooting - Puppeteer/Chromium no Alpine Linux

## Problema: "Failed to launch the browser process!" e SingletonLock

Este erro pode ocorrer por dois motivos principais:
1. Problemas de configuração do Chromium no Alpine Linux
2. **Arquivos SingletonLock órfãos** (principal causa do problema)

O arquivo `SingletonLock` é um link simbólico que pode ficar órfão quando o container é reiniciado ou quando há problemas na sessão anterior, impedindo o Chromium de iniciar.

## Soluções Implementadas

### 1. **Limpeza Automática de SingletonLock** ⭐ **PRINCIPAL SOLUÇÃO**

Implementado sistema completo para detectar e remover arquivos SingletonLock órfãos:

- **Utilitário SessionCleaner**: `src/utils/sessionCleaner.js`
- **Limpeza Automática**: Executa antes de cada criação de sessão
- **Limpeza na Inicialização**: Script `start.sh` limpa automaticamente
- **Endpoint da API**: `/api/whatsapp/clean-locks` para limpeza manual
- **Interface Web**: Botão "Limpar Locks" no dashboard

### 2. Dockerfile Otimizado

O Dockerfile foi configurado com dependências necessárias para o Chromium:

- **Dependências Básicas**: Chromium, bash, nss, freetype, harfbuzz
- **Fontes**: ttf-freefont para renderização adequada

### 3. Configuração do Puppeteer

Configurado `src/services/whatsService.js` com argumentos básicos necessários:

- **Argumentos Essenciais**: `--no-sandbox`, `--disable-setuid-sandbox`, `--disable-dev-shm-usage`
- **Configurações Seguras**: Argumentos mínimos para funcionamento em containers
- **Integração com SessionCleaner**: Limpeza automática antes da criação de sessões

### 4. Script de Inicialização

O `start.sh` executa:

- **Limpeza de Links Simbólicos**: Remove SingletonLock órfãos automaticamente
- **Limpeza de Arquivos Temporários**: Remove lockfile, DevToolsActivePort
- **Verificação do Chromium**: Confirma disponibilidade do navegador
- **Logs Detalhados**: Informações sobre o processo de inicialização

## Variáveis de Ambiente Necessárias

Certifique-se de ter as seguintes variáveis configuradas:

```env
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
NODE_ENV=production
```

## Como Aplicar as Correções

### 1. **SOLUÇÃO RÁPIDA - Limpeza Manual** ⚡

Se você já tem o sistema rodando, use a limpeza manual:

```bash
# Via API
curl -X POST http://localhost:3333/api/whatsapp/clean-locks \
  -H "Content-Type: application/json" \
  -d '{}'

# Ou via interface web
# Acesse o dashboard → WhatsApp → Botão "Limpar Locks"
```

### 2. Rebuild do Container

```bash
# Parar o container atual
docker-compose down

# Rebuild com as novas configurações
docker-compose build --no-cache

# Iniciar novamente
docker-compose up -d
```

### 2. Verificar Logs

```bash
# Ver logs em tempo real
docker-compose logs -f dynamuszap-api

# Verificar se o Chromium foi iniciado corretamente
docker-compose logs dynamuszap-api | grep -i chromium
```

### 3. Teste Manual

Dentro do container, você pode testar o Chromium:

```bash
# Entrar no container
docker exec -it dynamuszap-api bash

# Testar o Chromium
chromium-browser --version
chromium-browser --no-sandbox --headless --dump-dom https://www.google.com
```

## Sinais de Sucesso

Após aplicar as correções, você deve ver nos logs:

```
🚀 Iniciando DynamusZap API...
📺 Iniciando Xvfb (display virtual)...
🌐 Chromium encontrado: Chromium 110.0.5481.100
📦 Node.js version: v18.x.x
🚀 Iniciando aplicação Node.js...
- Node.js version verified successfully!
- Waiting... checking the browser...
- Executable path browser: /usr/bin/chromium-browser
- Platform: linux
- Browser Version: Chromium 110.0.5481.100
```

## Problemas Conhecidos e Soluções

### Erro: "No usable sandbox!"

**Solução**: Já incluído `--no-sandbox` nos argumentos do Puppeteer.

### Erro: "Failed to move to new namespace"

**Solução**: Já incluído `--disable-setuid-sandbox` nos argumentos.

### Erro: "shared memory"

**Solução**: Já configurado `shm_size: 2gb` no docker-compose.yml.

### Performance Ruim

**Solução**: Já incluído `--single-process` e otimizações de memória.

## Monitoramento

Para monitorar o uso de recursos:

```bash
# Uso de memória e CPU
docker stats dynamuszap-api

# Processos dentro do container
docker exec dynamuszap-api ps aux

# Espaço em disco
docker exec dynamuszap-api df -h
```

## Suporte Adicional

Se ainda houver problemas:

1. Verifique os logs completos: `docker-compose logs dynamuszap-api`
2. Teste o Chromium manualmente dentro do container
3. Verifique se todas as dependências foram instaladas corretamente
4. Considere aumentar a memória do container se necessário

---

## Comandos Úteis para Debug

```bash
# Verificar arquivos de tokens
ls -la ./tokens/

# Verificar se o Chromium está funcionando
docker exec dynamuszap-api chromium-browser --version

# Verificar processos
docker exec dynamuszap-api ps aux | grep chromium

# Verificar display
docker exec dynamuszap-api echo $DISPLAY

# Teste de conectividade
curl http://localhost:3333/api/config
``` 