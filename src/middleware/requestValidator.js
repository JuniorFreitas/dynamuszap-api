const { validationResult, body, param } = require("express-validator");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: "error",
      message: "Dados de entrada inválidos",
      errors: errors.array(),
      timestamp: new Date().toISOString(),
    });
  }
  next();
};

const startSessionValidation = [
  body("sessionName")
    .trim()
    .notEmpty()
    .withMessage("Nome da sessão é obrigatório")
    .isLength({ min: 3 })
    .withMessage("O nome da sessão deve ter pelo menos 3 caracteres"),
  validate,
];

const sendMessageValidation = [
  param("sessionName")
    .trim()
    .notEmpty()
    .withMessage("Nome da sessão é obrigatório"),
  body("number")
    .trim()
    .notEmpty()
    .withMessage("Número de telefone é obrigatório")
    .matches(/^\d{10,14}$/)
    .withMessage("Formato de número de telefone inválido"),
  body("message").trim().notEmpty().withMessage("Mensagem é obrigatória"),
  validate,
];

const checkNumberValidation = [
  param("sessionName")
    .trim()
    .notEmpty()
    .withMessage("Nome da sessão é obrigatório"),
  body("number")
    .trim()
    .notEmpty()
    .withMessage("Número de telefone é obrigatório")
    .matches(/^\d{10,14}$/)
    .withMessage("Formato de número de telefone inválido"),
  validate,
];

const sendPdfValidation = [
  param("sessionName")
    .trim()
    .notEmpty()
    .withMessage("Nome da sessão é obrigatório"),
  body("number")
    .trim()
    .notEmpty()
    .withMessage("Número de telefone é obrigatório")
    .matches(/^\d{10,14}$/)
    .withMessage("Formato de número de telefone inválido"),
  body("base64Image")
    .if(body("pdfPath").not().exists())
    .notEmpty()
    .withMessage("base64Image ou imagePath é obrigatório")
    .isString()
    .withMessage("base64Image deve ser uma string"),
  body("pdfPath")
    .if(body("base64Image").not().exists())
    .notEmpty()
    .withMessage("base64Image ou pdfPath é obrigatório")
    .isString()
    .withMessage("pdfPath deve ser uma string"),
  body("fileName")
    .optional()
    .isString()
    .withMessage("Nome de arquivo inválido"),
  body("message")
    .optional()
    .isString()
    .withMessage("Formato de mensagem inválido"),
  validate,
];

const sendImageValidation = [
  body("number")
    .matches(/^\d{10,14}$/)
    .withMessage("Número de telefone deve ter entre 10 e 14 dígitos"),

  body("base64Image")
    .if(body("imagePath").not().exists())
    .notEmpty()
    .withMessage("base64Image ou imagePath é obrigatório")
    .isString()
    .withMessage("base64Image deve ser uma string"),

  body("imagePath")
    .if(body("base64Image").not().exists())
    .notEmpty()
    .withMessage("base64Image ou imagePath é obrigatório")
    .isString()
    .withMessage("imagePath deve ser uma string"),

  body("caption")
    .optional()
    .isString()
    .withMessage("caption deve ser uma string"),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: "error",
        errors: errors.array(),
      });
    }
    next();
  },
];

const sendBulkMessageValidation = [
  param("sessionName")
    .trim()
    .notEmpty()
    .withMessage("Nome da sessão é obrigatório"),
  body("recipients")
    .isArray({ min: 1 })
    .withMessage("Recipients deve ser um array não vazio"),
  body("recipients.*")
    .matches(/^\d{10,14}$/)
    .withMessage("Formato de número de telefone inválido"),
  body("message").trim().notEmpty().withMessage("Mensagem é obrigatória"),
  body("delay")
    .optional()
    .isInt({ min: 100, max: 60000 })
    .withMessage("Delay deve estar entre 100ms e 60s"),
  validate,
];

module.exports = {
  startSessionValidation,
  sendMessageValidation,
  checkNumberValidation,
  sendPdfValidation,
  sendImageValidation,
  sendBulkMessageValidation,
};
