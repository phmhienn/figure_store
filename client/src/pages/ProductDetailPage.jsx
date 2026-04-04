import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import productService from "../services/productService";
import reviewService from "../services/reviewService";
import {
  IMAGE_FALLBACK,
  formatCategory,
  formatCurrency,
  formatProductStatus,
  resolveImageUrl,
} from "../utils/format";

function ProductDetailPage() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewStats, setReviewStats] = useState({
    total_reviews: 0,
    avg_rating: 0,
  });
  const [reviews, setReviews] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [eligibility, setEligibility] = useState({
    canReview: false,
    message: "",
  });
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const data = await productService.getById(id);
        setProduct(data);
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            "Không thể tải thông tin sản phẩm.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  useEffect(() => {
    const fetchReviews = async () => {
      setReviewLoading(true);
      setReviewError("");

      try {
        const data = await reviewService.getByProduct(id);
        setReviewStats(data.stats || { total_reviews: 0, avg_rating: 0 });
        setReviews(data.reviews || []);
      } catch (_error) {
        setReviewError("Không thể tải đánh giá.");
      } finally {
        setReviewLoading(false);
      }
    };

    if (id) {
      fetchReviews();
    }
  }, [id]);

  useEffect(() => {
    const fetchEligibility = async () => {
      if (!isAuthenticated || !id) {
        setEligibility({ canReview: false, message: "" });
        return;
      }

      try {
        const data = await reviewService.getEligibility(id);
        setEligibility(data || { canReview: false, message: "" });
      } catch (_error) {
        setEligibility({ canReview: false, message: "" });
      }
    };

    fetchEligibility();
  }, [id, isAuthenticated]);

  const averageStars = useMemo(() => {
    return Math.round(Number(reviewStats.avg_rating || 0) * 10) / 10;
  }, [reviewStats.avg_rating]);

  const handleSubmitReview = async (event) => {
    event.preventDefault();

    if (!comment.trim()) {
      setReviewError("Vui lòng nhập nội dung đánh giá.");
      return;
    }

    setSubmittingReview(true);
    setReviewError("");

    try {
      const data = await reviewService.create({
        product_id: Number(id),
        rating,
        comment,
      });

      setComment("");
      setRating(5);
      setReviewStats(data.stats || reviewStats);
      setReviews(data.reviews || reviews);
      setEligibility({
        canReview: false,
        message: "Bạn đã đánh giá sản phẩm này.",
      });
    } catch (requestError) {
      setReviewError(
        requestError.response?.data?.message || "Không thể gửi đánh giá.",
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <section className="content-panel">Đang tải chi tiết sản phẩm...</section>
    );
  }

  if (error || !product) {
    return (
      <section className="content-panel error-panel">
        {error || "Không tìm thấy sản phẩm."}
      </section>
    );
  }

  return (
    <div className="page-stack">
      <section className="detail-layout content-panel">
        <div className="detail-image-shell">
          <img
            src={resolveImageUrl(product.image_url)}
            alt={product.name}
            className="detail-image"
            onError={(e) => {
              e.currentTarget.src = IMAGE_FALLBACK;
              e.currentTarget.onerror = null;
            }}
          />
        </div>

        <div className="detail-content">
          <p className="eyebrow">{formatCategory(product.category)}</p>
          <h1>{product.name}</h1>
          <p className="detail-series">
            {product.series || "Series đang cập nhật"} ·{" "}
            {product.brand || "Thương hiệu đang cập nhật"}
          </p>
          <p className="detail-price">{formatCurrency(product.price)}</p>
          <p className="detail-description">
            {product.description ||
              "Thông tin chi tiết về sản phẩm đang được cập nhật thêm."}
          </p>

          <dl className="detail-specs">
            <div>
              <dt>Trạng thái</dt>
              <dd>{formatProductStatus(product.status)}</dd>
            </div>
            <div>
              <dt>Tồn kho</dt>
              <dd>{product.stock_quantity}</dd>
            </div>
            <div>
              <dt>Lượt xem</dt>
              <dd>{Number(product.view_count || 0)}</dd>
            </div>
            <div>
              <dt>Mã slug</dt>
              <dd>{product.slug}</dd>
            </div>
          </dl>

          <div className="detail-purchase-row">
            <label>
              Số lượng
              <input
                type="number"
                min="1"
                max={Math.max(product.stock_quantity, 1)}
                value={quantity}
                onChange={(event) =>
                  setQuantity(Math.max(Number(event.target.value) || 1, 1))
                }
              />
            </label>

            <button
              type="button"
              className="primary-button"
              onClick={() => addToCart(product, quantity)}
              disabled={product.stock_quantity <= 0}
            >
              {product.stock_quantity > 0
                ? "Thêm vào giỏ hàng"
                : "Tạm hết hàng"}
            </button>
          </div>
        </div>
      </section>

      <section className="content-panel review-panel" id="reviews">
        <div className="review-header">
          <div>
            <p className="eyebrow">Đánh giá</p>
            <h2>Đánh giá sản phẩm</h2>
          </div>
          <div className="review-summary">
            <strong>{averageStars}/5</strong>
            <span>{reviewStats.total_reviews} đánh giá</span>
          </div>
        </div>

        {reviewLoading && <p>Đang tải đánh giá...</p>}
        {!reviewLoading && reviewError && (
          <p className="form-error">{reviewError}</p>
        )}

        {!reviewLoading && isAuthenticated && eligibility.canReview && (
          <form className="review-form" onSubmit={handleSubmitReview}>
            <label>
              Điểm đánh giá
              <select
                value={rating}
                onChange={(event) => setRating(Number(event.target.value))}
              >
                <option value={5}>5 sao</option>
                <option value={4}>4 sao</option>
                <option value={3}>3 sao</option>
                <option value={2}>2 sao</option>
                <option value={1}>1 sao</option>
              </select>
            </label>
            <label>
              Nội dung đánh giá
              <textarea
                rows={4}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Chia sẻ trải nghiệm của bạn..."
                required
              />
            </label>
            <button
              type="submit"
              className="primary-button"
              disabled={submittingReview}
            >
              {submittingReview ? "Đang gửi..." : "Gửi đánh giá"}
            </button>
          </form>
        )}

        {!reviewLoading &&
          isAuthenticated &&
          !eligibility.canReview &&
          eligibility.message && (
            <p className="input-hint">{eligibility.message}</p>
          )}

        {!reviewLoading && !isAuthenticated && (
          <p className="input-hint">
            Đăng nhập để gửi đánh giá sau khi hoàn tất đơn hàng.
          </p>
        )}

        {!reviewLoading && !reviews.length && (
          <p>Chưa có đánh giá nào cho sản phẩm này.</p>
        )}

        {!!reviews.length && (
          <div className="review-list">
            {reviews.map((review) => (
              <article key={review.review_id} className="review-item">
                <div className="review-meta">
                  <strong>
                    {review.full_name || review.username || "Khách hàng"}
                  </strong>
                  <span className="review-stars">
                    {"★".repeat(review.rating)}
                    {"☆".repeat(Math.max(0, 5 - review.rating))}
                  </span>
                </div>
                <p className="review-date">
                  {new Date(review.created_at).toLocaleDateString("vi-VN")}
                </p>
                <p>{review.comment}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default ProductDetailPage;
