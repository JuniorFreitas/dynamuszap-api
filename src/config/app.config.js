require("dotenv").config();
const crypto = require("crypto");

const APP_CONFIG = {
  // Configurações básicas
  PORT: process.env.PORT || 3000,
  URLBASE:
    process.env.URLBASE || `http://localhost:${process.env.PORT || 3000}`,
  MAX_REQUEST_SIZE: process.env.MAX_REQUEST_SIZE || "10mb",
  SESSION_TIMEOUT: 1000 * 60 * 60 * (process.env.SESSION_TIMEOUT || 24), // 24 horas

  // Autenticação básica (legado)
  BASIC_AUTH_USER: process.env.BASIC_AUTH_USER || "admin",
  BASIC_AUTH_PASSWORD: process.env.BASIC_AUTH_PASSWORD || "admin@password",

  // Configurações JWT
  JWT_SECRET: process.env.JWT_SECRET || crypto.randomBytes(64).toString("hex"),
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET || crypto.randomBytes(64).toString("hex"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "15m",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  JWT_ISSUER: process.env.JWT_ISSUER || "dynamuszap-api",
  JWT_AUDIENCE: process.env.JWT_AUDIENCE || "dynamuszap-client",

  // API Keys válidas (deve ser definido no .env)
  VALID_API_KEYS: process.env.VALID_API_KEYS
    ? process.env.VALID_API_KEYS.split(",")
    : [],

  // Configurações de segurança
  ENABLE_HTTPS: process.env.ENABLE_HTTPS === "true",
  SSL_KEY_PATH: process.env.SSL_KEY_PATH,
  SSL_CERT_PATH: process.env.SSL_CERT_PATH,

  // Rate limiting
  RATE_LIMIT_WINDOW_MS:
    parseInt(process.env.RATE_LIMIT_WINDOW_MS) ||
    (process.env.NODE_ENV === "production" ? 15 * 60 * 1000 : 60 * 1000), // Prod: 15 min, Dev: 1 min
  RATE_LIMIT_MAX_REQUESTS:
    parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) ||
    (process.env.NODE_ENV === "production" ? 100 : 1000), // Prod: 100, Dev: 1000

  // CORS
  CORS_ORIGINS: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",")
    : process.env.DOCKER_ENV === "true"
    ? ["http://localhost:3000", "http://127.0.0.1:3000", "http://0.0.0.0:3000"]
    : ["http://localhost:3000"],

  // Logs
  ENABLE_ACCESS_LOGS: process.env.ENABLE_ACCESS_LOGS !== "false",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",

  // Ambiente
  NODE_ENV: process.env.NODE_ENV || "development",

  // Timeout de requisições
  REQUEST_TIMEOUT: parseInt(process.env.REQUEST_TIMEOUT) || 30000, // 30 segundos
};

// Validações de segurança
if (APP_CONFIG.NODE_ENV === "production") {
  if (APP_CONFIG.JWT_SECRET.length < 32) {
    console.warn("[SECURITY WARNING] JWT_SECRET muito curto para produção!");
  }

  if (APP_CONFIG.VALID_API_KEYS.length === 0) {
    console.warn(
      "[SECURITY WARNING] Nenhuma API Key configurada para produção!"
    );
  }

  if (!APP_CONFIG.ENABLE_HTTPS) {
    console.warn("[SECURITY WARNING] HTTPS não habilitado em produção!");
  }
}

module.exports = APP_CONFIG;
