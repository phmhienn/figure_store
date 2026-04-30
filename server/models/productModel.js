const pool = require("../config/db");

// ── Schema auto-detection ────────────────────────────────────────────
// 'normalized'     -> new schema: product_images, categories, series, brands tables
// 'flat-with-slug' -> legacy flat schema but with slug column on products
// 'flat'           -> original flat schema (no slug, no junction tables)
let _schemaMode = null;

const detectSchema = async () => {
  if (_schemaMode) return _schemaMode;

  try {
    await pool.query("SELECT 1 FROM product_images LIMIT 1");
    _schemaMode = "normalized";
    return _schemaMode;
  } catch (_e) {
    /* product_images table not found */
  }

  try {
    await pool.query("SELECT slug FROM products LIMIT 1");
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
      (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = p.product_id AND pi.is_main = TRUE ORDER BY pi.image_id ASC LIMIT 1),
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
  const { rows } = await pool.query(
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

  const whereClauses = [];
  const params = [];
  const addParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  whereClauses.push(`p.status = ${addParam("active")}`);

  if (inStockOnly) {
    whereClauses.push("p.stock_quantity > 0");
  }

  if (category) {
    if (schema === "normalized") {
      whereClauses.push(`EXISTS (
        SELECT 1 FROM product_categories pc
        JOIN categories c ON c.category_id = pc.category_id
        WHERE pc.product_id = p.product_id AND c.name = ${addParam(category)}
      )`);
    } else {
      whereClauses.push(`p.category = ${addParam(category)}`);
    }
  }

  if (search) {
    const term = `%${search}%`;
    whereClauses.push(
      `(p.name ILIKE ${addParam(term)} OR p.description ILIKE ${addParam(term)})`,
    );
  }

  const whereClause = whereClauses.join(" AND ");

  const countParams = [...params];
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) AS total FROM products p WHERE ${whereClause}`,
    countParams,
  );
  const total = Number(countRows[0]?.total || 0);
  const offset = (page - 1) * limit;

  const limitPlaceholder = addParam(Number(limit));
  const offsetPlaceholder = addParam(Number(offset));

  const { rows } = await pool.query(
    `${SELECT} WHERE ${whereClause}
     ORDER BY p.created_at DESC, p.product_id DESC
     LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`,
    params,
  );

  return {
    data: rows,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

const findById = async (id) => {
  const SELECT = await getSelect();
  const { rows } = await pool.query(`${SELECT} WHERE p.product_id = $1`, [id]);
  return rows[0] || null;
};

const incrementViewCount = async (id) => {
  const result = await pool.query(
    "UPDATE products SET view_count = COALESCE(view_count, 0) + 1 WHERE product_id = $1",
    [id],
  );
  return result.rowCount > 0;
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
  const { rows } = await conn.query(
    `SELECT ${idCol} FROM ${table} WHERE name = $1`,
    [name],
  );
  if (rows.length) return rows[0][idCol];
  const { rows: insertRows } = await conn.query(
    `INSERT INTO ${table} (name) VALUES ($1) RETURNING ${idCol}`,
    [name],
  );
  return insertRows[0][idCol];
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

    const placeholders = vals.map((_, index) => `$${index + 1}`).join(", ");
    const { rows } = await pool.query(
      `INSERT INTO products (${cols}) VALUES (${placeholders}) RETURNING product_id`,
      vals,
    );
    return rows[0]?.product_id ? findById(rows[0].product_id) : null;
  }

  // normalized schema
  const connection = await pool.connect();
  try {
    await connection.query("BEGIN");

    const slug = productData.slug?.trim() || slugify(productData.name || "");
    const { rows: productRows } = await connection.query(
      `INSERT INTO products (name, slug, description, price, stock_quantity, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING product_id`,
      [
        productData.name,
        slug,
        productData.description || "",
        productData.price,
        productData.stock_quantity ?? 0,
        productData.status === "inactive" ? "inactive" : "active",
      ],
    );
    const productId = productRows[0].product_id;

    if (productData.image_url) {
      await connection.query(
        `INSERT INTO product_images (product_id, image_url, is_main) VALUES ($1, $2, TRUE)`,
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
      await connection.query(
        `INSERT INTO product_categories (product_id, category_id) VALUES ($1, $2)`,
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
      await connection.query(
        `INSERT INTO product_series (product_id, series_id) VALUES ($1, $2)`,
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
      await connection.query(
        `INSERT INTO product_brands (product_id, brand_id) VALUES ($1, $2)`,
        [productId, bid],
      );
    }

    await connection.query("COMMIT");
    return findById(productId);
  } catch (error) {
    await connection.query("ROLLBACK");
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

    const setParts = [];
    const values = [];
    const add = (column, value) => {
      values.push(value);
      setParts.push(`${column} = $${values.length}`);
    };

    add("name", productData.name);
    if (hasSlug) {
      add("slug", slug);
    }
    add("description", productData.description || "");
    add("price", productData.price);
    add("stock_quantity", productData.stock_quantity ?? 0);
    add("image_url", productData.image_url || "");
    add("category", productData.category || "");
    add("series", productData.series || "");
    add("brand", productData.brand || "");
    add("status", productData.status === "inactive" ? "inactive" : "active");

    values.push(id);
    const idPlaceholder = `$${values.length}`;
    const result = await pool.query(
      `UPDATE products SET ${setParts.join(", ")} WHERE product_id = ${idPlaceholder}`,
      values,
    );
    if (!result.rowCount) return null;
    return findById(id);
  }

  // normalized schema
  const connection = await pool.connect();
  try {
    await connection.query("BEGIN");

    const slug = productData.slug?.trim() || slugify(productData.name || "");
    const result = await connection.query(
      `UPDATE products SET name = $1, slug = $2, description = $3, price = $4, stock_quantity = $5, status = $6
       WHERE product_id = $7`,
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
    if (!result.rowCount) {
      await connection.query("ROLLBACK");
      return null;
    }

    if (productData.image_url) {
      await connection.query(
        `DELETE FROM product_images WHERE product_id = $1 AND is_main = TRUE`,
        [id],
      );
      await connection.query(
        `INSERT INTO product_images (product_id, image_url, is_main) VALUES ($1, $2, TRUE)`,
        [id, productData.image_url],
      );
    }

    await connection.query(
      `DELETE FROM product_categories WHERE product_id = $1`,
      [id],
    );
    if (productData.category) {
      const cid = await findOrCreateLookup(
        connection,
        "categories",
        "category_id",
        productData.category,
      );
      await connection.query(
        `INSERT INTO product_categories (product_id, category_id) VALUES ($1, $2)`,
        [id, cid],
      );
    }

    await connection.query(`DELETE FROM product_series WHERE product_id = $1`, [
      id,
    ]);
    if (productData.series) {
      const sid = await findOrCreateLookup(
        connection,
        "series",
        "series_id",
        productData.series,
      );
      await connection.query(
        `INSERT INTO product_series (product_id, series_id) VALUES ($1, $2)`,
        [id, sid],
      );
    }

    await connection.query(`DELETE FROM product_brands WHERE product_id = $1`, [
      id,
    ]);
    if (productData.brand) {
      const bid = await findOrCreateLookup(
        connection,
        "brands",
        "brand_id",
        productData.brand,
      );
      await connection.query(
        `INSERT INTO product_brands (product_id, brand_id) VALUES ($1, $2)`,
        [id, bid],
      );
    }

    await connection.query("COMMIT");
    return findById(id);
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  } finally {
    connection.release();
  }
};

// ── Delete ───────────────────────────────────────────────────────────

const deleteProduct = async (id) => {
  const result = await pool.query(
    "DELETE FROM products WHERE product_id = $1",
    [id],
  );
  return result.rowCount > 0;
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
