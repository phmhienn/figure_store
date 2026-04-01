const express = require("express");

const productController = require("../controllers/productController");
const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");
const {
  validateProductPayload,
} = require("../middlewares/validationMiddleware");

const router = express.Router();

router.get("/", productController.getAllProducts);
router.get("/:id", productController.getProductById);
router.post(
  "/",
  protect,
  authorizeRoles("admin"),
  validateProductPayload,
  productController.createProduct,
);
router.put(
  "/:id",
  protect,
  authorizeRoles("admin"),
  validateProductPayload,
  productController.updateProduct,
);
router.delete(
  "/:id",
  protect,
  authorizeRoles("admin"),
  productController.deleteProduct,
);

module.exports = router;
