const pool = require("../config/db");

const findById = async (id) => {
  const { rows } = await pool.query(
    "SELECT * FROM preorders WHERE preorder_id = $1",
    [id],
  );
  return rows[0] || null;
};

const findByCode = async (code) => {
  const { rows } = await pool.query("SELECT * FROM preorders WHERE code = $1", [
    code,
  ]);
  return rows[0] || null;
};

const findByCodeAndPhone = async (code, phone) => {
  const { rows } = await pool.query(
    "SELECT * FROM preorders WHERE code = $1 AND contact_phone = $2",
    [code, phone],
  );
  return rows[0] || null;
};

const findByUserId = async (userId) => {
  const { rows } = await pool.query(
    "SELECT * FROM preorders WHERE user_id = $1 ORDER BY created_at DESC, preorder_id DESC",
    [userId],
  );
  return rows;
};

const findAll = async () => {
  const { rows } = await pool.query(
    "SELECT * FROM preorders ORDER BY created_at DESC, preorder_id DESC",
  );
  return rows;
};

const create = async ({
  userId,
  productId,
  quantity,
  priceAtOrder,
  depositRatio,
  depositAmount,
  code,
  contactEmail,
  contactPhone,
}) => {
  const { rows } = await pool.query(
    `
      INSERT INTO preorders
        (user_id, product_id, quantity, price_at_order, deposit_ratio,
         deposit_amount, status, code, contact_email, contact_phone)
      VALUES ($1, $2, $3, $4, $5, $6, 'requested', $7, $8, $9)
      RETURNING preorder_id
    `,
    [
      userId,
      productId,
      quantity,
      priceAtOrder,
      depositRatio,
      depositAmount,
      code,
      contactEmail,
      contactPhone,
    ],
  );

  return rows[0]?.preorder_id ? findById(rows[0].preorder_id) : null;
};

const updateStatus = async (id, status) => {
  const result = await pool.query(
    "UPDATE preorders SET status = $1 WHERE preorder_id = $2",
    [status, id],
  );

  return result.rowCount > 0;
};

const markDeposited = async (id) => {
  const result = await pool.query(
    `
      UPDATE preorders
      SET status = 'deposited', deposit_paid_at = COALESCE(deposit_paid_at, NOW())
      WHERE preorder_id = $1 AND deposit_paid_at IS NULL
    `,
    [id],
  );

  return result.rowCount > 0;
};

const deleteById = async (id) => {
  const result = await pool.query(
    "DELETE FROM preorders WHERE preorder_id = $1",
    [id],
  );
  return result.rowCount > 0;
};

const purgeExpiredPreorders = async (minutes = 10) => {
  const safeMinutes = Math.max(1, Number(minutes) || 10);
  const result = await pool.query(
    `
      DELETE FROM preorders
      WHERE (status = 'requested'
        AND created_at < NOW() - ($1 * INTERVAL '1 minute'))
        OR status = 'payment_failed'
    `,
    [safeMinutes],
  );

  return result.rowCount;
};

module.exports = {
  findById,
  findByCode,
  findByCodeAndPhone,
  findByUserId,
  findAll,
  create,
  updateStatus,
  markDeposited,
  deleteById,
  purgeExpiredPreorders,
};
