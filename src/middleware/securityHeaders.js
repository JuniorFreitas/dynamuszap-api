const helmet = require("helmet");
const xss = require("xss");
const validator = require("validator");

// Configuração personalizada do Helmet
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Permite iframe do Swagger
  hsts: {
    maxAge: 31536000, // 1 ano
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: "deny" },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: "same-origin" },
});

// Middleware para sanitização de entrada
const sanitizeInput = (req, res, next) => {
  // Sanitizar query parameters
  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === "string") {
        // Não sanitizar returnUrl para preservar a URL original
        if (key === "returnUrl") {
          continue;
        }
        req.query[key] = xss(validator.escape(req.query[key]));
      }
    }
  }

  // Sanitizar parâmetros da URL
  if (req.params) {
    for (const key in req.params) {
      if (typeof req.params[key] === "string") {
        req.params[key] = xss(validator.escape(req.params[key]));
      }
    }
  }

  // Sanitizar body (apenas strings)
  if (req.body && typeof req.body === "object") {
    sanitizeObject(req.body);
  }

  next();
};

// Função recursiva para sanitizar objetos
const sanitizeObject = (obj) => {
  for (const key in obj) {
    if (typeof obj[key] === "string") {
      obj[key] = xss(obj[key]);
    } else if (typeof obj[key] === "object" && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
};

// Middleware para adicionar headers de segurança customizados
const customSecurityHeaders = (req, res, next) => {
  // Header personalizado para identificar a API
  res.setHeader("X-API-Version", "1.0.0");

  // Remover headers que revelam informações do servidor
  res.removeHeader("X-Powered-By");
  res.removeHeader("Server");

  // Headers de segurança adicionais
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()"
  );

  next();
};

// Middleware para detectar tentativas de injeção
const injectionDetection = (req, res, next) => {
  const suspiciousPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i, // SQL injection
    /(((\%3C)|<)((\%2F)|\/)*[a-z0-9\%]+((\%3E)|>))/i, // XSS
    /(((\%3C)|<)((\%69)|i|(\%49))((\%6D)|m|(\%4D))((\%67)|g|(\%47))[^\n]+((\%3E)|>))/i, // XSS
    /((\%3C)|<)[^\n]+((\%3E)|>)/i, // HTML tags
  ];

  const checkString = (str, paramName = "") => {
    // Permitir URLs válidas para returnUrl
    if (paramName === "returnUrl") {
      try {
        const decodedUrl = decodeURIComponent(str);
        // Verificar se é uma URL local válida
        const url = new URL(decodedUrl);
        if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
          return false; // URL local válida, não suspeita
        }
      } catch (e) {
        // Se não for uma URL válida, continuar com as verificações normais
      }
    }

    return suspiciousPatterns.some((pattern) => pattern.test(str));
  };

  const checkObject = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === "string" && checkString(obj[key], key)) {
        return true;
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        if (checkObject(obj[key])) return true;
      }
    }
    return false;
  };

  // Verificar query parameters
  if (req.query && checkObject(req.query)) {
    console.warn(
      `[SECURITY] Tentativa de injeção detectada - Query: ${JSON.stringify(
        req.query
      )}`
    );
    return res.status(400).json({
      status: "error",
      message: "Entrada suspeita detectada",
      code: "SUSPICIOUS_INPUT",
    });
  }

  // Verificar body
  if (req.body && checkObject(req.body)) {
    console.warn(
      `[SECURITY] Tentativa de injeção detectada - Body: ${JSON.stringify(
        req.body
      )}`
    );
    return res.status(400).json({
      status: "error",
      message: "Entrada suspeita detectada",
      code: "SUSPICIOUS_INPUT",
    });
  }

  next();
};

module.exports = {
  helmetConfig,
  sanitizeInput,
  customSecurityHeaders,
  injectionDetection,
};
