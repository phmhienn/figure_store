const notFoundHandler = (req, res) => {
  res.status(404).json({
    message: `Route ${req.originalUrl} not found.`,
    code: "NOT_FOUND",
  });
};

const POSTGRES_ERROR_MAP = {
  23505: { status: 409, message: "A record with this value already exists." },
  22001: {
    status: 400,
    message: "One or more fields exceed their maximum length.",
  },
  23503: { status: 409, message: "Foreign key constraint violation." },
  23502: { status: 400, message: "A required field is missing." },
  "22P02": { status: 400, message: "Invalid input format." },
};

const errorHandler = (error, _req, res, _next) => {
  // Log error details for debugging (can be sent to external service in production)
  console.error("Error:", {
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
  });

  // Map known PostgreSQL errors to HTTP responses
  if (error.code && POSTGRES_ERROR_MAP[error.code]) {
    const mapped = POSTGRES_ERROR_MAP[error.code];
    return res
      .status(mapped.status)
      .json({ message: mapped.message, code: error.code });
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
