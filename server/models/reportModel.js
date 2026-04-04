const pool = require("../config/db");

const GROUP_FORMATS = {
  day: "%Y-%m-%d",
  month: "%Y-%m",
  year: "%Y",
};

const buildStatusFilter = (statuses) => {
  const safeStatuses =
    Array.isArray(statuses) && statuses.length ? statuses : ["completed"];
  const placeholders = safeStatuses.map(() => "?").join(", ");
  return {
    clause: `o.status IN (${placeholders})`,
    values: safeStatuses,
  };
};

const getRevenueSeries = async ({ group, from, to, statuses }) => {
  const format = GROUP_FORMATS[group] || GROUP_FORMATS.day;
  const statusFilter = buildStatusFilter(statuses);
  const includePreorders =
    Array.isArray(statuses) && statuses.includes("completed");

  if (includePreorders) {
    const [rows] = await pool.execute(
      `
        SELECT period,
               SUM(total_revenue) AS total_revenue,
               SUM(order_count) AS order_count
        FROM (
          SELECT DATE_FORMAT(o.created_at, ?) AS period,
                 SUM(o.total_amount) AS total_revenue,
                 COUNT(*) AS order_count
          FROM orders o
          WHERE ${statusFilter.clause}
            AND o.created_at BETWEEN ? AND ?
          GROUP BY period

          UNION ALL

          SELECT DATE_FORMAT(p.updated_at, ?) AS period,
                 SUM(p.price_at_order * p.quantity) AS total_revenue,
                 COUNT(*) AS order_count
          FROM preorders p
          WHERE p.status = 'completed'
            AND p.updated_at BETWEEN ? AND ?
          GROUP BY period
        ) summary
        GROUP BY period
        ORDER BY period
      `,
      [format, ...statusFilter.values, from, to, format, from, to],
    );

    return rows.map((row) => ({
      period: row.period,
      total_revenue: Number(row.total_revenue || 0),
      order_count: Number(row.order_count || 0),
    }));
  }

  const [rows] = await pool.execute(
    `
      SELECT DATE_FORMAT(o.created_at, ?) AS period,
             SUM(o.total_amount) AS total_revenue,
             COUNT(*) AS order_count
      FROM orders o
      WHERE ${statusFilter.clause}
        AND o.created_at BETWEEN ? AND ?
      GROUP BY period
      ORDER BY period
    `,
    [format, ...statusFilter.values, from, to],
  );

  return rows.map((row) => ({
    period: row.period,
    total_revenue: Number(row.total_revenue || 0),
    order_count: Number(row.order_count || 0),
  }));
};

const getTopProducts = async ({ from, to, limit, statuses }) => {
  const statusFilter = buildStatusFilter(statuses);
  const [rows] = await pool.execute(
    `
      SELECT p.product_id,
             p.name,
             SUM(oi.quantity) AS total_quantity,
             SUM(oi.quantity * oi.price) AS total_revenue,
             COALESCE(
               (
                 SELECT pi.image_url FROM product_images pi
                 WHERE pi.product_id = p.product_id AND pi.is_main = 1
                 ORDER BY pi.image_id ASC LIMIT 1
               ),
               (
                 SELECT pi.image_url FROM product_images pi
                 WHERE pi.product_id = p.product_id
                 ORDER BY pi.image_id ASC LIMIT 1
               )
             ) AS image_url
      FROM order_items oi
      JOIN orders o ON o.order_id = oi.order_id
      JOIN products p ON p.product_id = oi.product_id
      WHERE ${statusFilter.clause}
        AND o.created_at BETWEEN ? AND ?
      GROUP BY p.product_id, p.name
      ORDER BY total_quantity DESC, total_revenue DESC
      LIMIT ?
    `,
    [...statusFilter.values, from, to, limit],
  );

  return rows.map((row) => ({
    product_id: row.product_id,
    name: row.name,
    total_quantity: Number(row.total_quantity || 0),
    total_revenue: Number(row.total_revenue || 0),
    image_url: row.image_url,
  }));
};

const getInventorySummary = async ({ lowStock }) => {
  const [rows] = await pool.execute(
    `
      SELECT COUNT(*) AS total_products,
             SUM(stock_quantity) AS total_stock,
             SUM(stock_quantity <= 0) AS out_of_stock,
             SUM(stock_quantity <= ?) AS low_stock
      FROM products
    `,
    [lowStock],
  );

  const summary = rows[0] || {};
  return {
    total_products: Number(summary.total_products || 0),
    total_stock: Number(summary.total_stock || 0),
    out_of_stock: Number(summary.out_of_stock || 0),
    low_stock: Number(summary.low_stock || 0),
  };
};

const getInventoryItems = async () => {
  const [rows] = await pool.execute(
    `
      SELECT p.product_id,
             p.name,
             p.price,
             p.stock_quantity,
             p.status,
             p.category,
             p.series,
             p.brand,
             COALESCE(
               (
                 SELECT pi.image_url FROM product_images pi
                 WHERE pi.product_id = p.product_id AND pi.is_main = 1
                 ORDER BY pi.image_id ASC LIMIT 1
               ),
               (
                 SELECT pi.image_url FROM product_images pi
                 WHERE pi.product_id = p.product_id
                 ORDER BY pi.image_id ASC LIMIT 1
               )
             ) AS image_url
      FROM products p
      ORDER BY p.stock_quantity ASC, p.name ASC
    `,
  );

  return rows.map((row) => ({
    product_id: row.product_id,
    name: row.name,
    price: Number(row.price || 0),
    stock_quantity: Number(row.stock_quantity || 0),
    status: row.status,
    category: row.category,
    series: row.series,
    brand: row.brand,
    image_url: row.image_url,
  }));
};

module.exports = {
  getRevenueSeries,
  getTopProducts,
  getInventorySummary,
  getInventoryItems,
};
