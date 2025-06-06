const venom = require("venom-bot");

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
   * Cria uma nova sessão do WhatsApp.
   */
  async createSession(sessionName, onQrCode) {
    if (!sessionName || !onQrCode) {
      throw new Error(
        "Parâmetros obrigatórios não fornecidos: sessionName, onQrCode"
      );
    }

    return venom.create(
      sessionName,
      onQrCode,
      (statusSession, session) => {
        console.log("Status da sessão:", statusSession);
        if (statusSession === "inChat" || statusSession === "qrReadSuccess") {
          console.log("WhatsApp conectado com sucesso!");
        }
      },
      {
        multidevice: true,
        headless: "new",
        devtools: false,
        useChrome: true,
        debug: false,
        logQR: true,
        browserWS: "",
        addProxy: [""],
        puppeteerOptions: {
          userDataDir: `./tokens/${sessionName}`,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--disable-gpu",
          ],
        },
        session: sessionName,
      }
    );
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
}

module.exports = new WhatsAppService();
