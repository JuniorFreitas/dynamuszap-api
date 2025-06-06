const express = require("express");
const router = express.Router();

/**
 * @swagger
 * /api/socket/stats:
 *   get:
 *     summary: Obter estatísticas das conexões socket
 *     tags: [Socket]
 *     responses:
 *       200:
 *         description: Estatísticas das conexões
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalConnections:
 *                   type: number
 *                 connectedUsers:
 *                   type: array
 *                 rooms:
 *                   type: object
 */
router.get("/stats", (req, res) => {
  try {
    const socketService = req.app.get("socketService");
    if (!socketService) {
      return res.status(503).json({
        error: "Serviço de socket não disponível",
      });
    }

    const stats = socketService.getConnectionStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Erro ao obter estatísticas do socket:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/socket/broadcast:
 *   post:
 *     summary: Enviar mensagem para todos os clientes conectados
 *     tags: [Socket]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               event:
 *                 type: string
 *                 description: Nome do evento
 *               data:
 *                 type: object
 *                 description: Dados a serem enviados
 *               room:
 *                 type: string
 *                 description: Sala específica (opcional)
 *     responses:
 *       200:
 *         description: Mensagem enviada com sucesso
 */
router.post("/broadcast", (req, res) => {
  try {
    const socketService = req.app.get("socketService");
    if (!socketService) {
      return res.status(503).json({
        error: "Serviço de socket não disponível",
      });
    }

    const { event, data, room } = req.body;

    if (!event) {
      return res.status(400).json({
        error: "Nome do evento é obrigatório",
      });
    }

    if (room) {
      socketService.emitToRoom(room, event, data);
    } else {
      socketService.emitToAll(event, data);
    }

    res.json({
      success: true,
      message: "Mensagem enviada com sucesso",
      event,
      room: room || "all",
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Erro ao enviar broadcast:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/socket/notification:
 *   post:
 *     summary: Enviar notificação para a sala de notificações
 *     tags: [Socket]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Título da notificação
 *               message:
 *                 type: string
 *                 description: Mensagem da notificação
 *               type:
 *                 type: string
 *                 enum: [info, success, warning, error]
 *                 description: Tipo da notificação
 *     responses:
 *       200:
 *         description: Notificação enviada com sucesso
 */
router.post("/notification", (req, res) => {
  try {
    const socketService = req.app.get("socketService");
    if (!socketService) {
      return res.status(503).json({
        error: "Serviço de socket não disponível",
      });
    }

    const { title, message, type = "info" } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        error: "Título e mensagem são obrigatórios",
      });
    }

    const notification = {
      title,
      message,
      type,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    socketService.emitNotification(notification);

    res.json({
      success: true,
      message: "Notificação enviada com sucesso",
      notification,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Erro ao enviar notificação:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    });
  }
});

module.exports = router;
