const express = require("express");

const reportController = require("../controllers/reportController");
const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

const router = express.Router();

router.use(protect, authorizeRoles("admin", "staff"));

router.get("/revenue", reportController.getRevenueReport);
router.get("/top-products", reportController.getTopProductsReport);
router.get("/inventory", reportController.getInventoryReport);

router.get("/revenue/export", reportController.exportRevenueReport);
router.get("/top-products/export", reportController.exportTopProductsReport);
router.get("/inventory/export", reportController.exportInventoryReport);

module.exports = router;
