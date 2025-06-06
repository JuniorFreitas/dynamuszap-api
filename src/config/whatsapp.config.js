const path = require("path");

// Configurações otimizadas para o Venom Bot em ambiente Docker
const WHATSAPP_CONFIG = {
  // Configurações básicas da sessão
  session: {
    // Diretório onde as sessões serão salvas
    folderNameToken: path.resolve(__dirname, "../../tokens"),
    // Nome padrão da sessão se não for especificado
    sessionName: "dynamuszap-session",
    // Configurações de timeout
    timeout: 120000, // 120 segundos (aumentado)
    autoClose: 0, // Desabilitar autoClose
    // Configurações de debug
    debug: true, // Sempre habilitado para troubleshooting
    logQR: true,
    // Configurações de browser otimizadas para estabilidade
    browserArgs: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--disable-gpu",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-features=TranslateUI",
      "--disable-ipc-flooding-protection",
      "--disable-extensions",
      "--disable-default-apps",
      "--disable-web-security",
      "--disable-features=VizDisplayCompositor",
      "--mute-audio",
      "--disable-background-media",
      "--disable-sync",
      "--disable-blink-features=AutomationControlled",
      "--user-data-dir=/tmp/chrome-user-data",
      "--remote-debugging-port=0",
      "--disable-crash-reporter",
      "--disable-component-update",
      "--disable-domain-reliability",
      "--disable-client-side-phishing-detection",
      "--disable-hang-monitor",
      "--disable-prompt-on-repost",
      "--disable-translate",
      "--metrics-recording-only",
      "--safebrowsing-disable-auto-update",
      "--password-store=basic",
      "--use-mock-keychain",
      "--ignore-certificate-errors",
      "--ignore-ssl-errors",
      "--ignore-certificate-errors-spki-list",
    ],
  },

  // Configurações específicas para Docker
  docker: {
    // Args extras para Chrome no Docker
    additionalBrowserArgs:
      process.env.DOCKER_ENV === "true"
        ? [
            "--disable-dev-shm-usage",
            "--disable-background-timer-throttling",
            "--disable-backgrounding-occluded-windows",
            "--disable-renderer-backgrounding",
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-accelerated-2d-canvas",
            "--disable-gpu",
            "--disable-features=VizDisplayCompositor",
            "--memory-pressure-off",
          ]
        : [],

    // Configurações de headless
    headless: process.env.NODE_ENV === "production" ? "new" : false,

    // Configurações de viewport
    viewport: {
      width: 1366,
      height: 768,
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
      isLandscape: true,
    },
  },

  // Configurações de reconexão
  reconnect: {
    // Número máximo de tentativas de reconexão
    maxAttempts: parseInt(process.env.SESSION_MAX_RECONNECT_ATTEMPTS) || 3,
    // Delay entre tentativas (em milissegundos)
    delay: parseInt(process.env.SESSION_RECONNECT_DELAY) || 30000,
    // Timeout para cada tentativa
    timeout: parseInt(process.env.SESSION_TIMEOUT) || 120000,
  },

  // Configurações de QR Code
  qrcode: {
    // Tipo de QR code (terminal, base64, ou image)
    type: "base64",
    // Qualidade do QR code
    quality: 0.3,
    // Margem do QR code
    margin: 1,
    // Cor do QR code
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  },

  // Configurações de mensagens
  message: {
    // Delay entre envio de mensagens (ms)
    delay: 1000,
    // Timeout para envio de mensagens
    timeout: 30000,
    // Configurações de retry
    retry: {
      attempts: 3,
      delay: 2000,
    },
  },

  // Configurações de webhook
  webhook: {
    // URL do webhook (se configurado)
    url: process.env.WEBHOOK_URL || null,
    // Eventos para enviar para o webhook
    events: ["qr", "ready", "message", "disconnected", "error"],
  },

  // Configurações de limpeza
  cleanup: {
    // Limpar cache do browser após desconectar
    clearCache: true,
    // Limpar cookies após desconectar
    clearCookies: true,
    // Remover arquivos temporários
    removeTempFiles: true,
  },

  // Configurações específicas para problemas conhecidos
  fixes: {
    // Corrigir problema de múltiplos dispositivos
    multiDevice: true,
    // Corrigir problema de loading infinito
    infiniteLoading: true,
    // Timeout para loading
    loadingTimeout: 45000,
    // Intervalo de verificação de saúde da sessão
    healthCheckInterval:
      parseInt(process.env.SESSION_HEALTH_CHECK_INTERVAL) || 30000,
  },
};

// Função para obter configuração da sessão
function getSessionConfig(sessionName = "default", customConfig = {}) {
  const config = {
    session: sessionName,
    folderNameToken: WHATSAPP_CONFIG.session.folderNameToken,
    timeout: WHATSAPP_CONFIG.session.timeout,
    autoClose: WHATSAPP_CONFIG.session.autoClose,
    debug: WHATSAPP_CONFIG.session.debug,
    logQR: WHATSAPP_CONFIG.session.logQR,

    // Configurações do browser
    browserArgs: [
      ...WHATSAPP_CONFIG.session.browserArgs,
      ...WHATSAPP_CONFIG.docker.additionalBrowserArgs,
    ],

    // Configurações headless
    headless: WHATSAPP_CONFIG.docker.headless,

    // Viewport
    viewport: WHATSAPP_CONFIG.docker.viewport,

    // Configurações de device
    deviceName: `DynamusZap-${sessionName}`,

    // Merge com configurações customizadas
    ...customConfig,
  };

  return config;
}

// Função para obter argumentos do Chrome otimizados
function getChromeArgs() {
  return [
    ...WHATSAPP_CONFIG.session.browserArgs,
    ...WHATSAPP_CONFIG.docker.additionalBrowserArgs,
  ];
}

// Função para validar nome da sessão
function validateSessionName(sessionName) {
  // Regex para validar nome da sessão (apenas letras, números, hífen e underscore)
  const regex = /^[a-zA-Z0-9_-]{3,50}$/;
  return regex.test(sessionName);
}

// Função para obter caminho da sessão
function getSessionPath(sessionName) {
  return path.join(WHATSAPP_CONFIG.session.folderNameToken, sessionName);
}

module.exports = {
  WHATSAPP_CONFIG,
  getSessionConfig,
  getChromeArgs,
  validateSessionName,
  getSessionPath,
};
