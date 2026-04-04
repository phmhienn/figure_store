const pool = require("../config/db");

// ── Schema auto-detection ────────────────────────────────────────────
// 'normalized'     → new schema: product_images, categories, series, brands tables
// 'flat-with-slug' → legacy flat schema but with slug column on products
// 'flat'           → original flat schema (no slug, no junction tables)
let _schemaMode = null;

const detectSchema = async () => {
  if (_schemaMode) return _schemaMode;

  try {
    await pool.execute("SELECT 1 FROM product_images LIMIT 1");
    _schemaMode = "normalized";
    return _schemaMode;
  } catch (_e) {
    /* product_images table not found */
  }

  try {
    await pool.execute("SELECT slug FROM products LIMIT 1");
    _schemaMode = "flat-with-slug";
  } catch (_e) {
    _schemaMode = "flat";
  }

  return _schemaMode;
};

// ── SELECT fragments ─────────────────────────────────────────────────

const NORM_SELECT = `
  SELECT
    p.product_id, p.name, p.slug,
    p.description, p.price, p.stock_quantity,
    p.view_count, p.release_date, p.status, p.created_at,
    COALESCE(
      (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = p.product_id AND pi.is_main = 1 ORDER BY pi.image_id ASC LIMIT 1),
      (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = p.product_id ORDER BY pi.image_id ASC LIMIT 1)
    ) AS image_url,
    (SELECT c.name FROM categories c JOIN product_categories pc ON pc.category_id = c.category_id WHERE pc.product_id = p.product_id LIMIT 1) AS category,
    (SELECT s.name FROM series s JOIN product_series ps ON ps.series_id = s.series_id WHERE ps.product_id = p.product_id LIMIT 1) AS series,
    (SELECT b.name FROM brands b JOIN product_brands pb ON pb.brand_id = b.brand_id WHERE pb.product_id = p.product_id LIMIT 1) AS brand
  FROM products p
`;

const FLAT_SLUG_SELECT = `
  SELECT p.product_id, p.name, p.slug, p.description,
         p.price, p.stock_quantity, p.view_count, p.status, p.created_at,
         p.image_url, p.category, p.series, p.brand
  FROM products p
`;

const FLAT_SELECT = `
  SELECT p.product_id, p.name, p.description,
         p.price, p.stock_quantity, p.view_count, p.status, p.created_at,
         p.image_url, p.category, p.series, p.brand
  FROM products p
`;

const getSelect = async () => {
  const s = await detectSchema();
  if (s === "normalized") return NORM_SELECT;
  if (s === "flat-with-slug") return FLAT_SLUG_SELECT;
  return FLAT_SELECT;
};

// ── Read operations ──────────────────────────────────────────────────

const findAll = async () => {
  const SELECT = await getSelect();
  const [rows] = await pool.execute(
    `${SELECT} ORDER BY p.created_at DESC, p.product_id DESC`,
  );
  return rows;
};

const findPaginated = async ({
  page = 1,
  limit = 10,
  category,
  search,
  inStockOnly,
} = {}) => {
  const schema = await detectSchema();
  const SELECT =
    schema === "normalized"
      ? NORM_SELECT
      : schema === "flat-with-slug"
        ? FLAT_SLUG_SELECT
        : FLAT_SELECT;

  const whereClauses = ["p.status = ?"];
  const params = ["active"];

  if (inStockOnly) {
    whereClauses.push("p.stock_quantity > 0");
  }

  if (category) {
    if (schema === "normalized") {
      whereClauses.push(`EXISTS (
        SELECT 1 FROM product_categories pc
        JOIN categories c ON c.category_id = pc.category_id
        WHERE pc.product_id = p.product_id AND c.name = ?
      )`);
    } else {
      whereClauses.push("p.category = ?");
    }
    params.push(category);
  }

  if (search) {
    whereClauses.push("(p.name LIKE ? OR p.description LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  const whereClause = whereClauses.join(" AND ");

  const [countResult] = await pool.execute(
    `SELECT COUNT(*) as total FROM products p WHERE ${whereClause}`,
    params,
  );
  const total = countResult[0].total;
  const offset = (page - 1) * limit;

  const [rows] = await pool.execute(
    `${SELECT} WHERE ${whereClause}
     ORDER BY p.created_at DESC, p.product_id DESC
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params,
  );

  return {
    data: rows,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

const findById = async (id) => {
  const SELECT = await getSelect();
  const [rows] = await pool.execute(`${SELECT} WHERE p.product_id = ?`, [id]);
  return rows[0] || null;
};

const incrementViewCount = async (id) => {
  const [result] = await pool.execute(
    "UPDATE products SET view_count = COALESCE(view_count, 0) + 1 WHERE product_id = ?",
    [id],
  );
  return result.affectedRows > 0;
};

// ── Write helpers ────────────────────────────────────────────────────

const slugify = (value) =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const findOrCreateLookup = async (conn, table, idCol, name) => {
  const [rows] = await conn.execute(
    `SELECT ${idCol} FROM ${table} WHERE name = ?`,
    [name],
  );
  if (rows.length) return rows[0][idCol];
  const [res] = await conn.execute(`INSERT INTO ${table} (name) VALUES (?)`, [
    name,
  ]);
  return res.insertId;
};

// ── Create ───────────────────────────────────────────────────────────

const create = async (productData) => {
  const schema = await detectSchema();

  if (schema !== "normalized") {
    // flat or flat-with-slug
    const hasSlug = schema === "flat-with-slug";
    const slug = hasSlug
      ? productData.slug?.trim() || slugify(productData.name || "")
      : null;

    const cols = [
      "name",
      ...(hasSlug ? ["slug"] : []),
      "description",
      "price",
      "stock_quantity",
      "image_url",
      "category",
      "series",
      "brand",
      "status",
    ].join(", ");

    const vals = [
      productData.name,
      ...(hasSlug ? [slug] : []),
      productData.description || "",
      productData.price,
      productData.stock_quantity ?? 0,
      productData.image_url || "",
      productData.category || "",
      productData.series || "",
      productData.brand || "",
      productData.status === "inactive" ? "inactive" : "active",
    ];

    const placeholders = vals.map(() => "?").join(", ");
    const [result] = await pool.execute(
      `INSERT INTO products (${cols}) VALUES (${placeholders})`,
      vals,
    );
    return findById(result.insertId);
  }

  // normalized schema
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const slug = productData.slug?.trim() || slugify(productData.name || "");
    const [result] = await connection.execute(
      `INSERT INTO products (name, slug, description, price, stock_quantity, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        productData.name,
        slug,
        productData.description || "",
        productData.price,
        productData.stock_quantity ?? 0,
        productData.status === "inactive" ? "inactive" : "active",
      ],
    );
    const productId = result.insertId;

    if (productData.image_url) {
      await connection.execute(
        `INSERT INTO product_images (product_id, image_url, is_main) VALUES (?, ?, 1)`,
        [productId, productData.image_url],
      );
    }
    if (productData.category) {
      const cid = await findOrCreateLookup(
        connection,
        "categories",
        "category_id",
        productData.category,
      );
      await connection.execute(
        `INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)`,
        [productId, cid],
      );
    }
    if (productData.series) {
      const sid = await findOrCreateLookup(
        connection,
        "series",
        "series_id",
        productData.series,
      );
      await connection.execute(
        `INSERT INTO product_series (product_id, series_id) VALUES (?, ?)`,
        [productId, sid],
      );
    }
    if (productData.brand) {
      const bid = await findOrCreateLookup(
        connection,
        "brands",
        "brand_id",
        productData.brand,
      );
      await connection.execute(
        `INSERT INTO product_brands (product_id, brand_id) VALUES (?, ?)`,
        [productId, bid],
      );
    }

    await connection.commit();
    return findById(productId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// ── Update ───────────────────────────────────────────────────────────

const update = async (id, productData) => {
  const schema = await detectSchema();

  if (schema !== "normalized") {
    const hasSlug = schema === "flat-with-slug";
    const slug = hasSlug
      ? productData.slug?.trim() || slugify(productData.name || "")
      : null;

    const setCols = [
      "name = ?",
      ...(hasSlug ? ["slug = ?"] : []),
      "description = ?",
      "price = ?",
      "stock_quantity = ?",
      "image_url = ?",
      "category = ?",
      "series = ?",
      "brand = ?",
      "status = ?",
    ].join(", ");

    const vals = [
      productData.name,
      ...(hasSlug ? [slug] : []),
      productData.description || "",
      productData.price,
      productData.stock_quantity ?? 0,
      productData.image_url || "",
      productData.category || "",
      productData.series || "",
      productData.brand || "",
      productData.status === "inactive" ? "inactive" : "active",
      id,
    ];

    const [result] = await pool.execute(
      `UPDATE products SET ${setCols} WHERE product_id = ?`,
      vals,
    );
    if (!result.affectedRows) return null;
    return findById(id);
  }

  // normalized schema
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const slug = productData.slug?.trim() || slugify(productData.name || "");
    const [result] = await connection.execute(
      `UPDATE products SET name = ?, slug = ?, description = ?, price = ?, stock_quantity = ?, status = ?
       WHERE product_id = ?`,
      [
        productData.name,
        slug,
        productData.description || "",
        productData.price,
        productData.stock_quantity ?? 0,
        productData.status === "inactive" ? "inactive" : "active",
        id,
      ],
    );
    if (!result.affectedRows) {
      await connection.rollback();
      return null;
    }

    if (productData.image_url) {
      await connection.execute(
        `DELETE FROM product_images WHERE product_id = ? AND is_main = 1`,
        [id],
      );
      await connection.execute(
        `INSERT INTO product_images (product_id, image_url, is_main) VALUES (?, ?, 1)`,
        [id, productData.image_url],
      );
    }

    await connection.execute(
      `DELETE FROM product_categories WHERE product_id = ?`,
      [id],
    );
    if (productData.category) {
      const cid = await findOrCreateLookup(
        connection,
        "categories",
        "category_id",
        productData.category,
      );
      await connection.execute(
        `INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)`,
        [id, cid],
      );
    }

    await connection.execute(
      `DELETE FROM product_series WHERE product_id = ?`,
      [id],
    );
    if (productData.series) {
      const sid = await findOrCreateLookup(
        connection,
        "series",
        "series_id",
        productData.series,
      );
      await connection.execute(
        `INSERT INTO product_series (product_id, series_id) VALUES (?, ?)`,
        [id, sid],
      );
    }

    await connection.execute(
      `DELETE FROM product_brands WHERE product_id = ?`,
      [id],
    );
    if (productData.brand) {
      const bid = await findOrCreateLookup(
        connection,
        "brands",
        "brand_id",
        productData.brand,
      );
      await connection.execute(
        `INSERT INTO product_brands (product_id, brand_id) VALUES (?, ?)`,
        [id, bid],
      );
    }

    await connection.commit();
    return findById(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// ── Delete ───────────────────────────────────────────────────────────

const deleteProduct = async (id) => {
  const [result] = await pool.execute(
    "DELETE FROM products WHERE product_id = ?",
    [id],
  );
  return result.affectedRows > 0;
};

module.exports = {
  findAll,
  findPaginated,
  findById,
  incrementViewCount,
  create,
  update,
  delete: deleteProduct,
};
