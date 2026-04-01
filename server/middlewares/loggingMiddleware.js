const loggingMiddleware = (req, res, next) => {
  const start = Date.now();

  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);

  // Capture response
  const originalSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const level = statusCode >= 400 ? "ERROR" : "INFO";

    console.log(
      `[${level}] ${req.method} ${req.originalUrl} - ${statusCode} (${duration}ms)`,
    );

    res.send = originalSend;
    return res.send(data);
  };

  next();
};

module.exports = {
  loggingMiddleware,
};
