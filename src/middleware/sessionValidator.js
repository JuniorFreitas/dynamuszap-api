const Session = require("../models/Session");

const sessionValidator = (req, res, next) => {
  const { sessionName } = req.params;
  const client = Session.get(sessionName);

  if (!client) {
    return res.status(400).json({
      status: "error",
      message: `Sessão ${sessionName} não inicializada`,
      timestamp: new Date().toISOString(),
    });
  }

  req.whatsappClient = client;
  next();
};

module.exports = sessionValidator;
