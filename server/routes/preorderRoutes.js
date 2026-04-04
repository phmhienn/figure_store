const express = require("express");

const preorderController = require("../controllers/preorderController");
const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

const router = express.Router();

router.post("/", protect, preorderController.createPreorder);
router.get("/lookup", preorderController.lookupPreorder);
router.get("/vnpay/ipn", preorderController.handleVnpayIpn);

router.get(
  "/admin",
  protect,
  authorizeRoles("admin", "staff"),
  preorderController.getAllPreorders,
);

router.put(
  "/:id/status",
  protect,
  authorizeRoles("admin", "staff"),
  preorderController.updatePreorderStatus,
);

module.exports = router;
