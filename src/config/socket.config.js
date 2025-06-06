const socketConfig = {
  // Configurações do CORS para socket.io
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN || "*",
    methods: ["GET", "POST"],
    credentials: true,
  },

  // Configurações gerais
  pingTimeout: 60000,
  pingInterval: 25000,

  // Salas padrão
  defaultRooms: {
    WHATSAPP: "whatsapp-room",
    GENERAL: "general-room",
    NOTIFICATIONS: "notifications-room",
  },

  // Eventos personalizados
  events: {
    // Eventos de conexão
    CONNECTION: "connection",
    DISCONNECT: "disconnect",

    // Eventos de mensagens
    SEND_MESSAGE: "sendMessage",
    MESSAGE_RECEIVED: "messageReceived",
    MESSAGE_STATUS: "messageStatus",

    // Eventos de WhatsApp
    WHATSAPP_CONNECTED: "whatsappConnected",
    WHATSAPP_DISCONNECTED: "whatsappDisconnected",
    WHATSAPP_QR_CODE: "whatsappQrCode",
    WHATSAPP_MESSAGE: "whatsappMessage",

    // Eventos de sala
    JOIN_ROOM: "joinRoom",
    LEAVE_ROOM: "leaveRoom",
    USER_JOINED: "userJoined",
    USER_LEFT: "userLeft",

    // Eventos de notificação
    NOTIFICATION: "notification",
    ERROR: "error",
  },
};

module.exports = socketConfig;
