const venom = require("venom-bot");
const SocketService = require("./SocketService");
const Session = require("../models/Session");
const fs = require("fs");
const path = require("path");

class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.detectedSessions = new Map(); // Armazena todas as sessões detectadas, mesmo as que falharam
    this.healthCheckTimers = new Map();
    this.reconnectAttempts = new Map();
    this.healthCheckInterval = 60000; // 60 segundos (aumentado)
    this.maxReconnectAttempts = 2; // Reduzido para evitar loops
    this.reconnectDelay = 30000; // 30 segundos (aumentado)
    this.isShuttingDown = false;

    // Carregar sessões existentes será feito via método init() chamado externamente
  }

  /**
   * Inicializa o SessionManager e carrega sessões existentes
   */
  async init() {
    console.log("[SessionManager] Inicializando...");
    await this.initializeExistingSessions();
    console.log("[SessionManager] Inicialização concluída");
  }

  /**
   * Cria uma nova sessão com tratamento robusto de erros
   */
  async createSession(sessionName, onQrCode, onStatusChange = null) {
    try {
      console.log(`[SessionManager] Criando sessão: ${sessionName}`);

      // Configurações específicas para Docker Alpine Linux
      const sessionOptions = {
        multidevice: true,
        headless: "new",
        useChrome: false,
        devtools: false,
        debug: true,
        logQR: true,
        browserWS: "",
        // Configurações de browser otimizadas para Docker
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
          "--disable-extensions",
          "--disable-web-security", // Para evitar problemas de CORS
          "--allow-running-insecure-content",
          "--disable-features=VizDisplayCompositor",
          "--disable-software-rasterizer",
          "--max_old_space_size=4096",
          "--disable-blink-features=AutomationControlled",
          "--user-data-dir=/tmp/chrome-user-data",
          "--remote-debugging-port=0",
          "--disable-crash-reporter",
          "--ignore-certificate-errors",
          "--ignore-ssl-errors",
        ],
        refreshQR: 30000, // Aumentado para 30 segundos
        autoClose: 0, // Desabilitar autoClose
        // Configurações específicas do Puppeteer para Docker
        puppeteerOptions: {
          headless: "new",
          devtools: false,
          executablePath: "/usr/bin/chromium", // Caminho correto para Alpine
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--disable-gpu",
            "--disable-background-timer-throttling",
            "--disable-backgrounding-occluded-windows",
            "--disable-renderer-backgrounding",
            "--disable-web-security",
            "--allow-running-insecure-content",
            "--disable-features=VizDisplayCompositor",
            "--disable-software-rasterizer",
            "--max_old_space_size=4096",
            "--memory-pressure-off", // Evitar problemas de memória
            "--disable-blink-features=AutomationControlled",
            "--user-data-dir=/tmp/chrome-user-data",
            "--remote-debugging-port=0",
            "--disable-crash-reporter",
            "--ignore-certificate-errors",
            "--ignore-ssl-errors",
          ],
          // Aumentar timeouts para dar mais tempo ao browser inicializar
          timeout: 120000, // Aumentado para 120 segundos
          slowMo: 0,
          defaultViewport: {
            width: 1366,
            height: 768,
            deviceScaleFactor: 1,
            isMobile: false,
            hasTouch: false,
            isLandscape: true,
          },
          ignoreDefaultArgs: false,
        },
        // Timeouts específicos
        timeoutLaunchBrowser: 120000, // Aumentado
        waitForLogin: 180000, // Aumentado para 3 minutos
      };

      // Tentar criar a sessão com retry automático
      let lastError;
      const maxBrowserRetries = 3;

      for (let attempt = 1; attempt <= maxBrowserRetries; attempt++) {
        try {
          console.log(
            `[SessionManager] Tentativa ${attempt}/${maxBrowserRetries} de criar sessão ${sessionName}`
          );

          const client = await venom.create(
            sessionName,
            (qrCode) => {
              console.log(
                `[SessionManager] QR Code gerado para ${sessionName}`
              );

              // Mostrar QR Code no terminal também para debug
              console.log("\n📱 QR CODE PARA ESCANEAMENTO:");
              console.log("▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼");
              console.log(qrCode);
              console.log("▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲");
              console.log(
                `📱 Escaneie o QR Code acima com seu WhatsApp para conectar a sessão: ${sessionName}\n`
              );

              // Emitir QR Code via Socket.IO
              SocketService.emitQRCode(sessionName, qrCode);

              // Chamar callback original se fornecido
              if (onQrCode) {
                onQrCode(qrCode);
              }
            },
            (statusSession, session) => {
              console.log(
                `[SessionManager] Status da sessão ${sessionName}:`,
                statusSession
              );

              // Emitir mudança de status via Socket.IO
              SocketService.emitSessionStatusChange(
                sessionName,
                statusSession,
                {
                  session,
                }
              );

              if (onStatusChange) {
                onStatusChange(statusSession, session);
              }
              this.handleStatusChange(sessionName, statusSession, session);
            },
            sessionOptions
          );

          // Se chegou aqui, a sessão foi criada com sucesso
          console.log(
            `[SessionManager] Sessão ${sessionName} criada com sucesso na tentativa ${attempt}`
          );

          // Configurar handlers de erro
          this.setupErrorHandlers(client, sessionName);

          // Armazenar sessão
          this.sessions.set(sessionName, client);
          Session.add(sessionName, client);

          // Iniciar monitoramento de saúde
          this.startHealthCheck(sessionName);

          // Resetar contador de tentativas
          this.reconnectAttempts.set(sessionName, 0);

          return client;
        } catch (error) {
          lastError = error;
          console.error(
            `[SessionManager] Tentativa ${attempt}/${maxBrowserRetries} falhou para sessão ${sessionName}:`,
            error.message
          );

          if (attempt < maxBrowserRetries) {
            const delay = 2000 * attempt; // Delay progressivo
            console.log(
              `[SessionManager] Aguardando ${delay}ms antes da próxima tentativa...`
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      // Se chegou aqui, todas as tentativas falharam
      throw new Error(
        `Falha ao criar sessão ${sessionName} após ${maxBrowserRetries} tentativas. Último erro: ${lastError.message}`
      );
    } catch (error) {
      console.error(
        `[SessionManager] Erro fatal ao criar sessão ${sessionName}:`,
        error
      );
      // Emitir erro via Socket.IO
      SocketService.emitSessionError(sessionName, error, true);
      await this.handleSessionError(sessionName, error);
      throw error;
    }
  }

  /**
   * Configura handlers de erro para o cliente
   */
  setupErrorHandlers(client, sessionName) {
    // Handler para desconexão
    client.onStateChange((state) => {
      console.log(`[SessionManager] Estado da sessão ${sessionName}:`, state);
      if (
        state === "CONFLICT" ||
        state === "UNPAIRED" ||
        state === "UNLAUNCHED"
      ) {
        console.warn(
          `[SessionManager] Sessão ${sessionName} em estado crítico:`,
          state
        );
        this.scheduleReconnect(sessionName);
      }
    });

    // Handler para erros gerais
    if (client.page) {
      client.page.on("error", (error) => {
        console.error(
          `[SessionManager] Erro na página da sessão ${sessionName}:`,
          error
        );
        SocketService.emitSessionError(sessionName, error, false);
        this.handleSessionError(sessionName, error);
      });

      client.page.on("pageerror", (error) => {
        console.error(
          `[SessionManager] Erro de página da sessão ${sessionName}:`,
          error
        );
        SocketService.emitSessionError(sessionName, error, false);
        this.handleSessionError(sessionName, error);
      });

      client.page.on("disconnected", () => {
        console.warn(
          `[SessionManager] Página desconectada da sessão ${sessionName}`
        );
        SocketService.emitSessionStatusChange(sessionName, "DISCONNECTED", {
          reason: "Page disconnected",
        });
        this.scheduleReconnect(sessionName);
      });
    }

    // Handler para erros do browser
    if (client.browser) {
      client.browser.on("disconnected", () => {
        console.warn(
          `[SessionManager] Browser desconectado da sessão ${sessionName}`
        );
        this.scheduleReconnect(sessionName);
      });
    }
  }

  /**
   * Lida com mudanças de status da sessão
   */
  handleStatusChange(sessionName, status, session) {
    switch (status) {
      case "inChat":
        console.log(
          `[SessionManager] Sessão ${sessionName} conectada e pronta`
        );
        SocketService.emitSessionConnected(sessionName);
        this.reconnectAttempts.set(sessionName, 0);
        break;
      case "browserClose":
      case "serverClose":
      case "destroyedSession":
        console.warn(
          `[SessionManager] Sessão ${sessionName} foi fechada:`,
          status
        );
        this.scheduleReconnect(sessionName);
        break;
      case "autocloseCalled":
        console.warn(
          `[SessionManager] Autoclose chamado para sessão ${sessionName}`
        );
        this.scheduleReconnect(sessionName);
        break;
    }
  }

  /**
   * Agenda uma reconexão
   */
  async scheduleReconnect(sessionName) {
    const attempts = this.reconnectAttempts.get(sessionName) || 0;

    if (attempts >= this.maxReconnectAttempts) {
      console.error(
        `[SessionManager] Máximo de tentativas de reconexão atingido para ${sessionName}`
      );
      this.cleanupSession(sessionName);
      return;
    }

    this.reconnectAttempts.set(sessionName, attempts + 1);
    const delay = this.reconnectDelay * (attempts + 1); // Delay exponencial

    console.log(
      `[SessionManager] Agendando reconexão ${attempts + 1}/${
        this.maxReconnectAttempts
      } para ${sessionName} em ${delay}ms`
    );

    // Emitir evento de reconexão via Socket.IO
    SocketService.emitSessionReconnecting(
      sessionName,
      attempts + 1,
      this.maxReconnectAttempts,
      delay
    );

    setTimeout(() => {
      this.reconnectSession(sessionName);
    }, delay);
  }

  /**
   * Reconecta uma sessão
   */
  async reconnectSession(sessionName) {
    try {
      console.log(
        `[SessionManager] Tentando reconectar sessão: ${sessionName}`
      );

      // Limpar sessão atual
      await this.cleanupSession(sessionName, false);

      // Criar nova sessão
      await this.createSession(sessionName, (qrCode) => {
        console.log(
          `[SessionManager] QR Code gerado para reconexão de ${sessionName}`
        );
        // Aqui você pode implementar notificação via webhook ou outros meios
      });
    } catch (error) {
      console.error(
        `[SessionManager] Erro ao reconectar sessão ${sessionName}:`,
        error
      );
      this.scheduleReconnect(sessionName);
    }
  }

  /**
   * Lida com erros da sessão
   */
  async handleSessionError(sessionName, error) {
    console.error(
      `[SessionManager] Erro na sessão ${sessionName}:`,
      error.message
    );

    // Categorizar tipos de erro
    const browserErrors = [
      "Error no open browser",
      "Failed to launch the browser process",
      "Browser closed",
      "Browser disconnected",
      "Could not find Chromium",
      "Chromium revision is not downloaded",
      "spawn chromium-browser ENOENT",
      "spawn /usr/bin/chromium-browser ENOENT",
    ];

    const networkErrors = [
      "Navigation timeout",
      "net::ERR_",
      "Connection closed",
      "Protocol error",
      "WebSocket connection closed",
    ];

    const criticalErrors = [
      "Page crashed",
      "Session closed",
      "Target closed",
      "destroyedSession",
      "autocloseCalled",
    ];

    const whatsappExpiredErrors = [
      "UNPAIRED",
      "Disconnected by cell phone",
      "Was disconnected",
      "CONFLICT",
    ];

    const errorMessage = error.message || error.toString();

    // Verificar se é erro de WhatsApp expirado (não tentar reconectar)
    const isWhatsAppExpired = whatsappExpiredErrors.some((expiredError) =>
      errorMessage.includes(expiredError)
    );

    if (isWhatsAppExpired) {
      console.warn(
        `[SessionManager] Sessão ${sessionName} expirada no WhatsApp, limpando completamente`
      );
      await this.cleanupSession(sessionName);
      return;
    }

    // Verificar se é erro de browser (tentar soluções específicas)
    const isBrowserError = browserErrors.some((browserError) =>
      errorMessage.includes(browserError)
    );

    if (isBrowserError) {
      console.warn(
        `[SessionManager] Erro de browser detectado para ${sessionName}, tentando recuperação específica`
      );
      await this.handleBrowserError(sessionName, error);
      return;
    }

    // Verificar se é erro de rede (tentar reconexão simples)
    const isNetworkError = networkErrors.some((networkError) =>
      errorMessage.includes(networkError)
    );

    if (isNetworkError) {
      console.warn(
        `[SessionManager] Erro de rede detectado para ${sessionName}, agendando reconexão`
      );
      this.scheduleReconnect(sessionName);
      return;
    }

    // Verificar se é erro crítico (requer reconexão)
    const isCritical = criticalErrors.some((criticalError) =>
      errorMessage.includes(criticalError)
    );

    if (isCritical) {
      console.warn(
        `[SessionManager] Erro crítico detectado, iniciando reconexão para ${sessionName}`
      );
      this.scheduleReconnect(sessionName);
      return;
    }

    // Para outros erros, apenas log
    console.log(
      `[SessionManager] Erro não crítico na sessão ${sessionName}, continuando monitoramento`
    );
  }

  /**
   * Lida especificamente com erros de browser
   */
  async handleBrowserError(sessionName, error) {
    const attempts = this.reconnectAttempts.get(sessionName) || 0;

    if (attempts >= this.maxReconnectAttempts) {
      console.error(
        `[SessionManager] Máximo de tentativas de recuperação de browser atingido para ${sessionName}`
      );
      // Não limpar completamente - manter os tokens para recuperação manual
      this.sessions.delete(sessionName);
      Session.remove(sessionName);
      return;
    }

    console.log(
      `[SessionManager] Tentando recuperação de browser para ${sessionName} (tentativa ${
        attempts + 1
      }/${this.maxReconnectAttempts})`
    );

    // Limpar sessão atual sem remover tokens
    await this.cleanupSessionWithoutTokens(sessionName);

    // Aguardar um pouco mais para problemas de browser
    const delay = 5000 + attempts * 3000; // 5s, 8s, 11s...

    console.log(
      `[SessionManager] Aguardando ${delay}ms antes de tentar recuperar browser para ${sessionName}`
    );

    setTimeout(async () => {
      try {
        await this.reconnectSession(sessionName);
      } catch (retryError) {
        console.error(
          `[SessionManager] Falha na recuperação de browser para ${sessionName}:`,
          retryError.message
        );
        this.reconnectAttempts.set(sessionName, attempts + 1);
        await this.handleBrowserError(sessionName, retryError);
      }
    }, delay);
  }

  /**
   * Limpa sessão sem remover tokens (para recuperação)
   */
  async cleanupSessionWithoutTokens(sessionName) {
    try {
      console.log(
        `[SessionManager] Limpando sessão ${sessionName} (mantendo tokens)`
      );

      // Parar health check
      if (this.healthCheckTimers.has(sessionName)) {
        clearInterval(this.healthCheckTimers.get(sessionName));
        this.healthCheckTimers.delete(sessionName);
      }

      // Fechar cliente se existir
      const client = this.sessions.get(sessionName);
      if (client) {
        try {
          await client.close();
        } catch (error) {
          console.warn(
            `[SessionManager] Erro ao fechar cliente ${sessionName}:`,
            error.message
          );
        }
      }

      // Remover apenas da memória (manter tokens)
      this.sessions.delete(sessionName);
      Session.remove(sessionName);

      console.log(
        `[SessionManager] Sessão ${sessionName} limpa da memória (tokens preservados)`
      );
    } catch (error) {
      console.error(
        `[SessionManager] Erro ao limpar sessão ${sessionName} da memória:`,
        error
      );
    }
  }

  /**
   * Inicia verificação de saúde da sessão
   */
  startHealthCheck(sessionName) {
    // Limpar timer existente
    if (this.healthCheckTimers.has(sessionName)) {
      clearInterval(this.healthCheckTimers.get(sessionName));
    }

    const timer = setInterval(async () => {
      await this.checkSessionHealth(sessionName);
    }, this.healthCheckInterval);

    this.healthCheckTimers.set(sessionName, timer);
  }

  /**
   * Verifica a saúde da sessão
   */
  async checkSessionHealth(sessionName) {
    try {
      const client = this.sessions.get(sessionName);
      if (!client) {
        console.warn(
          `[SessionManager] Sessão ${sessionName} não encontrada durante verificação de saúde`
        );
        return;
      }

      // Verificar se o browser ainda está ativo
      if (client.browser && client.browser.process() === null) {
        console.warn(
          `[SessionManager] Browser da sessão ${sessionName} não está ativo`
        );
        this.scheduleReconnect(sessionName);
        return;
      }

      // Verificar se a página ainda responde
      if (client.page && client.page.isClosed()) {
        console.warn(
          `[SessionManager] Página da sessão ${sessionName} está fechada`
        );
        this.scheduleReconnect(sessionName);
        return;
      }

      // Tentar obter status da conexão
      try {
        const connectionState = await client.getConnectionState();
        // Emitir health check positivo
        SocketService.emitHealthCheck(sessionName, true, connectionState);
      } catch (error) {
        console.warn(
          `[SessionManager] Sessão ${sessionName} não responde ao status de conexão:`,
          error.message
        );
        // Emitir health check negativo
        SocketService.emitHealthCheck(sessionName, false, error.message);
        this.scheduleReconnect(sessionName);
      }
    } catch (error) {
      console.error(
        `[SessionManager] Erro durante verificação de saúde da sessão ${sessionName}:`,
        error
      );
    }
  }

  /**
   * Limpa uma sessão
   */
  async cleanupSession(sessionName, removeFromAttempts = true) {
    try {
      console.log(`[SessionManager] Limpando sessão: ${sessionName}`);

      // Parar health check
      if (this.healthCheckTimers.has(sessionName)) {
        clearInterval(this.healthCheckTimers.get(sessionName));
        this.healthCheckTimers.delete(sessionName);
      }

      // Fechar cliente se existir
      const client = this.sessions.get(sessionName);
      if (client) {
        try {
          await client.close();
        } catch (error) {
          console.warn(
            `[SessionManager] Erro ao fechar cliente ${sessionName}:`,
            error.message
          );
        }
      }

      // Remover pasta de tokens da sessão
      await this.removeSessionTokensFolder(sessionName);

      // Remover da memória
      this.sessions.delete(sessionName);
      Session.remove(sessionName);

      if (removeFromAttempts) {
        this.reconnectAttempts.delete(sessionName);
      }
    } catch (error) {
      console.error(
        `[SessionManager] Erro ao limpar sessão ${sessionName}:`,
        error
      );
    }
  }

  /**
   * Remove a pasta de tokens de uma sessão
   */
  async removeSessionTokensFolder(sessionName) {
    try {
      const tokensPath = path.join(
        __dirname,
        "..",
        "..",
        "tokens",
        sessionName
      );

      if (fs.existsSync(tokensPath)) {
        console.log(
          `[SessionManager] Removendo pasta de tokens: ${tokensPath}`
        );

        // Remover recursivamente a pasta e todo seu conteúdo
        await fs.promises.rm(tokensPath, { recursive: true, force: true });

        console.log(
          `[SessionManager] Pasta de tokens removida com sucesso: ${sessionName}`
        );
      } else {
        console.log(
          `[SessionManager] Pasta de tokens não encontrada para a sessão: ${sessionName}`
        );
      }
    } catch (error) {
      console.error(
        `[SessionManager] Erro ao remover pasta de tokens da sessão ${sessionName}:`,
        error.message
      );
      // Não relançar o erro para não interromper o processo de limpeza
    }
  }

  /**
   * Obtém uma sessão
   */
  getSession(sessionName) {
    return this.sessions.get(sessionName);
  }

  /**
   * Lista todas as sessões ativas
   */
  getActiveSessions() {
    return Array.from(this.sessions.keys());
  }

  /**
   * Lista todas as sessões detectadas (ativas ou não)
   */
  getAllDetectedSessions() {
    const activeSessions = Array.from(this.sessions.keys());
    const detectedSessions = Array.from(this.detectedSessions.values());

    // Combinar sessões ativas e detectadas
    const allSessions = new Map();

    // Adicionar sessões detectadas
    detectedSessions.forEach((session) => {
      allSessions.set(session.sessionName, session);
    });

    // Atualizar com status das sessões ativas
    activeSessions.forEach((sessionName) => {
      if (allSessions.has(sessionName)) {
        allSessions.get(sessionName).healthy = true;
        allSessions.get(sessionName).status = "active";
      } else {
        allSessions.set(sessionName, {
          sessionName,
          status: "active",
          healthy: true,
          detected: false,
          lastAttempt: new Date(),
        });
      }
    });

    return Array.from(allSessions.values());
  }

  /**
   * Para o gerenciador
   */
  async shutdown() {
    console.log("[SessionManager] Iniciando shutdown...");

    // Parar todos os health checks
    for (const timer of this.healthCheckTimers.values()) {
      clearInterval(timer);
    }
    this.healthCheckTimers.clear();

    // Fechar todas as sessões
    const sessionNames = Array.from(this.sessions.keys());
    for (const sessionName of sessionNames) {
      await this.cleanupSession(sessionName);
    }

    console.log("[SessionManager] Shutdown concluído");
  }

  /**
   * Inicializa sessões existentes baseado nas pastas de tokens
   */
  async initializeExistingSessions() {
    try {
      console.log("[SessionManager] Verificando sessões existentes...");

      const tokensPath = path.join(__dirname, "..", "..", "tokens");

      if (!fs.existsSync(tokensPath)) {
        console.log("[SessionManager] Pasta tokens não encontrada, criando...");
        fs.mkdirSync(tokensPath, { recursive: true });
        return;
      }

      const sessionFolders = fs
        .readdirSync(tokensPath, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

      if (sessionFolders.length === 0) {
        console.log("[SessionManager] Nenhuma sessão existente encontrada");
        return;
      }

      console.log(
        `[SessionManager] Encontradas ${
          sessionFolders.length
        } pastas de sessão: ${sessionFolders.join(", ")}`
      );

      // Tentativa de carregar cada sessão existente
      for (const sessionName of sessionFolders) {
        try {
          console.log(
            `[SessionManager] Tentando carregar sessão existente: ${sessionName}`
          );

          // Verificar se é uma pasta válida de sessão (contém SingletonLock)
          const sessionPath = path.join(tokensPath, sessionName);
          const lockFile = path.join(sessionPath, "SingletonLock");

          // Verificar se existe SingletonLock (arquivo ou link simbólico)
          let hasLock = false;
          try {
            const stat = fs.lstatSync(lockFile);
            hasLock = stat.isFile() || stat.isSymbolicLink();
          } catch (error) {
            hasLock = false;
          }

          if (hasLock) {
            console.log(
              `[SessionManager] Sessão ${sessionName} parece válida, tentando recuperar...`
            );

            // Registrar sessão detectada
            this.detectedSessions.set(sessionName, {
              sessionName,
              status: "loading",
              healthy: false,
              detected: true,
              lastAttempt: new Date(),
            });

            // Tentar criar/recuperar a sessão
            try {
              await this.recoverExistingSession(sessionName);
              // Se chegou até aqui, a sessão foi carregada com sucesso
              this.detectedSessions.set(sessionName, {
                sessionName,
                status: "loaded",
                healthy: true,
                detected: true,
                lastAttempt: new Date(),
              });
            } catch (error) {
              // Sessão foi detectada mas falhou ao carregar
              this.detectedSessions.set(sessionName, {
                sessionName,
                status: "failed",
                healthy: false,
                detected: true,
                lastAttempt: new Date(),
                error: error.message,
              });
            }
          } else {
            console.log(
              `[SessionManager] Sessão ${sessionName} inválida (sem SingletonLock), ignorando...`
            );
          }
        } catch (error) {
          console.warn(
            `[SessionManager] Erro ao carregar sessão ${sessionName}:`,
            error.message
          );
          // Continua para próxima sessão
        }
      }

      console.log(
        `[SessionManager] Inicialização concluída. ${this.sessions.size} sessões carregadas`
      );
    } catch (error) {
      console.error(
        "[SessionManager] Erro durante inicialização de sessões existentes:",
        error
      );
    }
  }

  /**
   * Recupera uma sessão existente
   */
  async recoverExistingSession(sessionName) {
    try {
      console.log(`[SessionManager] Recuperando sessão: ${sessionName}`);

      const client = await venom.create(
        sessionName,
        (qrCode) => {
          console.log(
            `[SessionManager] QR Code para recuperação de ${sessionName}`
          );
          SocketService.emitQRCode(sessionName, qrCode);
        },
        (statusSession, session) => {
          console.log(
            `[SessionManager] Status da sessão recuperada ${sessionName}:`,
            statusSession
          );
          SocketService.emitSessionStatusChange(sessionName, statusSession, {
            session,
          });
          this.handleStatusChange(sessionName, statusSession, session);
        },
        {
          multidevice: true,
          headless: "new",
          useChrome: false,
          devtools: false,
          debug: false,
          logQR: false,
          browserArgs: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--disable-gpu",
            "--disable-background-timer-throttling",
            "--disable-backgrounding-occluded-windows",
            "--disable-renderer-backgrounding",
            "--disable-features=TranslateUI",
            "--disable-extensions",
          ],
          refreshQR: 15000,
          autoClose: 60000,
        }
      );

      // Configurar handlers de erro
      this.setupErrorHandlers(client, sessionName);

      // Armazenar sessão
      this.sessions.set(sessionName, client);
      Session.add(sessionName, client);

      // Iniciar monitoramento de saúde
      this.startHealthCheck(sessionName);

      console.log(
        `[SessionManager] Sessão ${sessionName} recuperada com sucesso`
      );
      return client;
    } catch (error) {
      console.error(
        `[SessionManager] Erro ao recuperar sessão ${sessionName}:`,
        error
      );
      throw error;
    }
  }
}

module.exports = new SessionManager();
