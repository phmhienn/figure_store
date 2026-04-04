const pool = require("../config/db");

const findByProduct = async (productId) => {
  const [rows] = await pool.execute(
    `
      SELECT r.review_id, r.product_id, r.user_id, r.rating, r.comment,
             r.created_at, u.username, u.full_name
      FROM reviews r
      JOIN users u ON u.user_id = r.user_id
      WHERE r.product_id = ?
      ORDER BY r.created_at DESC, r.review_id DESC
    `,
    [productId],
  );

  return rows;
};

const getStatsByProduct = async (productId) => {
  const [rows] = await pool.execute(
    `
      SELECT COUNT(*) AS total_reviews,
             COALESCE(AVG(rating), 0) AS avg_rating
      FROM reviews
      WHERE product_id = ?
    `,
    [productId],
  );

  return rows[0] || { total_reviews: 0, avg_rating: 0 };
};

const findByUserAndProduct = async (userId, productId) => {
  const [rows] = await pool.execute(
    `SELECT * FROM reviews WHERE user_id = ? AND product_id = ? LIMIT 1`,
    [userId, productId],
  );

  return rows[0] || null;
};

const create = async ({ userId, productId, rating, comment }) => {
  const [result] = await pool.execute(
    `
      INSERT INTO reviews (user_id, product_id, rating, comment)
      VALUES (?, ?, ?, ?)
    `,
    [userId, productId, rating, comment],
  );

  return result.insertId;
};

const hasCompletedOrder = async (userId, productId) => {
  const [rows] = await pool.execute(
    `
      SELECT 1
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.order_id
      WHERE o.user_id = ? AND oi.product_id = ? AND o.status = 'completed'
      UNION
      SELECT 1
      FROM preorders p
      WHERE p.user_id = ? AND p.product_id = ? AND p.status = 'completed'
      LIMIT 1
    `,
    [userId, productId, userId, productId],
  );

  return rows.length > 0;
};

module.exports = {
  findByProduct,
  getStatsByProduct,
  findByUserAndProduct,
  create,
  hasCompletedOrder,
};
