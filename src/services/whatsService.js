const venom = require("venom-bot");
const SessionManager = require("./SessionManager");

class WhatsAppService {
  /**
   * Adiciona uma tarefa à fila de mensagens para a sessão especificada.
   */
  static async addToQueue(sessionName, type, params) {
    if (!sessionName || !type || !params) {
      throw new Error(
        "Parâmetros obrigatórios não fornecidos: sessionName, type, params"
      );
    }

    const client = sessions.get(sessionName);
    if (!client) {
      return { status: "error", message: "Sessão não encontrada" };
    }

    try {
      const queue = messageQueue.getQueue(sessionName);
      await new Promise((resolve, reject) => {
        queue.push({ type, client, ...params }, (err, result) =>
          err ? reject(err) : resolve(result)
        );
      });

      return { status: "success", message: `${type} adicionado na fila` };
    } catch (error) {
      return { status: "error", message: error.message };
    }
  }

  /**
   * Cria uma nova sessão do WhatsApp usando o SessionManager.
   */
  async createSession(sessionName, onQrCode, onStatusChange = null) {
    if (!sessionName || !onQrCode) {
      throw new Error(
        "Parâmetros obrigatórios não fornecidos: sessionName, onQrCode"
      );
    }

    return SessionManager.createSession(sessionName, onQrCode, onStatusChange);
  }

  /**
   * Verifica se um número é válido no WhatsApp.
   */
  async isValidWhatsAppNumber(client, phoneNumber) {
    if (!client || !phoneNumber) {
      throw new Error(
        "Parâmetros obrigatórios não fornecidos: client, phoneNumber"
      );
    }

    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      const profile = await client.checkNumberStatus(formattedNumber);
      return profile.status === 200;
    } catch (error) {
      console.error("Erro ao verificar número:", error);
      return false;
    }
  }

  /**
   * Envia uma mensagem de texto.
   */
  async sendTextMessage(client, phoneNumber, message) {
    if (!client || !phoneNumber || !message) {
      throw new Error(
        "Parâmetros obrigatórios não fornecidos: client, phoneNumber, message"
      );
    }

    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      const isValid = await this.isValidWhatsAppNumber(client, phoneNumber);
      if (!isValid) throw new Error("Número inválido no WhatsApp");

      return await client.sendText(formattedNumber, message);
    } catch (error) {
      console.error("Erro ao enviar mensagem de texto:", error);
      throw error;
    }
  }

  /**
   * Envia uma mensagem de texto com retry automático
   */
  async sendTextMessageWithRetry(sessionName, phoneNumber, message) {
    return this.executeWithRetry(sessionName, async (client) => {
      return this.sendTextMessage(client, phoneNumber, message);
    });
  }

  /**
   * Envia um PDF a partir de um caminho local.
   */
  async sendPdfFromPath(
    client,
    phoneNumber,
    filePath,
    fileName = "document",
    message = ""
  ) {
    if (!client || !phoneNumber || !filePath) {
      throw new Error(
        "Parâmetros obrigatórios não fornecidos: client, phoneNumber, filePath"
      );
    }

    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      const isValid = await this.isValidWhatsAppNumber(client, phoneNumber);
      if (!isValid) throw new Error("Número inválido no WhatsApp");

      return await client.sendFile(
        formattedNumber,
        filePath,
        fileName,
        message
      );
    } catch (error) {
      console.error("Erro ao enviar PDF:", error);
      throw error;
    }
  }

  /**
   * Envia um documento PDF codificado em base64.
   */
  async sendPdfDocument(
    client,
    phoneNumber,
    base64PDF,
    fileName = "document.pdf",
    message = ""
  ) {
    if (!client || !phoneNumber || !base64PDF) {
      throw new Error(
        "Parâmetros obrigatórios não fornecidos: client, phoneNumber, base64PDF"
      );
    }

    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      const isValid = await this.isValidWhatsAppNumber(client, phoneNumber);
      if (!isValid) throw new Error("Número inválido no WhatsApp");

      return await client.sendFileFromBase64(
        formattedNumber,
        base64PDF,
        fileName,
        message
      );
    } catch (error) {
      console.error("Erro ao enviar documento PDF:", error);
      throw error;
    }
  }

  /**
   * Envia uma imagem a partir de um caminho local.
   */
  async sendImage(client, phoneNumber, imagePath, caption = "") {
    if (!client || !phoneNumber || !imagePath) {
      throw new Error(
        "Parâmetros obrigatórios não fornecidos: client, phoneNumber, imagePath"
      );
    }

    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      const isValid = await this.isValidWhatsAppNumber(client, phoneNumber);
      if (!isValid) throw new Error("Número inválido no WhatsApp");

      return await client.sendImage(
        formattedNumber,
        imagePath,
        "image",
        caption
      );
    } catch (error) {
      console.error("Erro ao enviar imagem:", error);
      throw error;
    }
  }

  /**
   * Envia uma imagem codificada em base64.
   */
  async sendImageBase64(client, phoneNumber, base64Image, caption = "") {
    if (!client || !phoneNumber || !base64Image) {
      throw new Error(
        "Parâmetros obrigatórios não fornecidos: client, phoneNumber, base64Image"
      );
    }

    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      const isValid = await this.isValidWhatsAppNumber(client, phoneNumber);
      if (!isValid) throw new Error("Número inválido no WhatsApp");

      return await client.sendImageFromBase64(
        formattedNumber,
        base64Image,
        "image",
        caption
      );
    } catch (error) {
      console.error("Erro ao enviar imagem em base64:", error);
      throw error;
    }
  }

  /**
   * Formata um número de telefone para o formato utilizado pelo WhatsApp.
   */
  formatPhoneNumber(number) {
    return number.includes("@c.us") ? number : `${number}@c.us`;
  }

  /**
   * Valida os parâmetros obrigatórios.
   */
  validateParams(client, phoneNumber, filePath) {
    if (!client) throw new Error("Cliente não fornecido");
    if (!phoneNumber) throw new Error("Número de telefone não fornecido");
    if (!filePath) throw new Error("Caminho do arquivo não fornecido");
  }

  /**
   * Obtém uma sessão existente ou tenta recuperá-la
   */
  async getOrRecoverSession(sessionName) {
    let client = SessionManager.getSession(sessionName);

    if (!client) {
      console.log(
        `[WhatsAppService] Sessão ${sessionName} não encontrada, tentando recuperar...`
      );
      // Tenta criar uma nova sessão se não existir
      try {
        client = await this.createSession(sessionName, (qrCode) => {
          console.log(
            `[WhatsAppService] QR Code para recuperação da sessão ${sessionName}`
          );
        });
      } catch (error) {
        console.error(
          `[WhatsAppService] Erro ao recuperar sessão ${sessionName}:`,
          error
        );
        throw new Error(
          `Não foi possível recuperar a sessão ${sessionName}: ${error.message}`
        );
      }
    }

    return client;
  }

  /**
   * Verifica se uma sessão está saudável
   */
  async checkSessionHealth(sessionName) {
    try {
      const client = SessionManager.getSession(sessionName);
      if (!client) {
        return { healthy: false, reason: "Sessão não encontrada" };
      }

      // Tenta obter o estado da conexão
      const connectionState = await client.getConnectionState();
      return {
        healthy: connectionState === "CONNECTED",
        reason: connectionState,
        sessionName,
      };
    } catch (error) {
      return {
        healthy: false,
        reason: error.message,
        sessionName,
      };
    }
  }

  /**
   * Lista todas as sessões ativas
   */
  getActiveSessions() {
    return SessionManager.getActiveSessions();
  }

  /**
   * Lista todas as sessões detectadas (ativas e inativas)
   */
  getAllDetectedSessions() {
    return SessionManager.getAllDetectedSessions();
  }

  /**
   * Remove uma sessão específica
   */
  async removeSession(sessionName) {
    await SessionManager.cleanupSession(sessionName);
  }

  /**
   * Executa operação com retry automático em caso de erro
   */
  async executeWithRetry(sessionName, operation, maxRetries = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const client = await this.getOrRecoverSession(sessionName);
        return await operation(client);
      } catch (error) {
        lastError = error;
        console.warn(
          `[WhatsAppService] Tentativa ${attempt}/${maxRetries} falhou para ${sessionName}:`,
          error.message
        );

        // Se é um erro de sessão, tentar recuperar
        if (attempt < maxRetries && this.isSessionError(error)) {
          console.log(
            `[WhatsAppService] Tentando recuperar sessão ${sessionName}...`
          );
          await this.removeSession(sessionName);
          await new Promise((resolve) => setTimeout(resolve, 2000)); // Aguarda 2s
        }
      }
    }

    throw lastError;
  }

  /**
   * Verifica se um erro é relacionado à sessão
   */
  isSessionError(error) {
    const sessionErrors = [
      "Navigation timeout",
      "Page crashed",
      "Session closed",
      "Browser disconnected",
      "Target closed",
      "Protocol error",
      "Connection closed",
      "Evaluation failed",
      "Session not authenticated",
    ];

    return sessionErrors.some((sessionError) =>
      error.message.includes(sessionError)
    );
  }
}

module.exports = new WhatsAppService();
