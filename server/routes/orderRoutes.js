const express = require("express");

const orderController = require("../controllers/orderController");
const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

const router = express.Router();

router.post("/", protect, orderController.createOrder);
// Admin: get all orders
router.get(
  "/admin",
  protect,
  authorizeRoles("admin", "staff"),
  orderController.getAllOrders,
);
// Admin: update order status
router.put(
  "/:id/status",
  protect,
  authorizeRoles("admin", "staff"),
  orderController.updateOrderStatus,
);
// Customer: cancel order (only if pending)
router.put("/:id/cancel", protect, orderController.cancelMyOrder);
// Get current user's orders
router.get("/my-orders", protect, orderController.getOrdersByUser);
// Get any user's orders (admin only)
router.get(
  "/user/:userId",
  protect,
  authorizeRoles("admin"),
  orderController.getOrdersByUser,
);

module.exports = router;
