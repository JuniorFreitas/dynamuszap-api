const errorHandler = (err, req, res, next) => {
  console.error("[ErrorHandler] Erro capturado:", err.stack);

  // Se a resposta já foi enviada, não fazer nada
  if (res.headersSent) {
    return next(err);
  }

  // Garantir que sempre retornamos JSON
  res.setHeader("Content-Type", "application/json");

  let statusCode = 500;
  let message = "Erro interno do servidor";

  // Capturar diferentes tipos de erro
  if (err.status) {
    statusCode = err.status;
  } else if (err.statusCode) {
    statusCode = err.statusCode;
  }

  if (err.message) {
    message = err.message;
  }

  // Resposta JSON padronizada
  const errorResponse = {
    status: "error",
    message: message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
      details: err,
    }),
  };

  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;
