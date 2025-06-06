const jwt = require("jsonwebtoken");
const APP_CONFIG = require("../config/app.config");

const generateToken = (payload) => {
  return jwt.sign(payload, APP_CONFIG.JWT_SECRET, {
    expiresIn: APP_CONFIG.JWT_EXPIRES_IN,
    issuer: APP_CONFIG.JWT_ISSUER,
    audience: APP_CONFIG.JWT_AUDIENCE,
  });
};

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      status: "error",
      message: "Token de acesso ausente ou inválido",
      code: "MISSING_TOKEN",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, APP_CONFIG.JWT_SECRET, {
      issuer: APP_CONFIG.JWT_ISSUER,
      audience: APP_CONFIG.JWT_AUDIENCE,
    });

    req.user = decoded;
    next();
  } catch (error) {
    let message = "Token inválido";
    let code = "INVALID_TOKEN";

    if (error.name === "TokenExpiredError") {
      message = "Token expirado";
      code = "EXPIRED_TOKEN";
    } else if (error.name === "JsonWebTokenError") {
      message = "Token malformado";
      code = "MALFORMED_TOKEN";
    }

    return res.status(401).json({
      status: "error",
      message,
      code,
    });
  }
};

const refreshTokenMiddleware = (req, res, next) => {
  const refreshToken = req.headers["x-refresh-token"];

  if (!refreshToken) {
    return res.status(401).json({
      status: "error",
      message: "Refresh token ausente",
      code: "MISSING_REFRESH_TOKEN",
    });
  }

  try {
    const decoded = jwt.verify(refreshToken, APP_CONFIG.JWT_REFRESH_SECRET);
    req.refreshUser = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      status: "error",
      message: "Refresh token inválido",
      code: "INVALID_REFRESH_TOKEN",
    });
  }
};

module.exports = {
  generateToken,
  verifyToken,
  refreshTokenMiddleware,
};
