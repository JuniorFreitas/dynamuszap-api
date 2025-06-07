const express = require("express");
const WhatsAppController = require("../controllers/WhatsAppController");
const sessionValidator = require("../middleware/sessionValidator");
const {
  startSessionValidation,
  sendMessageValidation,
  checkNumberValidation,
  sendPdfValidation,
  sendImageValidation,
} = require("../middleware/requestValidator");

const router = express.Router();

/**
 * @swagger
 * /api/whatsapp/connect:
 *   post:
 *     summary: Connect to WhatsApp and start a session
 *     tags: [WhatsApp]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionName:
 *                 type: string
 *                 description: Name for the WhatsApp session
 *                 default: default
 *     responses:
 *       200:
 *         description: Session started successfully
 */
router.post("/connect", WhatsAppController.startSession);

/**
 * @swagger
 * /api/whatsapp/qr-code:
 *   post:
 *     summary: Generate QR Code for WhatsApp connection
 *     tags: [WhatsApp]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionName:
 *                 type: string
 *                 default: default
 *     responses:
 *       200:
 *         description: QR Code generated successfully
 */
router.post("/qr-code", WhatsAppController.generateQRCode);

/**
 * @swagger
 * /api/whatsapp/status:
 *   get:
 *     summary: Get WhatsApp connection status
 *     tags: [WhatsApp]
 *     parameters:
 *       - in: query
 *         name: sessionName
 *         schema:
 *           type: string
 *           default: default
 *     responses:
 *       200:
 *         description: Status retrieved successfully
 */
router.get("/status", WhatsAppController.getStatus);

/**
 * @swagger
 * /api/whatsapp/sync-status:
 *   post:
 *     summary: Force sync WhatsApp status via Socket.IO
 *     tags: [WhatsApp]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionName:
 *                 type: string
 *                 default: default
 *     responses:
 *       200:
 *         description: Status synced successfully
 */
router.post("/sync-status", WhatsAppController.syncStatus);

/**
 * @swagger
 * /api/whatsapp/disconnect:
 *   post:
 *     summary: Disconnect WhatsApp session
 *     tags: [WhatsApp]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionName:
 *                 type: string
 *                 default: default
 *     responses:
 *       200:
 *         description: Session disconnected successfully
 */
router.post("/disconnect", WhatsAppController.disconnectSession);

/**
 * @swagger
 * /api/whatsapp/sessions:
 *   get:
 *     summary: List all active WhatsApp sessions
 *     tags: [WhatsApp]
 *     responses:
 *       200:
 *         description: Sessions listed successfully
 */
router.get("/sessions", WhatsAppController.listSessions);

/**
 * @swagger
 * /api/whatsapp/clean-locks:
 *   post:
 *     summary: Clean SingletonLock files for all sessions
 *     tags: [Maintenance]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionName:
 *                 type: string
 *                 description: Clean specific session (optional, if empty cleans all)
 *                 default: ""
 *     responses:
 *       200:
 *         description: SingletonLock files cleaned successfully
 */
router.post("/clean-locks", WhatsAppController.cleanSingletonLocks);

// Manter compatibilidade com rota antiga
router.post("/start", startSessionValidation, WhatsAppController.startSession);

/**
 * @swagger
 * /api/whatsapp/send-message:
 *   post:
 *     summary: Send a single WhatsApp message
 *     tags: [Messages]
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
 *                 description: Phone number with country code
 *               message:
 *                 type: string
 *                 description: Message to send
 *               sessionName:
 *                 type: string
 *                 default: default
 *     responses:
 *       200:
 *         description: Message sent successfully
 */
router.post("/send-message", WhatsAppController.sendMessage);

/**
 * @swagger
 * /api/whatsapp/send-bulk-message:
 *   post:
 *     summary: Send bulk WhatsApp messages
 *     tags: [Messages]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumbers
 *               - message
 *             properties:
 *               phoneNumbers:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of phone numbers
 *               message:
 *                 type: string
 *                 description: Message to send to all numbers
 *               delay:
 *                 type: number
 *                 default: 1000
 *                 description: Delay between messages in milliseconds
 *               sessionName:
 *                 type: string
 *                 default: default
 *     responses:
 *       200:
 *         description: Bulk messages sent successfully
 */
router.post("/send-bulk-message", WhatsAppController.sendBulkMessage);

// Manter rotas antigas para compatibilidade
router.post(
  "/:sessionName/send",
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
  sendPdfValidation,
  sessionValidator,
  WhatsAppController.sendPdf
);

router.post(
  "/:sessionName/send-image",
  sendImageValidation,
  sessionValidator,
  WhatsAppController.sendImage
);
module.exports = router;
