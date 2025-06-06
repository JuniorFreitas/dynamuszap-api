const { Server } = require("socket.io");

class SocketService {
  constructor() {
    this.io = null;
    this.connectedClients = new Map();
  }

  /**
   * Inicializa o Socket.IO com o servidor HTTP
   */
  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
      transports: ["websocket", "polling"],
    });

    this.setupEventHandlers();
    console.log("[SocketService] Socket.IO inicializado");
  }

  /**
   * Configura os handlers de eventos do Socket.IO
   */
  setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log(`[SocketService] Cliente conectado: ${socket.id}`);

      // Armazenar informações do cliente
      this.connectedClients.set(socket.id, {
        socketId: socket.id,
        connectedAt: new Date(),
        subscribedSessions: new Set(),
      });

      // Handler para subscrever em uma sessão específica
      socket.on("subscribe-session", (sessionName) => {
        this.subscribeToSession(socket, sessionName);
      });

      // Handler para desinscrever de uma sessão
      socket.on("unsubscribe-session", (sessionName) => {
        this.unsubscribeFromSession(socket, sessionName);
      });

      // Handler para solicitar status de todas as sessões
      socket.on("get-all-sessions", () => {
        this.sendAllSessionsStatus(socket);
      });

      // Handler para solicitar status de uma sessão específica
      socket.on("get-session-status", (sessionName) => {
        this.sendSessionStatus(socket, sessionName);
      });

      // Handler para solicitar renovação de QR Code
      socket.on("request-qr-renewal", (sessionName) => {
        this.handleQRRenewal(socket, sessionName);
      });

      // Handler para desconexão
      socket.on("disconnect", () => {
        console.log(`[SocketService] Cliente desconectado: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });

      // Enviar status inicial das sessões conectadas
      this.sendWelcomeMessage(socket);
    });
  }

  /**
   * Inscreve um cliente para receber eventos de uma sessão específica
   */
  subscribeToSession(socket, sessionName) {
    const room = `session:${sessionName}`;
    socket.join(room);

    const client = this.connectedClients.get(socket.id);
    if (client) {
      client.subscribedSessions.add(sessionName);
    }

    console.log(
      `[SocketService] Cliente ${socket.id} inscrito na sessão ${sessionName}`
    );

    socket.emit("subscription-confirmed", {
      sessionName,
      message: `Inscrito com sucesso na sessão ${sessionName}`,
    });
  }

  /**
   * Desinscreve um cliente de uma sessão
   */
  unsubscribeFromSession(socket, sessionName) {
    const room = `session:${sessionName}`;
    socket.leave(room);

    const client = this.connectedClients.get(socket.id);
    if (client) {
      client.subscribedSessions.delete(sessionName);
    }

    console.log(
      `[SocketService] Cliente ${socket.id} desinscrito da sessão ${sessionName}`
    );

    socket.emit("unsubscription-confirmed", {
      sessionName,
      message: `Desinscrito da sessão ${sessionName}`,
    });
  }

  /**
   * Envia mensagem de boas-vindas com informações do servidor
   */
  sendWelcomeMessage(socket) {
    socket.emit("welcome", {
      message: "Conectado ao DynamusZap API Socket.IO",
      socketId: socket.id,
      connectedAt: new Date(),
      availableEvents: [
        "qr-code",
        "qr-code-renewal",
        "qr-renewal-requested",
        "session-status-change",
        "session-reconnecting",
        "session-connected",
        "session-error",
        "message-received",
        "message-sent",
        "session-health-check",
      ],
    });
  }

  /**
   * Envia status de todas as sessões para um cliente
   */
  async sendAllSessionsStatus(socket) {
    try {
      const WhatsAppService = require("./whatsService");
      const sessions = WhatsAppService.getActiveSessions();

      const sessionStatuses = await Promise.all(
        sessions.map(async (sessionName) => {
          return await WhatsAppService.checkSessionHealth(sessionName);
        })
      );

      socket.emit("all-sessions-status", {
        totalSessions: sessions.length,
        sessions: sessionStatuses,
        timestamp: new Date(),
      });
    } catch (error) {
      socket.emit("error", {
        message: "Erro ao obter status das sessões",
        error: error.message,
      });
    }
  }

  /**
   * Envia status de uma sessão específica
   */
  async sendSessionStatus(socket, sessionName) {
    try {
      const WhatsAppService = require("./whatsService");
      const status = await WhatsAppService.checkSessionHealth(sessionName);

      socket.emit("session-status", status);
    } catch (error) {
      socket.emit("error", {
        message: `Erro ao obter status da sessão ${sessionName}`,
        error: error.message,
      });
    }
  }

  /**
   * Manipula solicitação de renovação de QR Code
   */
  async handleQRRenewal(socket, sessionName) {
    try {
      console.log(
        `[SocketService] Solicitação de renovação de QR Code para: ${sessionName}`
      );

      const WhatsAppService = require("./whatsService");

      // Verificar se a sessão existe
      const isSessionActive =
        WhatsAppService.getActiveSessions().includes(sessionName);

      if (!isSessionActive) {
        socket.emit("error", {
          message: `Sessão ${sessionName} não encontrada ou não ativa`,
          type: "qr-renewal-error",
        });
        return;
      }

      // Emitir evento de confirmação que a renovação foi solicitada
      socket.emit("qr-renewal-requested", {
        sessionName,
        message: `Renovação de QR Code solicitada para ${sessionName}`,
        timestamp: new Date(),
      });

      // Broadcast para outros clientes que a renovação foi solicitada
      this.io.to(`session:${sessionName}`).emit("qr-renewal-requested", {
        sessionName,
        requestedBy: socket.id,
        timestamp: new Date(),
      });

      // Tentar forçar uma nova geração de QR Code
      // Note: Isso depende da implementação do Venom-bot, que gera QR codes automaticamente
      // Vamos emitir um evento para indicar que uma renovação foi solicitada
      console.log(
        `[SocketService] QR Code renewal solicitado para ${sessionName}`
      );
    } catch (error) {
      console.error(
        `[SocketService] Erro ao processar renovação de QR Code para ${sessionName}:`,
        error
      );

      socket.emit("error", {
        message: `Erro ao solicitar renovação de QR Code: ${error.message}`,
        type: "qr-renewal-error",
        sessionName,
      });
    }
  }

  // ===== EVENTOS PARA O SESSIONMANAGER =====

  /**
   * Emite evento de QR Code para uma sessão
   */
  emitQRCode(sessionName, qrCode) {
    if (!this.io) return;

    const data = {
      sessionName,
      qrCode,
      timestamp: new Date(),
    };

    // Emitir para todos os clientes inscritos na sessão
    this.io.to(`session:${sessionName}`).emit("qr-code", data);

    // Emitir para todos os clientes (broadcast)
    this.io.emit("qr-code-broadcast", data);

    console.log(`[SocketService] QR Code emitido para sessão ${sessionName}`);
  }

  /**
   * Emite evento de QR Code renovado para uma sessão
   */
  emitQRCodeRenewal(sessionName, qrCode) {
    if (!this.io) return;

    const data = {
      sessionName,
      qrCode,
      timestamp: new Date(),
      renewed: true,
    };

    // Emitir para todos os clientes inscritos na sessão
    this.io.to(`session:${sessionName}`).emit("qr-code-renewal", data);

    // Emitir para todos os clientes (broadcast)
    this.io.emit("qr-code-renewal-broadcast", data);

    console.log(
      `[SocketService] QR Code renovado emitido para sessão ${sessionName}`
    );
  }

  /**
   * Emite evento de QR Code expirado
   */
  emitQRCodeExpired(sessionName) {
    if (!this.io) return;

    const data = {
      sessionName,
      timestamp: new Date(),
    };

    // Emitir para todos os clientes inscritos na sessão
    this.io.to(`session:${sessionName}`).emit("qr-code-expired", data);

    // Emitir para todos os clientes (broadcast)
    this.io.emit("qr-code-expired-broadcast", data);

    console.log(
      `[SocketService] QR Code expirado emitido para sessão ${sessionName}`
    );
  }

  /**
   * Emite mudança de status da sessão
   */
  emitSessionStatusChange(sessionName, status, details = {}) {
    if (!this.io) return;

    const data = {
      sessionName,
      status,
      details,
      timestamp: new Date(),
    };

    this.io.to(`session:${sessionName}`).emit("session-status-change", data);
    this.io.emit("session-status-broadcast", data);

    console.log(
      `[SocketService] Status da sessão ${sessionName} alterado para: ${status}`
    );
  }

  /**
   * Emite evento de reconexão da sessão
   */
  emitSessionReconnecting(sessionName, attempt, maxAttempts, delay) {
    if (!this.io) return;

    const data = {
      sessionName,
      attempt,
      maxAttempts,
      delay,
      timestamp: new Date(),
    };

    this.io.to(`session:${sessionName}`).emit("session-reconnecting", data);
    this.io.emit("session-reconnecting-broadcast", data);

    console.log(
      `[SocketService] Sessão ${sessionName} reconectando - tentativa ${attempt}/${maxAttempts}`
    );
  }

  /**
   * Emite evento de sessão conectada com sucesso
   */
  emitSessionConnected(sessionName) {
    if (!this.io) return;

    const data = {
      sessionName,
      timestamp: new Date(),
    };

    this.io.to(`session:${sessionName}`).emit("session-connected", data);
    this.io.emit("session-connected-broadcast", data);

    console.log(`[SocketService] Sessão ${sessionName} conectada com sucesso`);
  }

  /**
   * Emite evento de erro da sessão
   */
  emitSessionError(sessionName, error, critical = false) {
    if (!this.io) return;

    const data = {
      sessionName,
      error: {
        message: error.message,
        stack: error.stack,
        critical,
      },
      timestamp: new Date(),
    };

    this.io.to(`session:${sessionName}`).emit("session-error", data);
    this.io.emit("session-error-broadcast", data);

    console.log(
      `[SocketService] Erro ${
        critical ? "crítico" : "normal"
      } na sessão ${sessionName}: ${error.message}`
    );
  }

  /**
   * Emite evento de mensagem recebida
   */
  emitMessageReceived(sessionName, message) {
    if (!this.io) return;

    const data = {
      sessionName,
      message: {
        from: message.from,
        body: message.body,
        timestamp: message.timestamp,
        isGroup: message.isGroupMsg,
      },
      timestamp: new Date(),
    };

    this.io.to(`session:${sessionName}`).emit("message-received", data);

    console.log(
      `[SocketService] Mensagem recebida na sessão ${sessionName} de ${message.from}`
    );
  }

  /**
   * Emite evento de mensagem enviada
   */
  emitMessageSent(sessionName, to, message, result) {
    if (!this.io) return;

    const data = {
      sessionName,
      to,
      message,
      result,
      timestamp: new Date(),
    };

    this.io.to(`session:${sessionName}`).emit("message-sent", data);

    console.log(
      `[SocketService] Mensagem enviada da sessão ${sessionName} para ${to}`
    );
  }

  /**
   * Emite resultado do health check
   */
  emitHealthCheck(sessionName, healthy, reason) {
    if (!this.io) return;

    const data = {
      sessionName,
      healthy,
      reason,
      timestamp: new Date(),
    };

    this.io.to(`session:${sessionName}`).emit("session-health-check", data);

    // Só fazer broadcast se não estiver saudável
    if (!healthy) {
      this.io.emit("session-health-check-broadcast", data);
    }
  }

  // ===== MÉTODOS UTILITÁRIOS =====

  /**
   * Obtém estatísticas dos clientes conectados
   */
  getConnectionStats() {
    if (!this.io) return null;

    const clients = Array.from(this.connectedClients.values());
    const totalConnections = clients.length;
    const subscriptionsCount = clients.reduce((acc, client) => {
      return acc + client.subscribedSessions.size;
    }, 0);

    return {
      totalConnections,
      subscriptionsCount,
      clients: clients.map((client) => ({
        socketId: client.socketId,
        connectedAt: client.connectedAt,
        subscribedSessions: Array.from(client.subscribedSessions),
      })),
    };
  }

  /**
   * Envia broadcast para todos os clientes conectados
   */
  broadcast(event, data) {
    if (!this.io) return;

    this.io.emit(event, {
      ...data,
      timestamp: new Date(),
    });
  }

  /**
   * Envia mensagem para clientes de uma sessão específica
   */
  emitToSession(sessionName, event, data) {
    if (!this.io) return;

    this.io.to(`session:${sessionName}`).emit(event, {
      ...data,
      sessionName,
      timestamp: new Date(),
    });
  }

  /**
   * Verifica se o Socket.IO está inicializado
   */
  isInitialized() {
    return this.io !== null;
  }
}

module.exports = new SocketService();
