const orderModel = require("../models/orderModel");

const createOrder = async (req, res, next) => {
  try {
    const { recipient_name, phone, shipping_address, items } = req.body;

    if (
      !recipient_name ||
      !phone ||
      !shipping_address ||
      !Array.isArray(items) ||
      !items.length
    ) {
      return res.status(400).json({
        message:
          "Recipient, phone, shipping address and at least one item are required.",
      });
    }

    const order = await orderModel.createWithItems({
      userId: req.user.userId,
      recipient_name,
      phone,
      shipping_address,
      items,
    });

    return res.status(201).json(order);
  } catch (error) {
    if (error.message) {
      return res.status(400).json({ message: error.message });
    }

    return next(error);
  }
};

const getOrdersByUser = async (req, res, next) => {
  try {
    // If :userId is provided, admin can fetch other users' orders
    // Otherwise, fetch current user's orders
    const targetUserId = req.params.userId
      ? Number(req.params.userId)
      : req.user.userId;

    const orders = await orderModel.findOrdersByUser(targetUserId);
    return res.json(orders);
  } catch (error) {
    return next(error);
  }
};

const getAllOrders = async (_req, res, next) => {
  try {
    const orders = await orderModel.findAllWithItems();
    return res.json(orders);
  } catch (error) {
    return next(error);
  }
};

const cancelMyOrder = async (req, res, next) => {
  try {
    const orderId = Number(req.params.id);
    const order = await orderModel.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    if (order.user_id !== req.user.userId) {
      return res.status(403).json({ message: "Forbidden." });
    }

    if (order.status === "cancelled") {
      return res.status(400).json({ message: "Order is already cancelled." });
    }

    if (order.status !== "pending") {
      return res.status(400).json({
        message:
          "Đơn đã được xác nhận. Vui lòng liên hệ hotline 0396686826 để hỗ trợ.",
      });
    }

    await orderModel.updateStatus(orderId, "cancelled");
    return res.json({ message: "Order cancelled.", status: "cancelled" });
  } catch (error) {
    return next(error);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowedStatuses = [
      "pending",
      "confirmed",
      "paid",
      "shipping",
      "completed",
      "cancelled",
    ];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message:
          "Invalid status. Use pending, confirmed, paid, shipping, completed, or cancelled.",
      });
    }

    const orderId = Number(req.params.id);
    const updated = await orderModel.updateStatus(orderId, status);

    if (!updated) {
      return res.status(404).json({ message: "Order not found." });
    }

    return res.json({ message: "Order status updated.", status });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createOrder,
  getOrdersByUser,
  getAllOrders,
  cancelMyOrder,
  updateOrderStatus,
};
