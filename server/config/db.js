const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

dotenv.config({ path: __dirname + "/../.env" });

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "figure_shop",
  charset: "utf8mb4",
  decimalNumbers: true,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const testConnection = async () => {
  const connection = await pool.getConnection();

  try {
    await connection.ping();
  } finally {
    connection.release();
  }
};

// Export pool as default for backward compat with all models,
// and attach testConnection as a named property.
const db = pool;
db.testConnection = testConnection;

module.exports = db;
