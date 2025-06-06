FROM node:18-alpine

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S dynamuszap -u 1001

# Instalar dependências necessárias para o Chrome e ferramentas de segurança
RUN apk add --no-cache \
    bash \
    chromium \
    chromium-chromedriver \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    wget \
    xvfb \
    dumb-init \
    tini

# Definir variáveis de ambiente para o Puppeteer e Node.js
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production
ENV DOCKER_ENV=true
# Configurações específicas para WhatsApp/Venom
ENV CHROME_BIN=/usr/bin/chromium
ENV CHROME_PATH=/usr/bin/chromium
ENV DISPLAY=:99
ENV NO_SANDBOX=true

WORKDIR /app

# Copiar arquivos de dependência primeiro (para melhor cache)
COPY package*.json ./

# Instalar dependências com cache otimizado
RUN npm ci --only=production && \
    npm cache clean --force

# Copiar o restante dos arquivos
COPY . .

# Criar diretórios necessários e ajustar permissões
RUN mkdir -p /app/logs /app/tokens && \
    chown -R dynamuszap:nodejs /app && \
    chmod -R 755 /app

# Mudar para usuário não-root
USER dynamuszap

# Expor apenas a porta da aplicação
EXPOSE 3333

# Usar tini como PID 1 para manuseio correto de sinais
ENTRYPOINT ["/sbin/tini", "--"]

# Comando para iniciar a aplicação
CMD ["node", "./src/app.js"]