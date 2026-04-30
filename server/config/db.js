const { Pool, types } = require("pg");
const dotenv = require("dotenv");

dotenv.config({ path: __dirname + "/../.env" });

// Match mysql2 decimalNumbers behavior by parsing NUMERIC to Number.
types.setTypeParser(1700, (value) => (value === null ? null : Number(value)));

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "figure_shop",
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const testConnection = async () => {
  const connection = await pool.connect();

  try {
    await connection.query("SELECT 1");
  } finally {
    connection.release();
  }
};

// Export pool as default for backward compat with all models,
// and attach testConnection as a named property.
const db = pool;
db.testConnection = testConnection;

module.exports = db;
