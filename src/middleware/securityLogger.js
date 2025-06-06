const morgan = require("morgan");
const fs = require("fs");
const path = require("path");

// Criar diretório de logs se não existir
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configurar streams de log
const accessLogStream = fs.createWriteStream(path.join(logsDir, "access.log"), {
  flags: "a",
});

const securityLogStream = fs.createWriteStream(
  path.join(logsDir, "security.log"),
  { flags: "a" }
);

const errorLogStream = fs.createWriteStream(path.join(logsDir, "error.log"), {
  flags: "a",
});

// Formato customizado de log
const customFormat =
  ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms';

// Middleware do Morgan para logs de acesso
const accessLogger = morgan(customFormat, {
  stream: accessLogStream,
  skip: (req, res) => res.statusCode < 400, // Logar apenas erros em arquivo
});

// Logger para console (todas as requisições)
const consoleLogger = morgan("combined");

// Função para log de segurança
const logSecurityEvent = (eventType, details, req = null) => {
  const timestamp = new Date().toISOString();
  const ip = req ? req.ip || req.connection.remoteAddress : "unknown";
  const userAgent = req ? req.get("User-Agent") : "unknown";

  const logEntry = {
    timestamp,
    eventType,
    ip,
    userAgent,
    details,
  };

  // Log no arquivo de segurança
  securityLogStream.write(JSON.stringify(logEntry) + "\n");

  // Log no console para eventos críticos
  if (
    ["INJECTION_ATTEMPT", "BRUTE_FORCE", "INVALID_TOKEN"].includes(eventType)
  ) {
    console.warn(`[SECURITY ALERT] ${eventType}:`, details);
  }
};

// Função para log de erros
const logError = (error, req = null) => {
  const timestamp = new Date().toISOString();
  const ip = req ? req.ip || req.connection.remoteAddress : "unknown";
  const method = req ? req.method : "unknown";
  const url = req ? req.url : "unknown";

  const logEntry = {
    timestamp,
    level: "ERROR",
    ip,
    method,
    url,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
  };

  errorLogStream.write(JSON.stringify(logEntry) + "\n");
  console.error(`[ERROR] ${timestamp}:`, error.message);
};

// Middleware para detectar tentativas de força bruta
const bruteForceDetector = (() => {
  const attempts = new Map();
  const MAX_ATTEMPTS = 5;
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutos

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    // Limpar tentativas antigas
    attempts.forEach((value, key) => {
      if (now - value.firstAttempt > WINDOW_MS) {
        attempts.delete(key);
      }
    });

    // Verificar tentativas do IP atual
    if (attempts.has(ip)) {
      const ipAttempts = attempts.get(ip);

      if (ipAttempts.count >= MAX_ATTEMPTS) {
        logSecurityEvent(
          "BRUTE_FORCE_BLOCKED",
          {
            ip,
            attempts: ipAttempts.count,
            url: req.url,
            method: req.method,
          },
          req
        );

        return res.status(429).json({
          status: "error",
          message: "Muitas tentativas de acesso. Tente novamente mais tarde.",
          code: "RATE_LIMITED",
        });
      }
    }

    // Interceptar respostas de erro 401/403
    const originalSend = res.send;
    res.send = function (body) {
      if (res.statusCode === 401 || res.statusCode === 403) {
        const ipAttempts = attempts.get(ip) || { count: 0, firstAttempt: now };
        ipAttempts.count++;

        if (ipAttempts.count === 1) {
          ipAttempts.firstAttempt = now;
        }

        attempts.set(ip, ipAttempts);

        if (ipAttempts.count >= MAX_ATTEMPTS) {
          logSecurityEvent(
            "BRUTE_FORCE_DETECTED",
            {
              ip,
              attempts: ipAttempts.count,
              url: req.url,
              method: req.method,
            },
            req
          );
        }
      }

      originalSend.call(this, body);
    };

    next();
  };
})();

// Middleware para log de requisições suspeitas
const suspiciousActivityLogger = (req, res, next) => {
  const userAgent = req.get("User-Agent") || "";
  const ip = req.ip || req.connection.remoteAddress;

  // Detectar bots maliciosos
  const suspiciousBots = [
    /sqlmap/i,
    /nmap/i,
    /nikto/i,
    /masscan/i,
    /nuclei/i,
    /gobuster/i,
    /dirbuster/i,
  ];

  const isSuspiciousBot = suspiciousBots.some((pattern) =>
    pattern.test(userAgent)
  );

  if (isSuspiciousBot) {
    logSecurityEvent(
      "SUSPICIOUS_BOT",
      {
        ip,
        userAgent,
        url: req.url,
        method: req.method,
      },
      req
    );
  }

  // Detectar tentativas de acesso a arquivos sensíveis
  const sensitiveFiles = [
    /\.env/i,
    /\.git/i,
    /\.sql/i,
    /\.bak/i,
    /\.old/i,
    /\.backup/i,
    /\.config/i,
    /\.log/i,
    /admin/i,
    /config/i,
    /database/i,
  ];

  const accessingSensitiveFile = sensitiveFiles.some((pattern) =>
    pattern.test(req.url)
  );

  if (accessingSensitiveFile) {
    logSecurityEvent(
      "SENSITIVE_FILE_ACCESS",
      {
        ip,
        userAgent,
        url: req.url,
        method: req.method,
      },
      req
    );
  }

  next();
};

module.exports = {
  accessLogger,
  consoleLogger,
  logSecurityEvent,
  logError,
  bruteForceDetector,
  suspiciousActivityLogger,
};
