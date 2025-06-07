FROM node:18-alpine

# Instalar dependências necessárias para o Chrome
RUN apk add --no-cache \
    bash \
    chromium \
    chromium-chromedriver \
    nss \
    freetype \
    harfbuzz \
    ttf-freefont \
    dbus \
    xvfb \
    procps \
    udev \
    ca-certificates

# Definir variáveis de ambiente para o Puppeteer e Node.js
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV NODE_ENV=production

WORKDIR /app

# Copiar arquivos de dependência primeiro (para melhor cache)
COPY package*.json ./

# Instalar dependências com cache otimizado
RUN npm install

# Copiar o restante dos arquivos
COPY . .

# Expor a porta da aplicação
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["node", "./src/app.js"]