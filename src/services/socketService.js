const socketConfig = require("../config/socket.config");

class SocketService {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map();
    this.initializeSocketEvents();
  }

  initializeSocketEvents() {
    this.io.on(socketConfig.events.CONNECTION, (socket) => {
      console.log(`Usuário conectado: ${socket.id}`);
      this.connectedUsers.set(socket.id, {
        socketId: socket.id,
        connectedAt: new Date(),
        rooms: [],
      });

      // Eventos básicos
      this.handleDisconnect(socket);
      this.handleJoinRoom(socket);
      this.handleLeaveRoom(socket);
      this.handleSendMessage(socket);

      // Eventos específicos do WhatsApp
      this.handleWhatsAppEvents(socket);
    });
  }

  handleDisconnect(socket) {
    socket.on(socketConfig.events.DISCONNECT, () => {
      console.log(`Usuário desconectado: ${socket.id}`);
      this.connectedUsers.delete(socket.id);
    });
  }

  handleJoinRoom(socket) {
    socket.on(socketConfig.events.JOIN_ROOM, (room) => {
      socket.join(room);
      console.log(`Usuário ${socket.id} se juntou à sala ${room}`);

      // Atualizar lista de salas do usuário
      const user = this.connectedUsers.get(socket.id);
      if (user && !user.rooms.includes(room)) {
        user.rooms.push(room);
      }

      // Notificar outros usuários na sala
      socket.to(room).emit(socketConfig.events.USER_JOINED, {
        userId: socket.id,
        room: room,
        timestamp: new Date(),
      });
    });
  }

  handleLeaveRoom(socket) {
    socket.on(socketConfig.events.LEAVE_ROOM, (room) => {
      socket.leave(room);
      console.log(`Usuário ${socket.id} saiu da sala ${room}`);

      // Atualizar lista de salas do usuário
      const user = this.connectedUsers.get(socket.id);
      if (user) {
        user.rooms = user.rooms.filter((r) => r !== room);
      }

      // Notificar outros usuários na sala
      socket.to(room).emit(socketConfig.events.USER_LEFT, {
        userId: socket.id,
        room: room,
        timestamp: new Date(),
      });
    });
  }

  handleSendMessage(socket) {
    socket.on(socketConfig.events.SEND_MESSAGE, (data) => {
      console.log("Mensagem recebida:", data);

      const messageData = {
        ...data,
        from: socket.id,
        timestamp: new Date(),
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };

      // Se especificou uma sala, enviar apenas para essa sala
      if (data.room) {
        socket
          .to(data.room)
          .emit(socketConfig.events.MESSAGE_RECEIVED, messageData);
      } else {
        // Enviar para todos os clientes conectados
        this.io.emit(socketConfig.events.MESSAGE_RECEIVED, messageData);
      }
    });
  }

  handleWhatsAppEvents(socket) {
    // Evento para QR Code do WhatsApp
    socket.on("requestWhatsAppQR", () => {
      console.log(`Usuário ${socket.id} solicitou QR Code do WhatsApp`);
      // Aqui você integraria com o venom-bot para gerar o QR
    });

    // Evento para status de conexão do WhatsApp
    socket.on("whatsAppStatus", () => {
      console.log(`Usuário ${socket.id} solicitou status do WhatsApp`);
      // Retornar status atual da conexão WhatsApp
    });
  }

  // Métodos para emitir eventos para clientes específicos
  emitToRoom(room, event, data) {
    this.io.to(room).emit(event, data);
  }

  emitToAll(event, data) {
    this.io.emit(event, data);
  }

  emitToUser(socketId, event, data) {
    this.io.to(socketId).emit(event, data);
  }

  // Emitir eventos relacionados ao WhatsApp
  emitWhatsAppQR(qrCode) {
    this.emitToRoom(
      socketConfig.defaultRooms.WHATSAPP,
      socketConfig.events.WHATSAPP_QR_CODE,
      {
        qrCode,
        timestamp: new Date(),
      }
    );
  }

  emitWhatsAppConnected(clientInfo) {
    this.emitToRoom(
      socketConfig.defaultRooms.WHATSAPP,
      socketConfig.events.WHATSAPP_CONNECTED,
      {
        clientInfo,
        timestamp: new Date(),
      }
    );
  }

  emitWhatsAppDisconnected() {
    this.emitToRoom(
      socketConfig.defaultRooms.WHATSAPP,
      socketConfig.events.WHATSAPP_DISCONNECTED,
      {
        timestamp: new Date(),
      }
    );
  }

  emitWhatsAppMessage(messageData) {
    this.emitToRoom(
      socketConfig.defaultRooms.WHATSAPP,
      socketConfig.events.WHATSAPP_MESSAGE,
      {
        ...messageData,
        timestamp: new Date(),
      }
    );
  }

  // Emitir notificações gerais
  emitNotification(notification) {
    this.emitToRoom(
      socketConfig.defaultRooms.NOTIFICATIONS,
      socketConfig.events.NOTIFICATION,
      {
        ...notification,
        timestamp: new Date(),
      }
    );
  }

  // Obter estatísticas de conexão
  getConnectionStats() {
    return {
      totalConnections: this.connectedUsers.size,
      connectedUsers: Array.from(this.connectedUsers.values()),
      rooms: this.getRoomsInfo(),
    };
  }

  getRoomsInfo() {
    const rooms = {};
    this.connectedUsers.forEach((user) => {
      user.rooms.forEach((room) => {
        if (!rooms[room]) {
          rooms[room] = 0;
        }
        rooms[room]++;
      });
    });
    return rooms;
  }
}

module.exports = SocketService;
