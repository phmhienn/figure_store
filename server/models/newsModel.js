const pool = require("../config/db");

const baseSelect = `
  SELECT n.news_id, n.title, n.slug, n.excerpt, n.content, n.cover_image_url,
         n.status, n.author_id, n.published_at, n.created_at, n.updated_at,
         u.username AS author_username, u.full_name AS author_name
  FROM news_posts n
  LEFT JOIN users u ON u.user_id = n.author_id
`;

const slugify = (value) =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const getUniqueSlug = async (baseSlug, excludeId = null) => {
  const safeBase = baseSlug || "post";
  let candidate = baseSlug ? safeBase : `${safeBase}-${Date.now()}`;
  let suffix = 2;

  while (true) {
    const [rows] = await pool.execute(
      `SELECT news_id FROM news_posts WHERE slug = ?${excludeId ? " AND news_id <> ?" : ""} LIMIT 1`,
      excludeId ? [candidate, excludeId] : [candidate],
    );

    if (!rows.length) {
      return candidate;
    }

    candidate = `${safeBase}-${suffix++}`;
  }
};

const findAll = async ({ status, search } = {}) => {
  const whereClauses = [];
  const params = [];

  if (status) {
    whereClauses.push("n.status = ?");
    params.push(status);
  }

  if (search) {
    whereClauses.push("(n.title LIKE ? OR n.excerpt LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  const whereClause = whereClauses.length
    ? `WHERE ${whereClauses.join(" AND ")}`
    : "";

  const [rows] = await pool.execute(
    `${baseSelect} ${whereClause} ORDER BY n.created_at DESC, n.news_id DESC`,
    params,
  );

  return rows;
};

const findPublished = async ({ search } = {}) => {
  const whereClauses = ["n.status = ?", "n.published_at IS NOT NULL"];
  const params = ["published"];

  if (search) {
    whereClauses.push("(n.title LIKE ? OR n.excerpt LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  const [rows] = await pool.execute(
    `${baseSelect} WHERE ${whereClauses.join(" AND ")}
     ORDER BY n.published_at DESC, n.news_id DESC`,
    params,
  );

  return rows;
};

const findById = async (id) => {
  const [rows] = await pool.execute(`${baseSelect} WHERE n.news_id = ?`, [id]);
  return rows[0] || null;
};

const create = async (payload) => {
  const title = payload.title?.trim();
  const excerpt = payload.excerpt?.trim() || "";
  const content = payload.content || "";
  const coverImage = payload.cover_image_url?.trim() || "";
  const status = payload.status === "published" ? "published" : "draft";
  const slugBase = slugify(payload.slug?.trim() || title || "");
  const slug = await getUniqueSlug(slugBase);
  const publishedAt = status === "published" ? new Date() : null;

  const [result] = await pool.execute(
    `
      INSERT INTO news_posts
        (title, slug, excerpt, content, cover_image_url, status, author_id, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      title,
      slug,
      excerpt,
      content,
      coverImage,
      status,
      payload.author_id,
      publishedAt,
    ],
  );

  return findById(result.insertId);
};

const update = async (id, payload) => {
  const existing = await findById(id);

  if (!existing) {
    return null;
  }

  const nextTitle = payload.title?.trim() || existing.title;
  const rawSlug = payload.slug?.trim();
  const shouldRegenSlug =
    Boolean(rawSlug) || (payload.title && nextTitle !== existing.title);
  const nextSlug = shouldRegenSlug
    ? await getUniqueSlug(slugify(rawSlug || nextTitle), id)
    : existing.slug;

  const nextStatus = payload.status
    ? payload.status === "published"
      ? "published"
      : "draft"
    : existing.status;

  let publishedAt = existing.published_at;
  if (payload.status) {
    if (nextStatus === "published") {
      publishedAt =
        existing.status === "published" && existing.published_at
          ? existing.published_at
          : new Date();
    } else {
      publishedAt = null;
    }
  }

  const nextExcerpt = payload.excerpt?.trim() ?? existing.excerpt;
  const nextContent = payload.content ?? existing.content;
  const nextCoverImage =
    payload.cover_image_url?.trim() ?? existing.cover_image_url;

  await pool.execute(
    `
      UPDATE news_posts
      SET title = ?, slug = ?, excerpt = ?, content = ?, cover_image_url = ?,
          status = ?, published_at = ?
      WHERE news_id = ?
    `,
    [
      nextTitle,
      nextSlug,
      nextExcerpt,
      nextContent,
      nextCoverImage,
      nextStatus,
      publishedAt,
      id,
    ],
  );

  return findById(id);
};

const remove = async (id) => {
  const [result] = await pool.execute(
    "DELETE FROM news_posts WHERE news_id = ?",
    [id],
  );
  return result.affectedRows > 0;
};

module.exports = {
  findAll,
  findPublished,
  findById,
  create,
  update,
  remove,
};
