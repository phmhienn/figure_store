const pool = require("../config/db");

const findByProduct = async (productId) => {
  const { rows } = await pool.query(
    `
      SELECT r.review_id, r.product_id, r.user_id, r.rating, r.comment,
             r.created_at, u.username, u.full_name
      FROM reviews r
      JOIN users u ON u.user_id = r.user_id
      WHERE r.product_id = $1
      ORDER BY r.created_at DESC, r.review_id DESC
    `,
    [productId],
  );

  return rows;
};

const getStatsByProduct = async (productId) => {
  const { rows } = await pool.query(
    `
      SELECT COUNT(*) AS total_reviews,
             COALESCE(AVG(rating), 0) AS avg_rating
      FROM reviews
      WHERE product_id = $1
    `,
    [productId],
  );

  return rows[0] || { total_reviews: 0, avg_rating: 0 };
};

const findByUserAndProduct = async (userId, productId) => {
  const { rows } = await pool.query(
    `SELECT * FROM reviews WHERE user_id = $1 AND product_id = $2 LIMIT 1`,
    [userId, productId],
  );

  return rows[0] || null;
};

const create = async ({ userId, productId, rating, comment }) => {
  const { rows } = await pool.query(
    `
      INSERT INTO reviews (user_id, product_id, rating, comment)
      VALUES ($1, $2, $3, $4)
      RETURNING review_id
    `,
    [userId, productId, rating, comment],
  );

  return rows[0]?.review_id;
};

const hasCompletedOrder = async (userId, productId) => {
  const { rows } = await pool.query(
    `
      SELECT 1
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.order_id
      WHERE o.user_id = $1 AND oi.product_id = $2 AND o.status = 'completed'
      UNION
      SELECT 1
      FROM preorders p
      WHERE p.user_id = $3 AND p.product_id = $4 AND p.status = 'completed'
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
