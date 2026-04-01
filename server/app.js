const http = require("http");
const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");

const { testConnection } = require("./config/db");
const { apiLimiter } = require("./middlewares/rateLimitMiddleware");
const { loggingMiddleware } = require("./middlewares/loggingMiddleware");
const { sanitizeInput } = require("./middlewares/sanitizeMiddleware");
const productRoutes = require("./routes/productRoutes");
const userRoutes = require("./routes/userRoutes");
const orderRoutes = require("./routes/orderRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const newsRoutes = require("./routes/newsRoutes");
const {
  notFoundHandler,
  errorHandler,
} = require("./middlewares/errorMiddleware");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5000);
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

// Debug: log CORS config
if (process.env.NODE_ENV !== "production") {
  console.log(`✓ CORS configured for origin: ${clientUrl}`);
}

// Security headers (helmet) — applied before CORS
app.use(
  helmet({
    // API doesn't serve HTML, so CSP is not needed and would break Swagger/docs
    contentSecurityPolicy: false,
    // Allow cross-origin fetches from the frontend
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use(
  cors({
    origin: clientUrl,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  }),
);
app.use(express.json());
app.use(loggingMiddleware);
app.use(sanitizeInput);
// app.use(apiLimiter); // Disabled for development to avoid "Too many requests" errors

// Serve uploaded product images as static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/api/health", (_req, res) => {
  res.json({ message: "Figure Shop API is running." });
});

app.use("/api/products", productRoutes);
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/news", newsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const createServer = (port, basePort = port) =>
  new Promise((resolve, reject) => {
    const server = http.createServer(app);

    server.once("error", (error) => {
      if (error.code === "EADDRINUSE") {
        const nextPort = port + 1;
        console.warn(`Port ${port} is in use. Retrying on port ${nextPort}...`);
        resolve(createServer(nextPort, basePort));
        return;
      }

      reject(error);
    });

    server.listen(port, () => {
      const fallbackNote =
        port === basePort ? "" : ` (fallback from ${basePort})`;
      console.log(
        `Server listening on http://localhost:${port}${fallbackNote}`,
      );
      resolve(server);
    });
  });

const getDatabaseErrorMessage = (error) => {
  if (error.code === "ER_ACCESS_DENIED_ERROR") {
    return "Khong the dang nhap MySQL. Hay kiem tra DB_USER va DB_PASSWORD trong server/.env.";
  }

  if (error.code === "ER_BAD_DB_ERROR") {
    return "Database figure_shop chua ton tai. Hay mo database.sql bang MySQL Workbench va chay file nay truoc.";
  }

  if (error.code === "ECONNREFUSED") {
    return "Khong ket noi duoc MySQL Server. Hay mo MySQL Workbench/XAMPP/MySQL Service va kiem tra DB_HOST, DB_PORT.";
  }

  return `Loi ket noi MySQL: ${error.message}`;
};

const bootstrap = async () => {
  await testConnection();
  await createServer(PORT);
};

if (require.main === module) {
  bootstrap().catch((error) => {
    console.error(getDatabaseErrorMessage(error));
    process.exit(1);
  });
}

module.exports = app;
