const productModel = require("../models/productModel");
const reviewModel = require("../models/reviewModel");

const parseRating = (value) => {
  const rating = Number(value);
  if (!Number.isFinite(rating)) return null;
  return Math.max(1, Math.min(5, Math.round(rating)));
};

const getReviewsByProduct = async (req, res, next) => {
  try {
    const productId = Number(req.params.productId);
    if (!productId) {
      return res.status(400).json({ message: "Product ID không hợp lệ." });
    }

    const [stats, reviews] = await Promise.all([
      reviewModel.getStatsByProduct(productId),
      reviewModel.findByProduct(productId),
    ]);

    return res.json({
      stats: {
        total_reviews: Number(stats.total_reviews || 0),
        avg_rating: Number(stats.avg_rating || 0),
      },
      reviews,
    });
  } catch (error) {
    return next(error);
  }
};

const getReviewEligibility = async (req, res, next) => {
  try {
    const productId = Number(req.params.productId);
    if (!productId) {
      return res.status(400).json({ message: "Product ID không hợp lệ." });
    }

    const hasCompleted = await reviewModel.hasCompletedOrder(
      req.user.userId,
      productId,
    );
    if (!hasCompleted) {
      return res.json({
        canReview: false,
        reason: "not_completed",
        message: "Bạn cần hoàn tất đơn hàng để đánh giá.",
      });
    }

    const existing = await reviewModel.findByUserAndProduct(
      req.user.userId,
      productId,
    );
    if (existing) {
      return res.json({
        canReview: false,
        reason: "already_reviewed",
        message: "Bạn đã đánh giá sản phẩm này.",
      });
    }

    return res.json({ canReview: true });
  } catch (error) {
    return next(error);
  }
};

const createReview = async (req, res, next) => {
  try {
    const productId = Number(req.body.product_id);
    const rating = parseRating(req.body.rating);
    const comment = String(req.body.comment || "").trim();

    if (!productId) {
      return res.status(400).json({ message: "Product ID không hợp lệ." });
    }

    if (!rating) {
      return res.status(400).json({ message: "Điểm đánh giá không hợp lệ." });
    }

    if (!comment) {
      return res
        .status(400)
        .json({ message: "Nội dung đánh giá là bắt buộc." });
    }

    const product = await productModel.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm." });
    }

    const hasCompleted = await reviewModel.hasCompletedOrder(
      req.user.userId,
      productId,
    );

    if (!hasCompleted) {
      return res.status(403).json({
        message: "Bạn cần hoàn tất đơn hàng để đánh giá sản phẩm này.",
      });
    }

    const existing = await reviewModel.findByUserAndProduct(
      req.user.userId,
      productId,
    );
    if (existing) {
      return res.status(409).json({
        message: "Bạn đã đánh giá sản phẩm này rồi.",
      });
    }

    await reviewModel.create({
      userId: req.user.userId,
      productId,
      rating,
      comment,
    });

    const [stats, reviews] = await Promise.all([
      reviewModel.getStatsByProduct(productId),
      reviewModel.findByProduct(productId),
    ]);

    return res.status(201).json({
      message: "Đã gửi đánh giá.",
      stats: {
        total_reviews: Number(stats.total_reviews || 0),
        avg_rating: Number(stats.avg_rating || 0),
      },
      reviews,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getReviewsByProduct,
  getReviewEligibility,
  createReview,
};
