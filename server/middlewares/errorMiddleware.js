const notFoundHandler = (req, res) => {
  res.status(404).json({
    message: `Route ${req.originalUrl} not found.`,
    code: "NOT_FOUND",
  });
};

const MYSQL_ERROR_MAP = {
  ER_DUP_ENTRY: { status: 409, message: "A record with this value already exists." },
  ER_DATA_TOO_LONG: { status: 400, message: "One or more fields exceed their maximum length." },
  ER_NO_REFERENCED_ROW_2: { status: 400, message: "Referenced record does not exist." },
  ER_ROW_IS_REFERENCED_2: { status: 409, message: "Cannot delete — this record is referenced by other data." },
  ER_BAD_NULL_ERROR: { status: 400, message: "A required field is missing." },
};

const errorHandler = (error, _req, res, _next) => {
  // Log error details for debugging (can be sent to external service in production)
  console.error("Error:", {
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
  });

  // Map known MySQL errors to HTTP responses
  if (error.code && MYSQL_ERROR_MAP[error.code]) {
    const mapped = MYSQL_ERROR_MAP[error.code];
    return res.status(mapped.status).json({ message: mapped.message, code: error.code });
  }

  const statusCode = error.statusCode || 500;
  const message = error.statusCode ? error.message : "Internal server error.";
  const code = error.code || "INTERNAL_SERVER_ERROR";

  res.status(statusCode).json({
    message,
    code,
    ...(process.env.NODE_ENV === "development" && { error: error.message }),
  });
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
