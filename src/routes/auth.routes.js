const express = require("express");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const { generateToken } = require("../middleware/jwtAuth");
const { generateApiKey } = require("../middleware/apiKeyAuth");
const { authLimiter } = require("../middleware/rateLimiter");
const { logSecurityEvent } = require("../middleware/securityLogger");
const APP_CONFIG = require("../config/app.config");

const router = express.Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Autenticação por usuário e senha
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Nome de usuário
 *               password:
 *                 type: string
 *                 description: Senha
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *                     expiresIn:
 *                       type: string
 *       401:
 *         description: Credenciais inválidas
 */
router.post(
  "/login",
  authLimiter,
  [
    body("username")
      .notEmpty()
      .withMessage("Username é obrigatório")
      .isLength({ min: 3, max: 50 })
      .withMessage("Username deve ter entre 3 e 50 caracteres"),
    body("password")
      .notEmpty()
      .withMessage("Password é obrigatório")
      .isLength({ min: 6 })
      .withMessage("Password deve ter pelo menos 6 caracteres"),
  ],
  async (req, res) => {
    try {
      // Verificar erros de validação
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: "error",
          message: "Dados inválidos",
          errors: errors.array(),
        });
      }

      const { username, password } = req.body;

      // Verificar credenciais (usando as mesmas do Basic Auth por enquanto)
      if (
        username !== APP_CONFIG.BASIC_AUTH_USER ||
        password !== APP_CONFIG.BASIC_AUTH_PASSWORD
      ) {
        logSecurityEvent(
          "LOGIN_FAILED",
          {
            username,
            ip: req.ip,
            userAgent: req.get("User-Agent"),
          },
          req
        );

        return res.status(401).json({
          status: "error",
          message: "Credenciais inválidas",
          code: "INVALID_CREDENTIALS",
        });
      }

      // Gerar tokens
      const payload = {
        userId: username,
        username: username,
        role: "admin",
        iat: Math.floor(Date.now() / 1000),
      };

      const accessToken = generateToken(payload);
      const refreshTokenPayload = { ...payload, type: "refresh" };
      const refreshToken = generateToken(refreshTokenPayload);

      // Log do login bem-sucedido
      logSecurityEvent(
        "LOGIN_SUCCESS",
        {
          username,
          ip: req.ip,
          userAgent: req.get("User-Agent"),
        },
        req
      );

      res.json({
        status: "success",
        message: "Login realizado com sucesso",
        data: {
          accessToken,
          refreshToken,
          expiresIn: APP_CONFIG.JWT_EXPIRES_IN,
          tokenType: "Bearer",
        },
      });
    } catch (error) {
      console.error("[AUTH] Erro no login:", error);
      res.status(500).json({
        status: "error",
        message: "Erro interno do servidor",
      });
    }
  }
);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Renovar token de acesso
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token
 *     responses:
 *       200:
 *         description: Token renovado com sucesso
 *       401:
 *         description: Refresh token inválido
 */
router.post(
  "/refresh",
  authLimiter,
  [body("refreshToken").notEmpty().withMessage("Refresh token é obrigatório")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: "error",
          message: "Refresh token é obrigatório",
          errors: errors.array(),
        });
      }

      const { refreshToken } = req.body;

      // Verificar refresh token
      const jwt = require("jsonwebtoken");
      let decoded;

      try {
        decoded = jwt.verify(refreshToken, APP_CONFIG.JWT_REFRESH_SECRET);
      } catch (error) {
        logSecurityEvent(
          "REFRESH_TOKEN_INVALID",
          {
            ip: req.ip,
            error: error.message,
          },
          req
        );

        return res.status(401).json({
          status: "error",
          message: "Refresh token inválido",
          code: "INVALID_REFRESH_TOKEN",
        });
      }

      // Gerar novo access token
      const newPayload = {
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role,
        iat: Math.floor(Date.now() / 1000),
      };

      const newAccessToken = generateToken(newPayload);

      logSecurityEvent(
        "TOKEN_REFRESHED",
        {
          username: decoded.username,
          ip: req.ip,
        },
        req
      );

      res.json({
        status: "success",
        message: "Token renovado com sucesso",
        data: {
          accessToken: newAccessToken,
          expiresIn: APP_CONFIG.JWT_EXPIRES_IN,
          tokenType: "Bearer",
        },
      });
    } catch (error) {
      console.error("[AUTH] Erro no refresh:", error);
      res.status(500).json({
        status: "error",
        message: "Erro interno do servidor",
      });
    }
  }
);

/**
 * @swagger
 * /api/auth/generate-api-key:
 *   post:
 *     summary: Gerar nova API Key
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: API Key gerada com sucesso
 *       401:
 *         description: Token inválido
 */
router.post("/generate-api-key", authLimiter, async (req, res) => {
  try {
    // Verificar se o usuário está autenticado (JWT ou Basic Auth)
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        status: "error",
        message: "Autenticação necessária",
        code: "AUTHENTICATION_REQUIRED",
      });
    }

    let authenticated = false;
    let username = "";

    // Verificar JWT
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(token, APP_CONFIG.JWT_SECRET);
        authenticated = true;
        username = decoded.username;
      } catch (error) {
        // JWT inválido, tentar Basic Auth
      }
    }

    // Verificar Basic Auth se JWT falhou
    if (!authenticated && authHeader.startsWith("Basic ")) {
      const base64Credentials = authHeader.split(" ")[1];
      const credentials = Buffer.from(base64Credentials, "base64").toString(
        "utf-8"
      );
      const [user, pass] = credentials.split(":");

      if (
        user === APP_CONFIG.BASIC_AUTH_USER &&
        pass === APP_CONFIG.BASIC_AUTH_PASSWORD
      ) {
        authenticated = true;
        username = user;
      }
    }

    if (!authenticated) {
      return res.status(401).json({
        status: "error",
        message: "Credenciais inválidas",
        code: "INVALID_CREDENTIALS",
      });
    }

    // Gerar nova API Key
    const newApiKey = generateApiKey();

    logSecurityEvent(
      "API_KEY_GENERATED",
      {
        username,
        ip: req.ip,
        keyPrefix: newApiKey.substring(0, 8),
      },
      req
    );

    res.json({
      status: "success",
      message: "API Key gerada com sucesso",
      data: {
        apiKey: newApiKey,
        note: "Guarde esta chave em local seguro. Ela não será exibida novamente.",
      },
    });
  } catch (error) {
    console.error("[AUTH] Erro ao gerar API Key:", error);
    res.status(500).json({
      status: "error",
      message: "Erro interno do servidor",
    });
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout (invalidar token)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout realizado com sucesso
 */
router.post("/logout", async (req, res) => {
  try {
    // Em uma implementação real, você adicionaria o token a uma blacklist
    // Por enquanto, apenas logamos o evento

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(token, APP_CONFIG.JWT_SECRET);

        logSecurityEvent(
          "LOGOUT",
          {
            username: decoded.username,
            ip: req.ip,
          },
          req
        );
      } catch (error) {
        // Token inválido, mas ainda logamos a tentativa de logout
      }
    }

    res.json({
      status: "success",
      message: "Logout realizado com sucesso",
    });
  } catch (error) {
    console.error("[AUTH] Erro no logout:", error);
    res.status(500).json({
      status: "error",
      message: "Erro interno do servidor",
    });
  }
});

module.exports = router;
