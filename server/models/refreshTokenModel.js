const pool = require("../config/db");

const create = async ({ user_id, token_hash, expires_at }) => {
  await pool.execute(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES (?, ?, ?)`,
    [user_id, token_hash, expires_at],
  );
};

const findByHash = async (tokenHash) => {
  const [rows] = await pool.execute(
    `SELECT * FROM refresh_tokens WHERE token_hash = ? AND expires_at > NOW()`,
    [tokenHash],
  );
  return rows[0] || null;
};

const deleteByHash = async (tokenHash) => {
  await pool.execute(
    `DELETE FROM refresh_tokens WHERE token_hash = ?`,
    [tokenHash],
  );
};

const deleteAllForUser = async (userId) => {
  await pool.execute(
    `DELETE FROM refresh_tokens WHERE user_id = ?`,
    [userId],
  );
};

const deleteExpired = async () => {
  await pool.execute(`DELETE FROM refresh_tokens WHERE expires_at <= NOW()`);
};

module.exports = {
  create,
  findByHash,
  deleteByHash,
  deleteAllForUser,
  deleteExpired,
};
