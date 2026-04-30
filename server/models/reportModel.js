const pool = require("../config/db");

const GROUP_FORMATS = {
  day: "YYYY-MM-DD",
  month: "YYYY-MM",
  year: "YYYY",
};

const buildStatusFilter = (statuses, addParam) => {
  const safeStatuses =
    Array.isArray(statuses) && statuses.length ? statuses : ["completed"];
  const placeholders = safeStatuses
    .map((status) => addParam(status))
    .join(", ");
  return `o.status IN (${placeholders})`;
};

const getRevenueSeries = async ({ group, from, to, statuses }) => {
  const format = GROUP_FORMATS[group] || GROUP_FORMATS.day;
  const params = [];
  const addParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  const formatParam = addParam(format);
  const statusClause = buildStatusFilter(statuses, addParam);
  const fromParam = addParam(from);
  const toParam = addParam(to);
  const includePreorders =
    Array.isArray(statuses) && statuses.includes("completed");

  if (includePreorders) {
    const preorderFormatParam = addParam(format);
    const preorderFromParam = addParam(from);
    const preorderToParam = addParam(to);

    const { rows } = await pool.query(
      `
        SELECT period,
               SUM(total_revenue) AS total_revenue,
               SUM(order_count) AS order_count
        FROM (
          SELECT TO_CHAR(o.created_at, ${formatParam}) AS period,
                 SUM(o.total_amount) AS total_revenue,
                 COUNT(*) AS order_count
          FROM orders o
          WHERE ${statusClause}
            AND o.created_at BETWEEN ${fromParam} AND ${toParam}
          GROUP BY period

          UNION ALL

          SELECT TO_CHAR(p.updated_at, ${preorderFormatParam}) AS period,
                 SUM(p.price_at_order * p.quantity) AS total_revenue,
                 COUNT(*) AS order_count
          FROM preorders p
          WHERE p.status = 'completed'
            AND p.updated_at BETWEEN ${preorderFromParam} AND ${preorderToParam}
          GROUP BY period
        ) summary
        GROUP BY period
        ORDER BY period
      `,
      params,
    );

    return rows.map((row) => ({
      period: row.period,
      total_revenue: Number(row.total_revenue || 0),
      order_count: Number(row.order_count || 0),
    }));
  }

  const { rows } = await pool.query(
    `
      SELECT TO_CHAR(o.created_at, ${formatParam}) AS period,
             SUM(o.total_amount) AS total_revenue,
             COUNT(*) AS order_count
      FROM orders o
      WHERE ${statusClause}
        AND o.created_at BETWEEN ${fromParam} AND ${toParam}
      GROUP BY period
      ORDER BY period
    `,
    params,
  );

  return rows.map((row) => ({
    period: row.period,
    total_revenue: Number(row.total_revenue || 0),
    order_count: Number(row.order_count || 0),
  }));
};

const getTopProducts = async ({ from, to, limit, statuses }) => {
  const params = [];
  const addParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };
  const statusClause = buildStatusFilter(statuses, addParam);
  const fromParam = addParam(from);
  const toParam = addParam(to);
  const limitParam = addParam(limit);

  const { rows } = await pool.query(
    `
      SELECT p.product_id,
             p.name,
             SUM(oi.quantity) AS total_quantity,
             SUM(oi.quantity * oi.price) AS total_revenue,
             COALESCE(
               (
                 SELECT pi.image_url FROM product_images pi
                 WHERE pi.product_id = p.product_id AND pi.is_main = TRUE
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
      WHERE ${statusClause}
        AND o.created_at BETWEEN ${fromParam} AND ${toParam}
      GROUP BY p.product_id, p.name
      ORDER BY total_quantity DESC, total_revenue DESC
      LIMIT ${limitParam}
    `,
    params,
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
  const { rows } = await pool.query(
    `
      SELECT COUNT(*) AS total_products,
             SUM(stock_quantity) AS total_stock,
             SUM(CASE WHEN stock_quantity <= 0 THEN 1 ELSE 0 END) AS out_of_stock,
             SUM(CASE WHEN stock_quantity <= $1 THEN 1 ELSE 0 END) AS low_stock
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
  const { rows } = await pool.query(
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
                 WHERE pi.product_id = p.product_id AND pi.is_main = TRUE
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
