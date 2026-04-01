const productModel = require("../models/productModel");

const slugify = (value) =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const normalizeProductPayload = (body) => ({
  name: body.name?.trim(),
  slug: body.slug?.trim() || slugify(body.name || ""),
  description: body.description?.trim() || "",
  price: Number(body.price),
  stock_quantity: Number(body.stock_quantity ?? 0),
  image_url: body.image_url?.trim() || "",
  category: body.category?.trim() || "",
  series: body.series?.trim() || "",
  brand: body.brand?.trim() || "",
  status: body.status === "inactive" ? "inactive" : "active",
});

const getAllProducts = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 10));
    const category = req.query.category?.trim();
    const search = req.query.search?.trim();

    const result = await productModel.findPaginated({
      page,
      limit,
      category,
      search,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const product = await productModel.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    return res.json(product);
  } catch (error) {
    return next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const payload = normalizeProductPayload(req.body);
    const product = await productModel.create(payload);
    return res.status(201).json(product);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Product slug already exists." });
    }

    return next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const payload = normalizeProductPayload(req.body);
    const product = await productModel.update(req.params.id, payload);

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    return res.json(product);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Product slug already exists." });
    }

    return next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const deleted = await productModel.delete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Product not found." });
    }

    return res.json({ message: "Product deleted successfully." });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
