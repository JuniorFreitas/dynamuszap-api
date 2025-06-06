const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const hpp = require("hpp");
const APP_CONFIG = require("./config/app.config");
const swaggerSpec = require("./config/swagger.config");
const whatsappRoutes = require("./routes/whatsapp.routes");
const authRoutes = require("./routes/auth.routes");
const errorHandler = require("./middleware/errorHandler");
const {
  apiLimiter,
  speedLimiter,
  speedLimiterLogger,
} = require("./middleware/rateLimiter");
const {
  helmetConfig,
  customSecurityHeaders,
  sanitizeInput,
  injectionDetection,
} = require("./middleware/securityHeaders");
const {
  accessLogger,
  consoleLogger,
  bruteForceDetector,
  suspiciousActivityLogger,
  logError,
} = require("./middleware/securityLogger");
const SessionManager = require("./services/SessionManager");
const SocketService = require("./services/SocketService");

const app = express();

// Trust proxy (importante para rate limiting e logs de IP)
// Configuração mais segura para Docker
if (process.env.DOCKER_ENV === "true") {
  // No Docker, confiar apenas nos proxies do Docker network
  app.set("trust proxy", [
    "127.0.0.1",
    "::1",
    "10.0.0.0/8",
    "172.16.0.0/12",
    "192.168.0.0/16",
  ]);
} else if (APP_CONFIG.NODE_ENV === "production") {
  // Em produção, configurar com IPs específicos do proxy/load balancer
  app.set("trust proxy", 1); // Apenas 1 proxy na frente
} else {
  // Em desenvolvimento, apenas localhost
  app.set("trust proxy", "127.0.0.1");
}

// Middlewares de segurança (aplicados primeiro)
app.use(helmetConfig);
app.use(customSecurityHeaders);
app.use(hpp()); // Previne HTTP Parameter Pollution

// CORS configurado de forma mais restritiva
app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir requests sem origin (ex: mobile apps)
      if (!origin) return callback(null, true);

      if (
        APP_CONFIG.CORS_ORIGINS.includes(origin) ||
        APP_CONFIG.NODE_ENV === "development"
      ) {
        callback(null, true);
      } else {
        callback(new Error("Bloqueado pelo CORS"));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-API-Key",
      "X-Refresh-Token",
    ],
    exposedHeaders: ["X-API-Version"],
  })
);

// Logging de segurança e monitoramento
if (APP_CONFIG.ENABLE_ACCESS_LOGS) {
  app.use(accessLogger);
}
if (APP_CONFIG.NODE_ENV === "development") {
  app.use(consoleLogger);
}
app.use(bruteForceDetector);
app.use(suspiciousActivityLogger);

// Middleware de log de requisições/respostas para debug
app.use((req, res, next) => {
  const originalSend = res.send;
  const originalJson = res.json;

  // Override res.send para detectar HTML sendo enviado
  res.send = function (data) {
    if (
      req.originalUrl.startsWith("/api/") &&
      typeof data === "string" &&
      data.includes("<!DOCTYPE")
    ) {
      console.error(
        `[ERRO] HTML sendo enviado para rota API: ${req.method} ${req.originalUrl}`
      );
      console.error("Data:", data.substring(0, 200) + "...");
    }
    originalSend.call(this, data);
  };

  // Override res.json para detectar problemas
  res.json = function (data) {
    if (req.originalUrl.startsWith("/api/")) {
      console.log(
        `[API] ${req.method} ${req.originalUrl} - Status: ${res.statusCode}`
      );
    }
    originalJson.call(this, data);
  };

  next();
});

// Parse do body com proteções
app.use(
  express.json({
    limit: APP_CONFIG.MAX_REQUEST_SIZE,
    verify: (req, res, buf) => {
      // Detectar payloads potencialmente maliciosos
      const body = buf.toString();
      if (
        body.length >
        parseInt(APP_CONFIG.MAX_REQUEST_SIZE.replace(/\D/g, "")) * 1024 * 1024
      ) {
        throw new Error("Payload muito grande");
      }
    },
  })
);
app.use(
  express.urlencoded({
    limit: APP_CONFIG.MAX_REQUEST_SIZE,
    extended: true,
    parameterLimit: 1000, // Limitar número de parâmetros
  })
);

// Middlewares de sanitização e detecção de injeção
app.use(sanitizeInput);
app.use(injectionDetection);

// Timeout de requisições
app.use((req, res, next) => {
  req.setTimeout(APP_CONFIG.REQUEST_TIMEOUT, () => {
    res.status(408).json({
      status: "error",
      message: "Timeout da requisição",
      code: "REQUEST_TIMEOUT",
    });
  });
  next();
});

// Middleware de segurança para arquivos estáticos
app.use((req, res, next) => {
  // Verificar se é uma requisição para arquivo estático
  if (!req.originalUrl.startsWith("/api/")) {
    // Bloquear tentativas de acesso a arquivos sensíveis
    const blockedPaths = [
      "/node_modules",
      "/.env",
      "/package.json",
      "/docker-compose",
      "/Dockerfile",
      "/.git",
      "/src/",
      "/logs/",
      "/tokens/",
    ];

    if (blockedPaths.some((path) => req.originalUrl.includes(path))) {
      return res.status(403).json({
        status: "error",
        message: "Acesso negado",
        timestamp: new Date().toISOString(),
      });
    }
  }
  next();
});

// Servir arquivos estáticos com segurança
app.use(
  express.static(path.join(__dirname, "../public"), {
    // Configurações de segurança para arquivos estáticos
    dotfiles: "deny", // Negar acesso a arquivos ocultos
    index: ["index.html"], // Arquivo padrão
    maxAge: APP_CONFIG.NODE_ENV === "production" ? "1d" : "0", // Cache apenas em produção
    setHeaders: (res, path) => {
      // Headers de segurança para arquivos estáticos
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "DENY");
      res.setHeader("X-XSS-Protection", "1; mode=block");

      // CSP específico para HTML
      if (path.endsWith(".html")) {
        res.setHeader(
          "Content-Security-Policy",
          "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "connect-src 'self' ws: wss:; " +
            "img-src 'self' data: blob:; " +
            "font-src 'self'; " +
            "object-src 'none'; " +
            "base-uri 'self';"
        );
      }
    },
  })
);

// Swagger documentação (apenas em desenvolvimento)
if (APP_CONFIG.NODE_ENV === "development") {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// Rate limiting e speed limiting
app.use("/api/", speedLimiterLogger); // Logger primeiro
app.use("/api/", speedLimiter);
app.use("/api/", apiLimiter);

// Health check para Docker
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: require("../package.json").version,
    environment: APP_CONFIG.NODE_ENV,
    security: {
      helmet: true,
      rateLimit: true,
      cors: true,
      jwtAuth: true,
      apiKeyAuth: true,
    },
  });
});

// Middleware para proteger páginas HTML (exceto login)
app.use((req, res, next) => {
  // Se for uma página HTML e não for de autenticação
  if (
    req.path.endsWith(".html") &&
    !req.path.includes("login") &&
    req.method === "GET"
  ) {
    // Adicionar script de proteção automaticamente
    const originalSend = res.sendFile;
    res.sendFile = function (filePath, options) {
      // Verificar se o arquivo existe e é uma página que precisa de proteção
      if (filePath.includes("public") && filePath.endsWith(".html")) {
        // Deixar que a página faça sua própria verificação de autenticação
        originalSend.call(this, filePath, options);
      } else {
        originalSend.call(this, filePath, options);
      }
    };
  }
  next();
});

// Rota raiz com redirecionamento baseado em autenticação
app.get("/", (req, res) => {
  // Servir index.html que irá verificar autenticação no frontend
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Rotas de autenticação (sem autenticação adicional)
app.use("/api/auth", authRoutes);

// Rotas protegidas
app.use("/api/whatsapp", whatsappRoutes);

// Middleware para capturar rotas não encontradas
app.use("*", (req, res, next) => {
  // Se a requisição é para API, retornar JSON
  if (req.originalUrl.startsWith("/api/")) {
    return res.status(404).json({
      status: "error",
      message: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
      timestamp: new Date().toISOString(),
    });
  }

  // Para outras rotas (front-end), servir index.html para SPA routing
  // Isso permite que o front-end gerencie suas próprias rotas
  if (req.method === "GET" && !req.originalUrl.includes(".")) {
    return res.sendFile(path.join(__dirname, "../public/index.html"));
  }

  // Para arquivos específicos não encontrados
  res.status(404).send("Arquivo não encontrado");
});

// Tratamento de erros (deve ser o último middleware)
app.use((error, req, res, next) => {
  // Log de erros de segurança
  logError(error, req);
  errorHandler(error, req, res, next);
});

// Criar servidor (HTTP ou HTTPS)
let server;

if (
  APP_CONFIG.ENABLE_HTTPS &&
  APP_CONFIG.SSL_KEY_PATH &&
  APP_CONFIG.SSL_CERT_PATH
) {
  try {
    const options = {
      key: fs.readFileSync(APP_CONFIG.SSL_KEY_PATH),
      cert: fs.readFileSync(APP_CONFIG.SSL_CERT_PATH),
    };
    server = https.createServer(options, app);
    console.log(`[SECURITY] Servidor HTTPS habilitado`);
  } catch (error) {
    console.warn(
      `[SECURITY WARNING] Erro ao carregar certificados SSL: ${error.message}`
    );
    console.warn(`[SECURITY WARNING] Utilizando HTTP em vez de HTTPS`);
    server = http.createServer(app);
  }
} else {
  server = http.createServer(app);
  if (APP_CONFIG.NODE_ENV === "production") {
    console.warn(`[SECURITY WARNING] Servidor rodando em HTTP em produção!`);
  }
}

// Inicializar Socket.IO
SocketService.initialize(server);

// Configurar timeouts do servidor
server.timeout = APP_CONFIG.REQUEST_TIMEOUT;
server.keepAliveTimeout = 5000;
server.headersTimeout = 6000;

server.listen(APP_CONFIG.PORT, () => {
  const protocol = APP_CONFIG.ENABLE_HTTPS ? "https" : "http";
  const baseUrl = `${protocol}://localhost:${APP_CONFIG.PORT}`;

  console.log(`\n🚀 Servidor rodando na porta ${APP_CONFIG.PORT}`);
  console.log(`📊 Ambiente: ${APP_CONFIG.NODE_ENV}`);
  console.log(`🔒 Protocolo: ${protocol.toUpperCase()}`);

  if (APP_CONFIG.NODE_ENV === "development") {
    console.log(`📚 Documentação Swagger: ${baseUrl}/api-docs`);
  }

  console.log(`🔌 Socket.IO: ${baseUrl}`);
  console.log(`🔐 Autenticação JWT disponível em: ${baseUrl}/api/auth/login`);

  // Inicializar SessionManager para carregar sessões existentes (em paralelo)
  console.log(`\n=== CARREGANDO SESSÕES EXISTENTES ===`);
  SessionManager.init()
    .then(() => {
      console.log(`=== SESSÕES CARREGADAS COM SUCESSO ===`);
    })
    .catch((error) => {
      console.error(`=== ERRO AO CARREGAR SESSÕES:`, error, "===");
    });

  // Exibir informações de segurança
  console.log(`\n🛡️  Medidas de segurança ativas:`);
  console.log(`   ✅ Helmet (headers de segurança)`);
  console.log(
    `   ✅ Rate limiting (${APP_CONFIG.RATE_LIMIT_MAX_REQUESTS} req/${
      APP_CONFIG.RATE_LIMIT_WINDOW_MS / 1000 / 60
    }min)`
  );
  console.log(`   ✅ CORS restritivo`);
  console.log(`   ✅ Input sanitization`);
  console.log(`   ✅ Injection detection`);
  console.log(`   ✅ Brute force protection`);
  console.log(`   ✅ Security logging`);
  console.log(`   ✅ JWT Authentication`);
  console.log(`   ✅ API Key Authentication`);

  if (APP_CONFIG.VALID_API_KEYS.length > 0) {
    console.log(
      `   ✅ ${APP_CONFIG.VALID_API_KEYS.length} API Key(s) configurada(s)`
    );
  }

  console.log(`\n📝 Logs salvos em: ./logs/`);
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n[App] Recebido ${signal}. Iniciando encerramento gracioso...`);

  // Fechar o servidor HTTP
  server.close(() => {
    console.log("[App] Servidor HTTP fechado");
  });

  // Encerrar SessionManager
  try {
    await SessionManager.shutdown();
    console.log("[App] SessionManager encerrado com sucesso");
  } catch (error) {
    console.error("[App] Erro ao encerrar SessionManager:", error);
  }

  process.exit(0);
};

// Handlers para sinais de encerramento
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handler para erros não capturados
process.on("uncaughtException", (error) => {
  console.error("[App] Erro não capturado:", error);
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[App] Promise rejeitada não tratada:", reason);
  gracefulShutdown("unhandledRejection");
});
