const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const swaggerUi = require("swagger-ui-express");
const APP_CONFIG = require("./config/app.config");
const socketConfig = require("./config/socket.config");
const swaggerSpec = require("./config/swagger.config");
const whatsappRoutes = require("./routes/whatsapp.routes");
const socketRoutes = require("./routes/socket.routes");
const configRoutes = require("./routes/config.routes");
const errorHandler = require("./middleware/errorHandler");
const { apiLimiter, createBypassLimiter } = require("./middleware/rateLimiter");
const SocketService = require("./services/socketService");
// const authorizeBasic = require("./middleware/authorizeBasic"); // Importa o middleware

const app = express();
const server = http.createServer(app);
const io = new Server(server, socketConfig.cors);

// Middlewares
app.use(cors());
app.use(express.json({ limit: APP_CONFIG.MAX_REQUEST_SIZE }));
app.use(
  express.urlencoded({ limit: APP_CONFIG.MAX_REQUEST_SIZE, extended: true })
);

// Servir arquivos estáticos
app.use(express.static("public"));

// Swagger documentação
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Limitação de taxa (configuração inteligente baseada no ambiente)
// Desabilitado em desenvolvimento para evitar problemas
if (process.env.NODE_ENV === "production") {
  app.use("/api/", createBypassLimiter());
  console.log("Rate limiting ATIVADO para produção");
} else {
  console.log("Rate limiting DESABILITADO para desenvolvimento");
}

// Rotas
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/socket", socketRoutes);
app.use("/api/config", configRoutes);

// Tratamento de erros
app.use(errorHandler);

// Inicializar o serviço de socket
const socketService = new SocketService(io);

// Disponibilizar o socket.io e o serviço para as rotas
app.set("io", io);
app.set("socketService", socketService);

server.listen(APP_CONFIG.PORT, () => {
  console.log(`Servidor rodando na porta ${APP_CONFIG.PORT}`);
  console.log(
    `Documentação Swagger disponível em ${APP_CONFIG.URLBASE}/api-docs`
  );
  console.log(`Socket.IO está ativo e escutando conexões`);
});
