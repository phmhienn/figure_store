const crypto = require("crypto");

const preorderModel = require("../models/preorderModel");
const preorderPaymentModel = require("../models/preorderPaymentModel");
const productModel = require("../models/productModel");
const userModel = require("../models/userModel");
const {
  createPaymentUrl,
  verifyIpnSignature,
} = require("../services/momoService");
const { sendPreorderCodeEmail } = require("../services/emailService");
const {
  validatePhone,
  validateEmail,
} = require("../middlewares/validationMiddleware");

const DEPOSIT_RATIO = 0.2;

const generateCode = () => {
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `PO-${random}`;
};

const generateUniqueCode = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateCode();
    // eslint-disable-next-line no-await-in-loop
    const existing = await preorderModel.findByCode(code);
    if (!existing) {
      return code;
    }
  }

  throw new Error("Không thể tạo mã tra cứu. Vui lòng thử lại sau.");
};

const createPreorder = async (req, res, next) => {
  try {
    const productId = Number(req.body.product_id);
    const quantity = Math.max(1, Number(req.body.quantity || 1));

    if (!productId || !Number.isFinite(productId)) {
      return res.status(400).json({ message: "Sản phẩm không hợp lệ." });
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({ message: "Số lượng không hợp lệ." });
    }

    const user = await userModel.findById(req.user.userId);
    if (!user) {
      return res.status(401).json({ message: "Người dùng không hợp lệ." });
    }

    const product = await productModel.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm." });
    }

    const contactEmail = String(user.email || "").trim();
    const rawPhone = String(req.body.phone || user.phone || "").trim();

    if (!contactEmail || !validateEmail(contactEmail)) {
      return res.status(400).json({
        message: "Email người dùng không hợp lệ. Vui lòng cập nhật hồ sơ.",
      });
    }

    if (!rawPhone || !validatePhone(rawPhone)) {
      return res.status(400).json({
        message: "Số điện thoại không hợp lệ. Vui lòng cập nhật hồ sơ.",
      });
    }

    const priceAtOrder = Number(product.price);
    const totalAmount = priceAtOrder * quantity;
    const depositAmount = Math.round(totalAmount * DEPOSIT_RATIO);

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return res.status(400).json({ message: "Giá sản phẩm không hợp lệ." });
    }

    const code = await generateUniqueCode();

    const preorder = await preorderModel.create({
      userId: user.user_id,
      productId,
      quantity,
      priceAtOrder,
      depositRatio: DEPOSIT_RATIO,
      depositAmount,
      code,
      contactEmail,
      contactPhone: rawPhone,
    });

    const gatewayTxnRef = `MO${preorder.preorder_id}-${Date.now()}`;
    let payUrl;
    let paymentResponse;

    try {
      paymentResponse = await createPaymentUrl({
        amount: depositAmount,
        orderId: gatewayTxnRef,
        orderInfo: code,
        requestId: gatewayTxnRef,
        extraData: {
          preorderId: preorder.preorder_id,
          preorderCode: code,
        },
      });
      payUrl = paymentResponse.payUrl;

      if (process.env.MOMO_DEBUG === "true") {
        console.log("[MoMo] payUrl:", payUrl);
      }
    } catch (paymentError) {
      await preorderModel.updateStatus(preorder.preorder_id, "payment_failed");
      return res.status(400).json({
        message: paymentError.message || "Không thể tạo thanh toán MoMo.",
      });
    }

    if (!payUrl) {
      await preorderModel.updateStatus(preorder.preorder_id, "payment_failed");
      return res.status(400).json({
        message: "Không thể tạo thanh toán MoMo.",
      });
    }

    await preorderPaymentModel.create({
      preorderId: preorder.preorder_id,
      method: "momo",
      status: "pending",
      amount: depositAmount,
      gatewayTxnRef,
      payUrl,
      responseRaw: JSON.stringify(paymentResponse || { payUrl }),
    });

    return res.status(201).json({
      preorder: { ...preorder, product },
      payUrl,
      depositAmount,
    });
  } catch (error) {
    return next(error);
  }
};

const lookupPreorder = async (req, res, next) => {
  try {
    const code = String(req.query.code || "")
      .trim()
      .toUpperCase();
    const phone = String(req.query.phone || "").trim();

    if (!code || !phone) {
      return res.status(400).json({ message: "Vui lòng nhập mã và SĐT." });
    }

    if (!validatePhone(phone)) {
      return res.status(400).json({ message: "Số điện thoại không hợp lệ." });
    }

    const preorder = await preorderModel.findByCodeAndPhone(code, phone);
    if (!preorder) {
      return res.status(404).json({ message: "Không tìm thấy đơn preorder." });
    }

    const product = await productModel.findById(preorder.product_id);

    return res.json({
      ...preorder,
      product,
    });
  } catch (error) {
    return next(error);
  }
};

const getMyPreorders = async (req, res, next) => {
  try {
    const preorders = await preorderModel.findByUserId(req.user.userId);

    const hydrated = await Promise.all(
      preorders.map(async (preorder) => {
        const product = await productModel.findById(preorder.product_id);
        return { ...preorder, product };
      }),
    );

    return res.json(hydrated);
  } catch (error) {
    return next(error);
  }
};

const getAllPreorders = async (_req, res, next) => {
  try {
    const preorders = await preorderModel.findAll();
    const hydrated = await Promise.all(
      preorders.map(async (preorder) => {
        const product = await productModel.findById(preorder.product_id);
        const user = await userModel.findById(preorder.user_id);
        const safeUser = user
          ? {
              user_id: user.user_id,
              username: user.username,
              email: user.email,
              full_name: user.full_name,
              phone: user.phone,
              role: user.role,
            }
          : null;
        return { ...preorder, product, user: safeUser };
      }),
    );

    return res.json(hydrated);
  } catch (error) {
    return next(error);
  }
};

const updatePreorderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowedStatuses = [
      "requested",
      "deposited",
      "in_transit",
      "ready_to_pay",
      "completed",
      "cancelled",
      "payment_failed",
    ];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message:
          "Invalid status. Use requested, deposited, in_transit, ready_to_pay, completed, cancelled, or payment_failed.",
      });
    }

    const preorderId = Number(req.params.id);
    const updated = await preorderModel.updateStatus(preorderId, status);

    if (!updated) {
      return res.status(404).json({ message: "Preorder not found." });
    }

    return res.json({ message: "Preorder status updated.", status });
  } catch (error) {
    return next(error);
  }
};

const handleMomoIpn = async (req, res, next) => {
  try {
    const payload = req.body || {};

    if (!verifyIpnSignature(payload)) {
      return res.status(401).json({ message: "Invalid signature" });
    }

    const payment = await preorderPaymentModel.findByGatewayTxnRef(
      payload.orderId,
    );

    if (!payment) {
      return res.status(404).json({ message: "Order not found" });
    }

    const responseRaw = JSON.stringify(payload);
    const isSuccess = Number(payload.resultCode) === 0;

    if (isSuccess) {
      await preorderPaymentModel.markPaid({
        paymentId: payment.payment_id,
        transactionNo: payload.transId,
        responseCode: String(payload.resultCode),
        responseRaw,
      });

      const didUpdate = await preorderModel.markDeposited(payment.preorder_id);

      if (didUpdate) {
        const preorder = await preorderModel.findById(payment.preorder_id);

        const product = preorder
          ? await productModel.findById(preorder.product_id)
          : null;

        if (preorder?.contact_email) {
          try {
            await sendPreorderCodeEmail({
              to: preorder.contact_email,
              code: preorder.code,
              productName: product?.name || "",
              depositAmount: preorder.deposit_amount,
            });
          } catch (emailError) {
            console.warn("Failed to send preorder email", emailError);
          }
        }
      }
    } else {
      await preorderPaymentModel.markFailed({
        paymentId: payment.payment_id,
        responseRaw,
      });
      await preorderModel.updateStatus(payment.preorder_id, "payment_failed");
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createPreorder,
  lookupPreorder,
  getMyPreorders,
  getAllPreorders,
  updatePreorderStatus,
  handleMomoIpn,
};
