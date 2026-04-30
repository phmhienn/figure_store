const pool = require("../config/db");

const create = async ({ user_id, token_hash, expires_at }) => {
  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user_id, token_hash, expires_at],
  );
};

const findByHash = async (tokenHash) => {
  const { rows } = await pool.query(
    `SELECT *
     FROM password_reset_tokens
     WHERE token_hash = $1 AND expires_at > NOW()`,
    [tokenHash],
  );
  return rows[0] || null;
};

const deleteByHash = async (tokenHash) => {
  await pool.query(`DELETE FROM password_reset_tokens WHERE token_hash = $1`, [
    tokenHash,
  ]);
};

const deleteAllForUser = async (userId) => {
  await pool.query(`DELETE FROM password_reset_tokens WHERE user_id = $1`, [
    userId,
  ]);
};

const deleteExpired = async () => {
  await pool.query(
    `DELETE FROM password_reset_tokens WHERE expires_at <= NOW()`,
  );
};

module.exports = {
  create,
  findByHash,
  deleteByHash,
  deleteAllForUser,
  deleteExpired,
};
