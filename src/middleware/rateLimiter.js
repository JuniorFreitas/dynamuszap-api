const rateLimit = require("express-rate-limit");

// Configurações baseadas no ambiente
const isProduction = process.env.NODE_ENV === "production";
const isDocker = process.env.DOCKER_ENV === "true";

// Rate limiting mais permissivo para desenvolvimento e menos para produção
const getRateLimitConfig = () => {
  if (isProduction && !isDocker) {
    // Produção sem Docker - mais restritivo
    return {
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 100, // 100 requests por IP
      message: {
        status: "error",
        message: "Muitas solicitações. Tente novamente em 15 minutos.",
      },
    };
  } else if (isDocker) {
    // Docker - moderado (pode ser múltiplos IPs do proxy)
    return {
      windowMs: 5 * 60 * 1000, // 5 minutos
      max: 1000, // 1000 requests por IP (considerando proxy)
      message: {
        status: "error",
        message: "Limite de requisições atingido. Aguarde 5 minutos.",
      },
      skip: (req) => {
        // Pular rate limiting para localhost em ambiente Docker
        const ip = req.ip || req.connection.remoteAddress;
        return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
      },
    };
  } else {
    // Desenvolvimento - muito permissivo
    return {
      windowMs: 1 * 60 * 1000, // 1 minuto
      max: 10000, // 10000 requests por IP
      message: {
        status: "info",
        message: "Rate limiting ativo mas muito permissivo em desenvolvimento.",
      },
      skip: (req) => {
        // Sempre pular em desenvolvimento para localhost
        return true;
      },
    };
  }
};

const apiLimiter = rateLimit(getRateLimitConfig());

// Rate limiting específico para rotas sensíveis (como autenticação)
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: isProduction ? 5 : 100, // 5 tentativas em produção, 100 em dev
  message: {
    status: "error",
    message: "Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Bypass para rotas específicas que devem ser sempre acessíveis
const createBypassLimiter = (allowedRoutes = []) => {
  return (req, res, next) => {
    // Lista de rotas que sempre devem ter acesso
    const alwaysAllowed = [
      "/api/config",
      "/api/socket/stats",
      "/api/whatsapp/status",
      ...allowedRoutes,
    ];

    // Verificar se a rota atual está na lista de permitidas
    const isAllowed = alwaysAllowed.some((route) => req.path.startsWith(route));

    if (isAllowed) {
      return next(); // Pular rate limiting
    }

    // Aplicar rate limiting normal
    return apiLimiter(req, res, next);
  };
};

// Log das configurações aplicadas
console.log("Rate Limiting configurado:", {
  environment: process.env.NODE_ENV || "development",
  docker: isDocker,
  production: isProduction,
});

module.exports = {
  apiLimiter,
  strictLimiter,
  createBypassLimiter,
};
