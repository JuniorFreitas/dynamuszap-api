require("dotenv").config();

const PORT = process.env.PORT || 3333;

const APP_CONFIG = {
  PORT: PORT,
  URLBASE: process.env.URLBASE || `http://localhost:${PORT}`,
  MAX_REQUEST_SIZE: process.env.MAX_REQUEST_SIZE || "10mb",
  SESSION_TIMEOUT: 1000 * 60 * 60 * (process.env.SESSION_TIMEOUT || 24), // 24 horas
  BASIC_AUTH_USER: process.env.BASIC_AUTH_USER || "admin",
  BASIC_AUTH_PASSWORD: process.env.BASIC_AUTH_PASSWORD || "admin@password",
};

module.exports = APP_CONFIG;
