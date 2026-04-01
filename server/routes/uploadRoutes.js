const express = require("express");
const path = require("path");
const fs = require("fs");

const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");
const {
  uploadProductImage,
  uploadNewsCover,
  PRODUCTS_UPLOADS_DIR,
  NEWS_UPLOADS_DIR,
} = require("../config/upload");

const router = express.Router();

// POST /api/upload/product-image
// Admin only — accepts a single image file in field "image"
router.post(
  "/product-image",
  protect,
  authorizeRoles("admin"),
  uploadProductImage.single("image"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided." });
    }

    // Return the URL path that the client can use directly
    // e.g. "http://localhost:5000/uploads/products/product-12345.jpg"
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const imageUrl = `${baseUrl}/uploads/products/${req.file.filename}`;

    return res.status(201).json({ imageUrl });
  },
);

// DELETE /api/upload/product-image/:filename
// Admin only — removes a previously uploaded file
router.delete(
  "/product-image/:filename",
  protect,
  authorizeRoles("admin"),
  (req, res) => {
    const filename = path.basename(req.params.filename); // strip path traversal
    const filePath = path.join(PRODUCTS_UPLOADS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found." });
    }

    fs.unlink(filePath, (err) => {
      if (err)
        return res.status(500).json({ message: "Failed to delete file." });
      return res.json({ message: "File deleted." });
    });
  },
);

// POST /api/upload/news-cover
// Admin only — accepts a single image file in field "image"
router.post(
  "/news-cover",
  protect,
  authorizeRoles("admin", "staff"),
  uploadNewsCover.single("image"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided." });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const imageUrl = `${baseUrl}/uploads/news/${req.file.filename}`;

    return res.status(201).json({ imageUrl });
  },
);

// DELETE /api/upload/news-cover/:filename
// Admin only — removes a previously uploaded file
router.delete(
  "/news-cover/:filename",
  protect,
  authorizeRoles("admin", "staff"),
  (req, res) => {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(NEWS_UPLOADS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found." });
    }

    fs.unlink(filePath, (err) => {
      if (err)
        return res.status(500).json({ message: "Failed to delete file." });
      return res.json({ message: "File deleted." });
    });
  },
);

module.exports = router;
