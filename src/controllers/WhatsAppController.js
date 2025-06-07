const WhatsAppService = require("../services/whatsService.js");
const MenuService = require("../services/MenuService.js");
const Session = require("../models/Session");
const SessionCleaner = require("../utils/sessionCleaner");
const fs = require("fs");
const path = require("path");

class WhatsAppController {
  /**
   * Verifica se o arquivo SingletonLock existe para uma sessão.
   * @param {string} sessionName - Nome da sessão.
   * @returns {boolean} - Retorna true se o arquivo existir, caso contrário false.
   */
  fileSingletonLockExists(sessionName) {
    const filePath = path.join(
      __dirname,
      `../tokens/${sessionName}/SingletonLock`
    );
    return fs.existsSync(filePath);
  }

  async startSession(req, res) {
    const { sessionName = "default" } = req.body;
    const socketService = req.app.get("socketService");

    try {
      // Verificar se a sessão já existe
      if (Session.exists(sessionName)) {
        return res.json({
          status: "success",
          message: "Sessão já está ativa",
          sessionName,
        });
      }

      let qrCodeSent = false;

      const client = await WhatsAppService.createSession(
        sessionName,
        (qrCode) => {
          console.log("QR Code gerado para sessão:", sessionName);
          // Emitir QR Code via Socket.IO
          if (socketService && !qrCodeSent) {
            socketService.emitWhatsAppQR(qrCode);
            qrCodeSent = true;
          }
        }
      );

      if (client) {
        Session.add(sessionName, client);
        console.log(`Sessão ${sessionName} criada com sucesso`);

        // Configurar eventos do cliente
        client.onMessage(async (message) => {
          if (process.env.BOT_ATIVO === "S") {
            console.log("Bot ATIVO");
            try {
              if (MenuService.isDirectMessage(message)) {
                await MenuService.handleMessage(client, message);
              }
            } catch (error) {
              console.error("Erro ao processar a mensagem:", error);
              if (MenuService.isDirectMessage(message)) {
                await client.sendText(
                  message.from,
                  "Desculpe, ocorreu um erro. Por favor, tente novamente."
                );
              }
            }
          }

          // Emitir mensagem recebida via Socket.IO
          if (socketService) {
            socketService.emitWhatsAppMessage({
              from: message.from,
              body: message.body,
              timestamp: message.timestamp,
              isGroupMsg: message.isGroupMsg,
            });
          }

          console.log("Message received:", message);
        });

        // Verificar status inicial após criação
        setTimeout(async () => {
          try {
            const isConnected = await client.isConnected();
            console.log(
              `Status inicial da sessão ${sessionName}:`,
              isConnected ? "CONECTADO" : "DESCONECTADO"
            );

            if (isConnected && socketService) {
              socketService.emitWhatsAppConnected({
                sessionName,
                state: "CONNECTED",
                timestamp: new Date(),
              });
            }
          } catch (error) {
            console.log("Erro ao verificar status inicial:", error.message);
          }
        }, 3000);

        // Evento quando conectado
        try {
          client.onStateChange((state) => {
            console.log("State changed: ", state);
            if (socketService) {
              if (state === "CONNECTED") {
                socketService.emitWhatsAppConnected({
                  sessionName,
                  state,
                  timestamp: new Date(),
                });
              } else if (state === "DISCONNECTED") {
                socketService.emitWhatsAppDisconnected();
              }
            }
          });
        } catch (error) {
          console.log("onStateChange não disponível:", error.message);
        }
      }

      res.json({
        status: "success",
        message: "Sessão iniciada com sucesso",
        sessionName,
      });
    } catch (error) {
      console.error("Erro ao iniciar sessão:", error);
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  async getStatus(req, res) {
    const { sessionName = "default" } = req.query;

    try {
      const client = Session.get(sessionName);
      if (!client) {
        return res.json({
          status: "success",
          data: {
            sessionName,
            connected: false,
            state: "DISCONNECTED",
          },
        });
      }

      // Verificar se o cliente ainda existe e está conectado
      let isConnected = false;
      let state = "DISCONNECTED";

      try {
        isConnected = await client.isConnected();
        state = await client.getConnectionState();
      } catch (error) {
        console.log(
          `Cliente ${sessionName} não está mais válido, removendo...`
        );
        Session.remove(sessionName);
        isConnected = false;
        state = "DISCONNECTED";
      }

      res.json({
        status: "success",
        data: {
          sessionName,
          connected: isConnected,
          state: state || "DISCONNECTED",
        },
      });
    } catch (error) {
      console.error("Erro ao verificar status:", error);
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  async disconnectSession(req, res) {
    const { sessionName = "default" } = req.body;
    const socketService = req.app.get("socketService");

    try {
      const client = Session.get(sessionName);
      if (!client) {
        return res.json({
          status: "success",
          message: "Sessão não encontrada ou já desconectada",
        });
      }

      await client.close();
      Session.remove(sessionName);

      // Emitir desconexão via Socket.IO
      if (socketService) {
        socketService.emitWhatsAppDisconnected();
      }

      res.json({
        status: "success",
        message: "Sessão desconectada com sucesso",
        sessionName,
      });
    } catch (error) {
      console.error("Erro ao desconectar sessão:", error);
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  async generateQRCode(req, res) {
    const { sessionName = "default" } = req.body;
    const socketService = req.app.get("socketService");

    try {
      // Se a sessão já existe, desconectar primeiro
      if (Session.exists(sessionName)) {
        const client = Session.get(sessionName);
        await client.close();
        Session.remove(sessionName);
      }

      // Criar nova sessão para gerar QR Code
      const client = await WhatsAppService.createSession(
        sessionName,
        (qrCode) => {
          // Emitir QR Code via Socket.IO
          if (socketService) {
            socketService.emitWhatsAppQR(qrCode);
          }

          // Também retornar no response para compatibilidade
          res.json({
            status: "success",
            qrCode,
            message: "QR Code gerado com sucesso",
          });
        }
      );

      Session.add(sessionName, client);
    } catch (error) {
      console.error("Erro ao gerar QR Code:", error);
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  async listSessions(req, res) {
    try {
      const sessions = Session.getAllSessions();
      const sessionDetails = [];

      for (const sessionName of sessions) {
        const client = Session.get(sessionName);
        let isConnected = false;
        let state = "UNKNOWN";

        try {
          isConnected = await client.isConnected();
          state = await client.getConnectionState();
        } catch (error) {
          console.error(`Erro ao verificar sessão ${sessionName}:`, error);
        }

        sessionDetails.push({
          sessionName,
          connected: isConnected,
          state,
        });
      }

      res.json({
        status: "success",
        data: {
          totalSessions: sessions.length,
          sessions: sessionDetails,
        },
      });
    } catch (error) {
      console.error("Erro ao listar sessões:", error);
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  async sendMessage(req, res) {
    try {
      const { number, message, sessionName = "default" } = req.body;
      const client = Session.get(sessionName) || req.whatsappClient;

      if (!client) {
        return res.status(400).json({
          status: "error",
          message: "Sessão não encontrada. Conecte o WhatsApp primeiro.",
        });
      }

      const isValidNumber = await WhatsAppService.isValidWhatsAppNumber(
        client,
        number
      );
      if (!isValidNumber) {
        return res.status(400).json({
          status: "error",
          message: "Número de WhatsApp inválido",
        });
      }

      const result = await WhatsAppService.sendTextMessage(
        client,
        number,
        message
      );

      res.json({
        status: "success",
        message: "Mensagem enviada com sucesso",
        data: result,
      });
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  async sendBulkMessage(req, res) {
    try {
      const {
        phoneNumbers,
        message,
        delay = 1000,
        sessionName = "default",
      } = req.body;
      const client = Session.get(sessionName);

      if (!client) {
        return res.status(400).json({
          status: "error",
          message: "Sessão não encontrada. Conecte o WhatsApp primeiro.",
        });
      }

      if (!Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "Lista de telefones deve ser um array não vazio",
        });
      }

      const results = [];

      for (let i = 0; i < phoneNumbers.length; i++) {
        const number = phoneNumbers[i];

        try {
          const isValid = await WhatsAppService.isValidWhatsAppNumber(
            client,
            number
          );
          if (!isValid) {
            results.push({
              number,
              status: "error",
              message: "Número inválido",
            });
            continue;
          }

          const result = await WhatsAppService.sendTextMessage(
            client,
            number,
            message
          );
          results.push({
            number,
            status: "success",
            message: "Enviado com sucesso",
            data: result,
          });

          // Delay entre envios (exceto no último)
          if (i < phoneNumbers.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        } catch (error) {
          results.push({
            number,
            status: "error",
            message: error.message,
          });
        }
      }

      const successCount = results.filter((r) => r.status === "success").length;
      const errorCount = results.filter((r) => r.status === "error").length;

      res.json({
        status: "success",
        message: `Envio em massa concluído: ${successCount} sucessos, ${errorCount} erros`,
        data: {
          total: phoneNumbers.length,
          success: successCount,
          errors: errorCount,
          results,
        },
      });
    } catch (error) {
      console.error("Erro no envio em massa:", error);
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  async checkNumber(req, res) {
    try {
      const { number, sessionName = "default" } = req.body;
      const client = Session.get(sessionName) || req.whatsappClient;

      if (!client) {
        return res.status(400).json({
          status: "error",
          message: "Sessão não encontrada. Conecte o WhatsApp primeiro.",
        });
      }

      const isValid = await WhatsAppService.isValidWhatsAppNumber(
        client,
        number
      );
      res.json({
        status: "success",
        data: {
          number,
          isValid,
          message: isValid
            ? "Número de WhatsApp válido"
            : "Número de WhatsApp inválido",
        },
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  async sendPdf(req, res) {
    try {
      const {
        number,
        message,
        base64PDF,
        pdfPath,
        fileName,
        sessionName = "default",
      } = req.body;
      const client = Session.get(sessionName) || req.whatsappClient;

      if (!client) {
        return res.status(400).json({
          status: "error",
          message: "Sessão não encontrada. Conecte o WhatsApp primeiro.",
        });
      }

      const isValidNumber = await WhatsAppService.isValidWhatsAppNumber(
        client,
        number
      );
      if (!isValidNumber) {
        return res.status(400).json({
          status: "error",
          message: "Número de WhatsApp inválido",
        });
      }

      if (!base64PDF && !pdfPath) {
        return res.status(400).json({
          status: "error",
          message: "É necessário fornecer base64PDF ou pdfPath",
        });
      }

      let result;
      if (base64PDF) {
        result = await WhatsAppService.sendPdfDocument(
          client,
          number,
          base64PDF,
          fileName,
          message
        );
      } else {
        result = await WhatsAppService.sendPdfFromPath(
          client,
          number,
          pdfPath,
          fileName,
          message
        );
      }

      res.json({
        status: "success",
        message: "PDF enviado com sucesso",
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  async sendImage(req, res) {
    try {
      const {
        number,
        caption,
        base64Image,
        imagePath,
        sessionName = "default",
      } = req.body;
      const client = Session.get(sessionName) || req.whatsappClient;

      if (!client) {
        return res.status(400).json({
          status: "error",
          message: "Sessão não encontrada. Conecte o WhatsApp primeiro.",
        });
      }

      const isValidNumber = await WhatsAppService.isValidWhatsAppNumber(
        client,
        number
      );

      if (!isValidNumber) {
        return res.status(400).json({
          status: "error",
          message: "Número de WhatsApp inválido",
        });
      }

      if (!base64Image && !imagePath) {
        return res.status(400).json({
          status: "error",
          message: "É necessário fornecer base64Image ou imagePath",
        });
      }

      let result;
      if (base64Image) {
        result = await WhatsAppService.sendImageBase64(
          client,
          number,
          base64Image,
          caption
        );
      } else {
        result = await WhatsAppService.sendImage(
          client,
          number,
          imagePath,
          caption
        );
      }

      res.json({
        status: "success",
        message: "Imagem enviada com sucesso",
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  async syncStatus(req, res) {
    const { sessionName = "default" } = req.body;
    const socketService = req.app.get("socketService");

    try {
      const client = Session.get(sessionName);

      if (!client) {
        // Se não há sessão, emitir desconectado
        if (socketService) {
          socketService.emitWhatsAppDisconnected();
        }
        return res.json({
          status: "success",
          message: "Status sincronizado - sessão não encontrada",
          data: { connected: false, state: "DISCONNECTED" },
        });
      }

      // Verificar se o cliente está conectado
      let isConnected = false;
      let state = "DISCONNECTED";

      try {
        isConnected = await client.isConnected();
        state = await client.getConnectionState();
      } catch (error) {
        console.log(
          `Cliente ${sessionName} não está mais válido, removendo...`
        );
        Session.remove(sessionName);
        isConnected = false;
        state = "DISCONNECTED";
      }

      // Emitir evento via Socket.IO
      if (socketService) {
        if (isConnected) {
          socketService.emitWhatsAppConnected({
            sessionName,
            state,
            timestamp: new Date(),
          });
        } else {
          socketService.emitWhatsAppDisconnected();
        }
      }

      res.json({
        status: "success",
        message: "Status sincronizado com sucesso",
        data: {
          sessionName,
          connected: isConnected,
          state: state || "DISCONNECTED",
        },
      });
    } catch (error) {
      console.error("Erro ao sincronizar status:", error);
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  async cleanSingletonLocks(req, res) {
    try {
      const { sessionName } = req.body;

      if (sessionName) {
        // Limpar sessão específica
        console.log(
          `🧹 Limpando SingletonLock para sessão específica: ${sessionName}`
        );
        SessionCleaner.cleanSingletonLock(sessionName);
        SessionCleaner.cleanSessionCache(sessionName);

        res.json({
          status: "success",
          message: `SingletonLock limpo para a sessão: ${sessionName}`,
          data: { sessionName },
        });
      } else {
        // Limpar todas as sessões
        console.log(`🧹 Limpando SingletonLock para todas as sessões`);
        SessionCleaner.cleanAllSingletonLocks();

        res.json({
          status: "success",
          message: "SingletonLock limpo para todas as sessões",
          data: { action: "clean_all" },
        });
      }
    } catch (error) {
      console.error("Erro ao limpar SingletonLock:", error);
      res.status(500).json({
        status: "error",
        message: "Erro ao limpar arquivos SingletonLock: " + error.message,
      });
    }
  }
}

module.exports = new WhatsAppController();
