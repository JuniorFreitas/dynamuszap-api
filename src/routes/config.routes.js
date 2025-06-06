const express = require("express");
const APP_CONFIG = require("../config/app.config");

const router = express.Router();

/**
 * @swagger
 * /api/config:
 *   get:
 *     summary: Get frontend configuration
 *     tags: [Config]
 *     responses:
 *       200:
 *         description: Configuration retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 apiUrl:
 *                   type: string
 *                   description: Base URL for API calls
 *                 environment:
 *                   type: string
 *                   description: Current environment
 */
router.get("/", (req, res) => {
  try {
    const config = {
      apiUrl: APP_CONFIG.URLBASE || `http://localhost:${APP_CONFIG.PORT}`,
      environment: process.env.NODE_ENV || "development",
      port: APP_CONFIG.PORT,
      rateLimiting: {
        enabled: process.env.NODE_ENV === "production",
        environment: process.env.NODE_ENV || "development",
        docker: process.env.DOCKER_ENV === "true",
      },
    };

    res.json({
      status: "success",
      data: config,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Erro ao obter configurações:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/config/rate-limit:
 *   get:
 *     summary: Get rate limiting status
 *     tags: [Config]
 *     responses:
 *       200:
 *         description: Rate limiting status retrieved successfully
 */
router.get("/rate-limit", (req, res) => {
  try {
    const rateLimitInfo = {
      enabled: process.env.NODE_ENV === "production",
      environment: process.env.NODE_ENV || "development",
      docker: process.env.DOCKER_ENV === "true",
      settings: {
        production: {
          windowMs: "15 minutes",
          max: 100,
        },
        docker: {
          windowMs: "5 minutes",
          max: 1000,
          skipLocalhost: true,
        },
        development: {
          windowMs: "1 minute",
          max: 10000,
          skipAll: true,
        },
      },
    };

    res.json({
      status: "success",
      data: rateLimitInfo,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Erro ao obter status do rate limiting:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

module.exports = router;
