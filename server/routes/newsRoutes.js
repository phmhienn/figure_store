const express = require("express");

const newsController = require("../controllers/newsController");
const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");
const { validateNewsPayload } = require("../middlewares/validationMiddleware");

const router = express.Router();

// Admin
router.get(
  "/admin",
  protect,
  authorizeRoles("admin", "staff"),
  newsController.getAdminPosts,
);
router.post(
  "/",
  protect,
  authorizeRoles("admin", "staff"),
  validateNewsPayload,
  newsController.createPost,
);
router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "staff"),
  validateNewsPayload,
  newsController.updatePost,
);
router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "staff"),
  newsController.deletePost,
);

// Public
router.get("/", newsController.getPublishedPosts);
router.get("/:id", newsController.getPostById);

module.exports = router;
