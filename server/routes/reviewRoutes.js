const express = require("express");

const reviewController = require("../controllers/reviewController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/product/:productId", reviewController.getReviewsByProduct);
router.get(
  "/eligibility/:productId",
  protect,
  reviewController.getReviewEligibility,
);
router.post("/", protect, reviewController.createReview);

module.exports = router;
