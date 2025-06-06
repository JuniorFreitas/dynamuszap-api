const rateLimit = require("express-rate-limit");
const slowDown = require("express-slow-down");
const APP_CONFIG = require("../config/app.config");
const { logSecurityEvent } = require("./securityLogger");

// Rate limiter principal
const apiLimiter = rateLimit({
  windowMs: APP_CONFIG.RATE_LIMIT_WINDOW_MS,
  max: APP_CONFIG.RATE_LIMIT_MAX_REQUESTS,
  message: {
    status: "error",
    message: "Muitas solicitações, por favor tente novamente mais tarde.",
    code: "RATE_LIMITED",
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Configuração específica para trust proxy
  trustProxy: process.env.DOCKER_ENV === "true",
  // Key generator personalizado para Docker
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || "unknown";
  },
  handler: (req, res) => {
    logSecurityEvent(
      "RATE_LIMIT_EXCEEDED",
      {
        ip: req.ip,
        url: req.url,
        method: req.method,
        limit: APP_CONFIG.RATE_LIMIT_MAX_REQUESTS,
        windowMs: APP_CONFIG.RATE_LIMIT_WINDOW_MS,
      },
      req
    );

    res.status(429).json({
      status: "error",
      message: "Muitas solicitações, por favor tente novamente mais tarde.",
      code: "RATE_LIMITED",
      retryAfter: Math.round(APP_CONFIG.RATE_LIMIT_WINDOW_MS / 1000),
    });
  },
});

// Rate limiter mais restritivo para autenticação
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: APP_CONFIG.NODE_ENV === "production" ? 5 : 50, // Prod: 5 tentativas, Dev: 50 tentativas
  message: {
    status: "error",
    message:
      "Muitas tentativas de autenticação. Tente novamente em 15 minutos.",
    code: "AUTH_RATE_LIMITED",
  },
  skipSuccessfulRequests: true, // Não contar requisições bem-sucedidas
  // Configuração específica para trust proxy
  trustProxy: process.env.DOCKER_ENV === "true",
  // Key generator personalizado para Docker
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || "unknown";
  },
  handler: (req, res) => {
    logSecurityEvent(
      "AUTH_RATE_LIMIT_EXCEEDED",
      {
        ip: req.ip,
        url: req.url,
        method: req.method,
        environment: APP_CONFIG.NODE_ENV,
        maxAttempts: APP_CONFIG.NODE_ENV === "production" ? 5 : 50,
      },
      req
    );

    res.status(429).json({
      status: "error",
      message: "Muitas tentativas de acesso. Tente novamente mais tarde.",
      code: "RATE_LIMITED",
      retryAfter: 900, // 15 minutos
    });
  },
});

// Speed limiter - reduz velocidade após muitas requisições
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutos
  delayAfter: Math.floor(APP_CONFIG.RATE_LIMIT_MAX_REQUESTS * 0.5), // começar a desacelerar após 50% do limite
  delayMs: () => (APP_CONFIG.NODE_ENV === "production" ? 500 : 100), // Prod: 500ms, Dev: 100ms
  maxDelayMs: APP_CONFIG.NODE_ENV === "production" ? 20000 : 2000, // Prod: 20s, Dev: 2s
  skipFailedRequests: false,
  skipSuccessfulRequests: false,
  // Key generator personalizado para Docker
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || "unknown";
  },
  // Desabilitar warning sobre delayMs
  validate: {
    delayMs: false,
  },
});

// Middleware para capturar eventos de slow down (substituindo onLimitReached depreciado)
const speedLimiterLogger = (req, res, next) => {
  const originalSend = res.send;
  res.send = function (data) {
    // Se há delay aplicado pelo slow down
    if (req.slowDown && req.slowDown.delay > 0) {
      logSecurityEvent(
        "SPEED_LIMIT_REACHED",
        {
          ip: req.ip,
          url: req.url,
          method: req.method,
          delay: req.slowDown.delay,
          hits: req.slowDown.hits,
        },
        req
      );
    }
    originalSend.call(this, data);
  };
  next();
};

// Rate limiter para endpoints críticos
const criticalEndpointsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: APP_CONFIG.NODE_ENV === "production" ? 10 : 100, // Prod: 10, Dev: 100
  message: {
    status: "error",
    message: "Limite de requisições para endpoint crítico excedido.",
    code: "CRITICAL_RATE_LIMITED",
  },
  // Configuração específica para trust proxy
  trustProxy: process.env.DOCKER_ENV === "true",
  // Key generator personalizado para Docker
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || "unknown";
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  speedLimiter,
  speedLimiterLogger,
  criticalEndpointsLimiter,
};
