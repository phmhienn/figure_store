const newsModel = require("../models/newsModel");

const normalizeNewsPayload = (body) => ({
  title: body.title?.trim(),
  slug: body.slug?.trim() || "",
  excerpt: body.excerpt?.trim() || "",
  content: body.content || "",
  cover_image_url: body.cover_image_url?.trim() || "",
  status: body.status === "published" ? "published" : "draft",
});

const getPublishedPosts = async (req, res, next) => {
  try {
    const search = req.query.search?.trim();
    const posts = await newsModel.findPublished({ search });
    return res.json(posts);
  } catch (error) {
    return next(error);
  }
};

const getAdminPosts = async (req, res, next) => {
  try {
    const status = req.query.status?.trim();
    const search = req.query.search?.trim();
    const posts = await newsModel.findAll({ status, search });
    return res.json(posts);
  } catch (error) {
    return next(error);
  }
};

const getPostById = async (req, res, next) => {
  try {
    const post = await newsModel.findById(req.params.id);

    if (!post || post.status !== "published") {
      return res.status(404).json({ message: "Post not found." });
    }

    return res.json(post);
  } catch (error) {
    return next(error);
  }
};

const createPost = async (req, res, next) => {
  try {
    const payload = normalizeNewsPayload(req.body);
    payload.author_id = req.user.userId;
    const post = await newsModel.create(payload);
    return res.status(201).json(post);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "News slug already exists." });
    }

    return next(error);
  }
};

const updatePost = async (req, res, next) => {
  try {
    const payload = normalizeNewsPayload(req.body);
    const post = await newsModel.update(req.params.id, payload);

    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    return res.json(post);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "News slug already exists." });
    }

    return next(error);
  }
};

const deletePost = async (req, res, next) => {
  try {
    const deleted = await newsModel.remove(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Post not found." });
    }

    return res.json({ message: "Post deleted successfully." });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getPublishedPosts,
  getAdminPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
};
