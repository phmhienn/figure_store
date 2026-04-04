const pool = require("../config/db");

const findById = async (id) => {
  const [rows] = await pool.execute(
    "SELECT * FROM preorders WHERE preorder_id = ?",
    [id],
  );
  return rows[0] || null;
};

const findByCode = async (code) => {
  const [rows] = await pool.execute("SELECT * FROM preorders WHERE code = ?", [
    code,
  ]);
  return rows[0] || null;
};

const findByCodeAndPhone = async (code, phone) => {
  const [rows] = await pool.execute(
    "SELECT * FROM preorders WHERE code = ? AND contact_phone = ?",
    [code, phone],
  );
  return rows[0] || null;
};

const findAll = async () => {
  const [rows] = await pool.execute(
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
  const [result] = await pool.execute(
    `
      INSERT INTO preorders
        (user_id, product_id, quantity, price_at_order, deposit_ratio,
         deposit_amount, status, code, contact_email, contact_phone)
      VALUES (?, ?, ?, ?, ?, ?, 'requested', ?, ?, ?)
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

  return findById(result.insertId);
};

const updateStatus = async (id, status) => {
  const [result] = await pool.execute(
    "UPDATE preorders SET status = ? WHERE preorder_id = ?",
    [status, id],
  );

  return result.affectedRows > 0;
};

const markDeposited = async (id) => {
  const [result] = await pool.execute(
    `
      UPDATE preorders
      SET status = 'deposited', deposit_paid_at = COALESCE(deposit_paid_at, NOW())
      WHERE preorder_id = ? AND deposit_paid_at IS NULL
    `,
    [id],
  );

  return result.affectedRows > 0;
};

module.exports = {
  findById,
  findByCode,
  findByCodeAndPhone,
  findAll,
  create,
  updateStatus,
  markDeposited,
};
