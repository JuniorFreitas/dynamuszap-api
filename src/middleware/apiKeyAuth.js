const crypto = require("crypto");
const APP_CONFIG = require("../config/app.config");

// Função para gerar hash da API key
const hashApiKey = (apiKey) => {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
};

// Middleware de autenticação por API Key
const verifyApiKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"] || req.query.apikey;

  if (!apiKey) {
    return res.status(401).json({
      status: "error",
      message: "API Key ausente",
      code: "MISSING_API_KEY",
    });
  }

  // Validar formato da API key (deve ter pelo menos 32 caracteres)
  if (apiKey.length < 32) {
    return res.status(401).json({
      status: "error",
      message: "API Key inválida - formato incorreto",
      code: "INVALID_API_KEY_FORMAT",
    });
  }

  // Hash da API key fornecida
  const hashedProvidedKey = hashApiKey(apiKey);

  // Verificar se a API key existe na lista de keys válidas
  const validApiKeys = APP_CONFIG.VALID_API_KEYS || [];
  const isValidKey = validApiKeys.some((validKey) => {
    const hashedValidKey = hashApiKey(validKey);
    return hashedValidKey === hashedProvidedKey;
  });

  if (!isValidKey) {
    // Log da tentativa de acesso com API key inválida
    console.warn(
      `[SECURITY] Tentativa de acesso com API Key inválida: ${apiKey.substring(
        0,
        8
      )}...`
    );

    return res.status(401).json({
      status: "error",
      message: "API Key inválida",
      code: "INVALID_API_KEY",
    });
  }

  // API Key válida - continuar
  req.apiKeyAuth = true;
  next();
};

// Middleware flexível que aceita JWT ou API Key
const flexibleAuth = (req, res, next) => {
  const hasApiKey = req.headers["x-api-key"] || req.query.apikey;
  const hasJwtToken =
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ");

  if (hasApiKey) {
    return verifyApiKey(req, res, next);
  } else if (hasJwtToken) {
    const { verifyToken } = require("./jwtAuth");
    return verifyToken(req, res, next);
  } else {
    return res.status(401).json({
      status: "error",
      message: "Autenticação necessária: forneça JWT token ou API Key",
      code: "AUTHENTICATION_REQUIRED",
    });
  }
};

// Função para gerar nova API key
const generateApiKey = () => {
  return crypto.randomBytes(32).toString("hex");
};

module.exports = {
  verifyApiKey,
  flexibleAuth,
  generateApiKey,
  hashApiKey,
};
