const express = require("express");
const WhatsAppController = require("../controllers/WhatsAppController");
const sessionValidator = require("../middleware/sessionValidator");
const { flexibleAuth } = require("../middleware/apiKeyAuth");
const {
  startSessionValidation,
  sendMessageValidation,
  checkNumberValidation,
  sendPdfValidation,
  sendImageValidation,
  sendBulkMessageValidation,
} = require("../middleware/requestValidator");

const router = express.Router();

/**
 * @swagger
 * /api/whatsapp/start:
 *   post:
 *     summary: Start a new WhatsApp session
 *     tags: [Session]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionName
 *             properties:
 *               sessionName:
 *                 type: string
 *                 description: Name for the WhatsApp session
 *     responses:
 *       200:
 *         description: Session started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 qrCode:
 *                   type: string
 *                   description: Base64 QR code image
 */
/**
 * @swagger
 * /api/whatsapp/health:
 *   get:
 *     summary: Get overall API health status
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Health status of the API
 */
router.get("/health", flexibleAuth, WhatsAppController.getHealthStatus);

/**
 * @swagger
 * /api/whatsapp/sessions:
 *   get:
 *     summary: Get all active WhatsApp sessions
 *     tags: [Session Management]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     responses:
 *       200:
 *         description: List of all active sessions
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
 *                     totalSessions:
 *                       type: number
 *                     sessions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           sessionName:
 *                             type: string
 *                           healthy:
 *                             type: boolean
 *                           reason:
 *                             type: string
 */
router.get("/sessions", flexibleAuth, WhatsAppController.getAllSessions);

/**
 * @swagger
 * /api/whatsapp/socket/stats:
 *   get:
 *     summary: Get Socket.IO connection statistics
 *     tags: [Socket.IO]
 *     responses:
 *       200:
 *         description: Socket.IO statistics
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
 *                     totalConnections:
 *                       type: number
 *                     subscriptionsCount:
 *                       type: number
 *                     clients:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           socketId:
 *                             type: string
 *                           connectedAt:
 *                             type: string
 *                           subscribedSessions:
 *                             type: array
 *                             items:
 *                               type: string
 */
router.get("/socket/stats", flexibleAuth, WhatsAppController.getSocketStats);

router.post(
  "/start",
  flexibleAuth,
  startSessionValidation,
  WhatsAppController.startSession
);

/**
 * @swagger
 * /api/whatsapp/{sessionName}/send:
 *   post:
 *     summary: Send a WhatsApp message
 *     tags: [Messages]
 *     parameters:
 *       - in: path
 *         name: sessionName
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - number
 *               - message
 *             properties:
 *               number:
 *                 type: string
 *                 description: Phone number (10-14 digits)
 *               message:
 *                 type: string
 *                 description: Message to send
 */
router.post(
  "/:sessionName/send",
  flexibleAuth,
  sendMessageValidation,
  sessionValidator,
  WhatsAppController.sendMessage
);

/**
 * @swagger
 * /api/whatsapp/{sessionName}/check-number:
 *   post:
 *     summary: Check if a number exists on WhatsApp
 *     tags: [Validation]
 *     parameters:
 *       - in: path
 *         name: sessionName
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - number
 *             properties:
 *               number:
 *                 type: string
 *                 description: Phone number to check (10-14 digits)
 */
router.post(
  "/:sessionName/check-number",
  flexibleAuth,
  checkNumberValidation,
  sessionValidator,
  WhatsAppController.checkNumber
);

/**
 * @swagger
 * /api/whatsapp/{sessionName}/send-pdf:
 *   post:
 *     summary: Send a PDF document via WhatsApp
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: sessionName
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - number
 *               - base64PDF
 *             properties:
 *               number:
 *                 type: string
 *                 description: Phone number (10-14 digits)
 *               base64PDF:
 *                 type: string
 *                 description: Base64 encoded PDF document
 *               fileName:
 *                 type: string
 *                 description: Optional file name
 *               message:
 *                 type: string
 *                 description: Optional message to send with the PDF
 */
router.post(
  "/:sessionName/send-pdf",
  flexibleAuth,
  sendPdfValidation,
  sessionValidator,
  WhatsAppController.sendPdf
);

router.post(
  "/:sessionName/send-image",
  flexibleAuth,
  sendImageValidation,
  sessionValidator,
  WhatsAppController.sendImage
);

/**
 * @swagger
 * /api/whatsapp/sessions:
 *   get:
 *     summary: Get all active WhatsApp sessions
 *     tags: [Session Management]
 *     responses:
 *       200:
 *         description: List of all active sessions
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
 *                     totalSessions:
 *                       type: number
 *                     sessions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           sessionName:
 *                             type: string
 *                           healthy:
 *                             type: boolean
 *                           reason:
 *                             type: string
 */

/**
 * @swagger
 * /api/whatsapp/{sessionName}/status:
 *   get:
 *     summary: Get status of a specific WhatsApp session
 *     tags: [Session Management]
 *     parameters:
 *       - in: path
 *         name: sessionName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session status
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
 *                     sessionName:
 *                       type: string
 *                     healthy:
 *                       type: boolean
 *                     reason:
 *                       type: string
 */
router.get(
  "/:sessionName/status",
  flexibleAuth,
  WhatsAppController.getSessionStatus
);

/**
 * @swagger
 * /api/whatsapp/{sessionName}/restart:
 *   post:
 *     summary: Restart a WhatsApp session
 *     tags: [Session Management]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session restarted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     sessionName:
 *                       type: string
 */
router.post(
  "/:sessionName/restart",
  flexibleAuth,
  WhatsAppController.restartSession
);

/**
 * @swagger
 * /api/whatsapp/{sessionName}/remove:
 *   delete:
 *     summary: Remove a WhatsApp session
 *     tags: [Session Management]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 */
router.delete(
  "/:sessionName/remove",
  flexibleAuth,
  WhatsAppController.removeSession
);

/**
 * @swagger
 * /api/whatsapp/socket/stats:
 *   get:
 *     summary: Get Socket.IO connection statistics
 *     tags: [Socket.IO]
 *     responses:
 *       200:
 *         description: Socket.IO statistics
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
 *                     totalConnections:
 *                       type: number
 *                     subscriptionsCount:
 *                       type: number
 *                     clients:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           socketId:
 *                             type: string
 *                           connectedAt:
 *                             type: string
 *                           subscribedSessions:
 *                             type: array
 *                             items:
 *                               type: string
 */

/**
 * @swagger
 * /api/whatsapp/{sessionName}/send-bulk:
 *   post:
 *     summary: Send bulk messages to multiple numbers
 *     tags: [Messages]
 *     parameters:
 *       - in: path
 *         name: sessionName
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipients
 *               - message
 *             properties:
 *               recipients:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of phone numbers
 *               message:
 *                 type: string
 *                 description: Message to send to all recipients
 *               delay:
 *                 type: number
 *                 description: Delay between messages in milliseconds (default 1000)
 */
router.post(
  "/:sessionName/send-bulk",
  flexibleAuth,
  sendBulkMessageValidation,
  sessionValidator,
  WhatsAppController.sendBulkMessage
);

/**
 * @swagger
 * /api/whatsapp/{sessionName}/logout:
 *   post:
 *     summary: Logout from WhatsApp session
 *     tags: [Session Management]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session logged out successfully
 */
router.post(
  "/:sessionName/logout",
  flexibleAuth,
  WhatsAppController.logoutSession
);

/**
 * @swagger
 * /api/whatsapp/{sessionName}/profile:
 *   get:
 *     summary: Get WhatsApp profile information
 *     tags: [Profile]
 *     parameters:
 *       - in: path
 *         name: sessionName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Profile information
 */
router.get(
  "/:sessionName/profile",
  flexibleAuth,
  sessionValidator,
  WhatsAppController.getProfile
);

/**
 * @swagger
 * /api/whatsapp/{sessionName}/contacts:
 *   get:
 *     summary: Get contacts list
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contacts list
 */
router.get(
  "/:sessionName/contacts",
  flexibleAuth,
  sessionValidator,
  WhatsAppController.getContacts
);

/**
 * @swagger
 * /api/whatsapp/{sessionName}/chats:
 *   get:
 *     summary: Get active chats list
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Active chats list
 */
router.get(
  "/:sessionName/chats",
  flexibleAuth,
  sessionValidator,
  WhatsAppController.getChats
);

module.exports = router;
