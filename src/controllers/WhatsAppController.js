const WhatsAppService = require("../services/whatsService.js");
const MenuService = require("../services/MenuService.js");
const SessionManager = require("../services/SessionManager.js");
const SocketService = require("../services/SocketService.js");
const Session = require("../models/Session");
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
    const { sessionName } = req.body;

    try {
      // Constrói o caminho do diretório da sessão
      const lockDirPath = path.resolve(
        __dirname,
        "..",
        "..",
        "tokens",
        sessionName
      );

      // Responder imediatamente que a sessão está sendo criada
      res.json({
        status: "success",
        message: "Sessão está sendo criada. QR Code será enviado via Socket.IO",
        sessionName,
      });

      const client = await WhatsAppService.createSession(
        sessionName,
        (qrCode) => {
          // QR Code será emitido automaticamente via SocketService no SessionManager
          console.log(`[Controller] QR Code gerado para ${sessionName}`);
        },
        (statusSession, session) => {
          console.log(
            `[Controller] Status da sessão ${sessionName}:`,
            statusSession
          );
        }
      );

      // O SessionManager já adiciona à Session internamente

      // Configurar handlers de mensagem com tratamento robusto de erros
      client.onMessage(async (message) => {
        // Emitir evento de mensagem recebida via Socket.IO
        SocketService.emitMessageReceived(sessionName, message);

        if (process.env.BOT_ATIVO === "S") {
          console.log("Bot ATIVO");
          try {
            if (MenuService.isDirectMessage(message)) {
              await MenuService.handleMessage(client, message);
            }
            // Mensagens de grupo são silenciosamente ignoradas
          } catch (error) {
            console.error("Erro ao processar a mensagem:", error);
            SocketService.emitSessionError(sessionName, error, false);

            // Só envia mensagem de erro para mensagens diretas
            if (MenuService.isDirectMessage(message)) {
              try {
                const errorResponse = await client.sendText(
                  message.from,
                  "Desculpe, ocorreu um erro. Por favor, tente novamente."
                );
                // Emitir evento de mensagem enviada
                SocketService.emitMessageSent(
                  sessionName,
                  message.from,
                  "Erro: mensagem de erro automática",
                  errorResponse
                );
              } catch (sendError) {
                console.error("Erro ao enviar mensagem de erro:", sendError);
                SocketService.emitSessionError(sessionName, sendError, true);
                // Se falhar ao enviar a mensagem de erro, pode indicar problema na sessão
                console.warn(
                  `[Controller] Possível problema na sessão ${sessionName}, verificando saúde...`
                );
              }
            }
          }
        } else {
          console.log("Bot INATIVO");
          console.log("Message received:", message);
        }
      });
    } catch (error) {
      console.error(
        `[Controller] Erro ao iniciar sessão ${sessionName}:`,
        error
      );
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  async sendMessage(req, res) {
    try {
      const { number, message } = req.body;
      const client = req.whatsappClient;
      const sessionName = req.params.sessionName;

      const isValidNumber = await WhatsAppService.isValidWhatsAppNumber(
        client,
        number
      );
      if (!isValidNumber) {
        // Emitir erro via Socket.IO
        SocketService.emitToSession(sessionName, "message-send-error", {
          error: "Número de WhatsApp inválido",
          number,
          timestamp: new Date(),
        });

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

      // Emitir evento de mensagem enviada via Socket.IO
      SocketService.emitMessageSent(sessionName, number, message, result);

      res.json({
        status: "success",
        message: "Mensagem enviada com sucesso",
        data: result,
      });
    } catch (error) {
      // Emitir erro via Socket.IO
      SocketService.emitToSession(
        req.params.sessionName,
        "message-send-error",
        {
          error: error.message,
          number: req.body.number,
          timestamp: new Date(),
        }
      );

      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  async checkNumber(req, res) {
    try {
      const { number } = req.body;
      const client = req.whatsappClient;

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
      const { number, message, base64PDF, pdfPath, fileName } = req.body;
      const client = req.whatsappClient;
      const sessionName = req.params.sessionName;

      const isValidNumber = await WhatsAppService.isValidWhatsAppNumber(
        client,
        number
      );
      if (!isValidNumber) {
        SocketService.emitToSession(sessionName, "file-send-error", {
          error: "Número de WhatsApp inválido",
          number,
          fileType: "PDF",
          timestamp: new Date(),
        });

        return res.status(400).json({
          status: "error",
          message: "Número de WhatsApp inválido",
        });
      }

      if (!base64PDF && !pdfPath) {
        SocketService.emitToSession(sessionName, "file-send-error", {
          error: "É necessário fornecer base64PDF ou pdfPath",
          number,
          fileType: "PDF",
          timestamp: new Date(),
        });

        return res.status(400).json({
          status: "error",
          message: "É necessário fornecer base64PDF ou pdfPath",
        });
      }

      // Emitir evento de início de envio
      SocketService.emitToSession(sessionName, "file-send-start", {
        number,
        fileType: "PDF",
        fileName: fileName || "document.pdf",
        timestamp: new Date(),
      });

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

      // Emitir evento de sucesso
      SocketService.emitToSession(sessionName, "file-send-success", {
        number,
        fileType: "PDF",
        fileName: fileName || "document.pdf",
        result,
        timestamp: new Date(),
      });

      res.json({
        status: "success",
        message: "PDF enviado com sucesso",
        data: result,
      });
    } catch (error) {
      SocketService.emitToSession(req.params.sessionName, "file-send-error", {
        error: error.message,
        number: req.body.number,
        fileType: "PDF",
        timestamp: new Date(),
      });

      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  async sendImage(req, res) {
    try {
      const { number, caption, base64Image, imagePath } = req.body;
      const client = req.whatsappClient;
      const sessionName = req.params.sessionName;

      const isValidNumber = await WhatsAppService.isValidWhatsAppNumber(
        client,
        number
      );

      if (!isValidNumber) {
        SocketService.emitToSession(sessionName, "file-send-error", {
          error: "Número de WhatsApp inválido",
          number,
          fileType: "IMAGE",
          timestamp: new Date(),
        });

        return res.status(400).json({
          status: "error",
          message: "Número de WhatsApp inválido",
        });
      }

      if (!base64Image && !imagePath) {
        SocketService.emitToSession(sessionName, "file-send-error", {
          error: "É necessário fornecer base64Image ou imagePath",
          number,
          fileType: "IMAGE",
          timestamp: new Date(),
        });

        return res.status(400).json({
          status: "error",
          message: "É necessário fornecer base64Image ou imagePath",
        });
      }

      // Emitir evento de início de envio
      SocketService.emitToSession(sessionName, "file-send-start", {
        number,
        fileType: "IMAGE",
        caption,
        timestamp: new Date(),
      });

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

      // Emitir evento de sucesso
      SocketService.emitToSession(sessionName, "file-send-success", {
        number,
        fileType: "IMAGE",
        caption,
        result,
        timestamp: new Date(),
      });

      res.json({
        status: "success",
        message: "Imagem enviada com sucesso",
        data: result,
      });
    } catch (error) {
      SocketService.emitToSession(req.params.sessionName, "file-send-error", {
        error: error.message,
        number: req.body.number,
        fileType: "IMAGE",
        timestamp: new Date(),
      });

      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  async getSessionStatus(req, res) {
    try {
      const { sessionName } = req.params;
      const health = await WhatsAppService.checkSessionHealth(sessionName);

      res.json({
        status: "success",
        data: health,
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  async getAllSessions(req, res) {
    try {
      // Obter todas as sessões detectadas (ativas e inativas)
      const detectedSessions = WhatsAppService.getAllDetectedSessions();

      // Para sessões ativas, verificar a saúde
      const sessionStatuses = await Promise.all(
        detectedSessions.map(async (session) => {
          if (session.healthy && session.status === "active") {
            // Verificar saúde para sessões ativas
            const health = await WhatsAppService.checkSessionHealth(
              session.sessionName
            );
            return health;
          } else {
            // Retornar status das sessões detectadas mas não ativas
            return {
              sessionName: session.sessionName,
              healthy: session.healthy,
              reason:
                session.status === "failed" ? session.error : session.status,
              detected: session.detected,
              lastAttempt: session.lastAttempt,
            };
          }
        })
      );

      res.json({
        status: "success",
        data: {
          totalSessions: sessionStatuses.length,
          sessions: sessionStatuses,
        },
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  async restartSession(req, res) {
    try {
      const { sessionName } = req.params;

      // Emitir evento de início do restart
      SocketService.emitToSession(sessionName, "session-restart-start", {
        sessionName,
        timestamp: new Date(),
      });

      // Broadcast para todos os clientes
      SocketService.broadcast("session-restart-start", {
        sessionName,
        timestamp: new Date(),
      });

      // Remove a sessão atual
      await WhatsAppService.removeSession(sessionName);

      // Aguarda um pouco antes de recriar
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Cria nova sessão
      const client = await WhatsAppService.createSession(
        sessionName,
        (qrCode) => {
          // QR Code será emitido automaticamente via SocketService
          console.log(
            `[Controller] QR Code gerado para restart de ${sessionName}`
          );
        },
        (statusSession, session) => {
          console.log(
            `[Controller] Status da sessão ${sessionName} após restart:`,
            statusSession
          );
        }
      );

      // Emitir evento de sucesso do restart
      SocketService.emitToSession(sessionName, "session-restart-success", {
        sessionName,
        timestamp: new Date(),
      });

      // Broadcast para todos os clientes
      SocketService.broadcast("session-restart-success", {
        sessionName,
        timestamp: new Date(),
      });

      res.json({
        status: "success",
        message: `Sessão ${sessionName} reiniciada com sucesso`,
        data: { sessionName },
      });
    } catch (error) {
      // Emitir evento de erro do restart
      SocketService.emitToSession(
        req.params.sessionName,
        "session-restart-error",
        {
          sessionName: req.params.sessionName,
          error: error.message,
          timestamp: new Date(),
        }
      );

      // Broadcast para todos os clientes
      SocketService.broadcast("session-restart-error", {
        sessionName: req.params.sessionName,
        error: error.message,
        timestamp: new Date(),
      });

      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  async removeSession(req, res) {
    try {
      const { sessionName } = req.params;

      // Emitir evento de início da remoção
      SocketService.emitToSession(sessionName, "session-remove-start", {
        sessionName,
        timestamp: new Date(),
      });

      // Broadcast para todos os clientes
      SocketService.broadcast("session-remove-start", {
        sessionName,
        timestamp: new Date(),
      });

      await WhatsAppService.removeSession(sessionName);

      // Emitir evento de sucesso da remoção
      SocketService.broadcast("session-removed", {
        sessionName,
        timestamp: new Date(),
      });

      res.json({
        status: "success",
        message: `Sessão ${sessionName} removida com sucesso`,
      });
    } catch (error) {
      // Emitir evento de erro da remoção
      SocketService.emitToSession(
        req.params.sessionName,
        "session-remove-error",
        {
          sessionName: req.params.sessionName,
          error: error.message,
          timestamp: new Date(),
        }
      );

      SocketService.broadcast("session-remove-error", {
        sessionName: req.params.sessionName,
        error: error.message,
        timestamp: new Date(),
      });

      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  async getSocketStats(req, res) {
    try {
      const stats = SocketService.getConnectionStats();

      res.json({
        status: "success",
        data: stats || { message: "Socket.IO não inicializado" },
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  async sendBulkMessage(req, res) {
    try {
      const { recipients, message, delay = 1000 } = req.body;
      const client = req.whatsappClient;
      const sessionName = req.params.sessionName;

      if (!Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "Recipients deve ser um array não vazio",
        });
      }

      if (!message || message.trim() === "") {
        return res.status(400).json({
          status: "error",
          message: "Mensagem é obrigatória",
        });
      }

      // Emitir evento de início do envio em massa
      SocketService.emitToSession(sessionName, "bulk-send-start", {
        totalRecipients: recipients.length,
        message: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
        timestamp: new Date(),
      });

      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < recipients.length; i++) {
        const number = recipients[i];

        try {
          // Emitir progresso
          SocketService.emitToSession(sessionName, "bulk-send-progress", {
            current: i + 1,
            total: recipients.length,
            currentNumber: number,
            timestamp: new Date(),
          });

          const isValidNumber = await WhatsAppService.isValidWhatsAppNumber(
            client,
            number
          );

          if (!isValidNumber) {
            results.push({
              number,
              status: "error",
              message: "Número inválido",
            });
            errorCount++;
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
            result,
          });
          successCount++;

          // Emitir evento individual de sucesso
          SocketService.emitMessageSent(sessionName, number, message, result);

          // Aguardar antes do próximo envio (se não for o último)
          if (i < recipients.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        } catch (error) {
          results.push({
            number,
            status: "error",
            message: error.message,
          });
          errorCount++;

          // Emitir evento de erro individual
          SocketService.emitToSession(sessionName, "message-send-error", {
            error: error.message,
            number,
            timestamp: new Date(),
          });
        }
      }

      // Emitir evento de conclusão do envio em massa
      SocketService.emitToSession(sessionName, "bulk-send-complete", {
        totalRecipients: recipients.length,
        successCount,
        errorCount,
        timestamp: new Date(),
      });

      res.json({
        status: "success",
        message: "Envio em massa concluído",
        data: {
          totalRecipients: recipients.length,
          successCount,
          errorCount,
          results,
        },
      });
    } catch (error) {
      SocketService.emitToSession(req.params.sessionName, "bulk-send-error", {
        error: error.message,
        timestamp: new Date(),
      });

      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  async logoutSession(req, res) {
    try {
      const { sessionName } = req.params;
      const client = Session.get(sessionName);

      if (!client) {
        return res.status(404).json({
          status: "error",
          message: "Sessão não encontrada",
        });
      }

      // Emitir evento de logout
      SocketService.emitToSession(sessionName, "session-logout-start", {
        sessionName,
        timestamp: new Date(),
      });

      // Fazer logout do WhatsApp
      await client.logout();

      // Remover da sessão
      await WhatsAppService.removeSession(sessionName);

      // Emitir evento de logout concluído
      SocketService.broadcast("session-logout-complete", {
        sessionName,
        timestamp: new Date(),
      });

      res.json({
        status: "success",
        message: `Logout da sessão ${sessionName} realizado com sucesso`,
      });
    } catch (error) {
      SocketService.emitToSession(
        req.params.sessionName,
        "session-logout-error",
        {
          sessionName: req.params.sessionName,
          error: error.message,
          timestamp: new Date(),
        }
      );

      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  async getProfile(req, res) {
    try {
      const client = req.whatsappClient;
      const sessionName = req.params.sessionName;

      const profile = await client.getHostDevice();

      SocketService.emitToSession(sessionName, "profile-fetched", {
        profile,
        timestamp: new Date(),
      });

      res.json({
        status: "success",
        data: profile,
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  async getContacts(req, res) {
    try {
      const client = req.whatsappClient;
      const sessionName = req.params.sessionName;

      const contacts = await client.getAllContacts();

      SocketService.emitToSession(sessionName, "contacts-fetched", {
        contactsCount: contacts.length,
        timestamp: new Date(),
      });

      res.json({
        status: "success",
        data: {
          contactsCount: contacts.length,
          contacts: contacts.slice(0, 100), // Limitar a 100 para não sobrecarregar
        },
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  async getChats(req, res) {
    try {
      const client = req.whatsappClient;
      const sessionName = req.params.sessionName;

      const chats = await client.getAllChats();

      SocketService.emitToSession(sessionName, "chats-fetched", {
        chatsCount: chats.length,
        timestamp: new Date(),
      });

      res.json({
        status: "success",
        data: {
          chatsCount: chats.length,
          chats: chats.slice(0, 50), // Limitar a 50 para não sobrecarregar
        },
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  async getHealthStatus(req, res) {
    try {
      const sessions = WhatsAppService.getActiveSessions();
      const socketStats = SocketService.getConnectionStats();

      const sessionHealths = await Promise.all(
        sessions.map(async (sessionName) => {
          try {
            const health = await WhatsAppService.checkSessionHealth(
              sessionName
            );
            return health;
          } catch (error) {
            return {
              sessionName,
              healthy: false,
              reason: error.message,
            };
          }
        })
      );

      const healthySessions = sessionHealths.filter((s) => s.healthy).length;
      const totalSessions = sessions.length;

      const apiHealth = {
        status: "healthy",
        timestamp: new Date(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        sessions: {
          total: totalSessions,
          healthy: healthySessions,
          unhealthy: totalSessions - healthySessions,
          details: sessionHealths,
        },
        socket: socketStats || { message: "Socket.IO não inicializado" },
      };

      // Emitir health status via Socket.IO
      SocketService.broadcast("api-health-check", apiHealth);

      res.json({
        status: "success",
        data: apiHealth,
      });
    } catch (error) {
      const errorHealth = {
        status: "unhealthy",
        timestamp: new Date(),
        error: error.message,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      };

      SocketService.broadcast("api-health-error", errorHealth);

      res.status(500).json({
        status: "error",
        data: errorHealth,
      });
    }
  }
}

module.exports = new WhatsAppController();
