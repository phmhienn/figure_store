import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import preorderService from "../services/preorderService";
import productService from "../services/productService";
import {
  IMAGE_FALLBACK,
  formatCurrency,
  resolveImageUrl,
} from "../utils/format";

const DEPOSIT_RATIO = 0.2;

const paymentOptions = [
  {
    value: "momo",
    label: "MoMo",
    description: "Quét QR hoặc ví MoMo.",
    disabled: false,
  },
  {
    value: "bank",
    label: "Chuyển khoản",
    description: "Đang cập nhật.",
    disabled: true,
  },
];

function PreorderCheckoutPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("momo");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState({ type: "", text: "" });

  useEffect(() => {
    if (!user?.phone) return;
    setPhone((current) => current || user.phone);
  }, [user]);

  useEffect(() => {
    let isActive = true;

    const fetchProduct = async () => {
      if (!id) {
        setError("Không tìm thấy sản phẩm preorder.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const data = await productService.getById(id);
        if (!isActive) return;
        setProduct(data);
      } catch (requestError) {
        if (!isActive) return;
        setError(
          requestError.response?.data?.message ||
            "Không thể tải thông tin sản phẩm.",
        );
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchProduct();

    return () => {
      isActive = false;
    };
  }, [id]);

  const totalAmount = useMemo(() => {
    return Number(product?.price || 0) * quantity;
  }, [product?.price, quantity]);

  const depositAmount = useMemo(() => {
    return Math.round(totalAmount * DEPOSIT_RATIO);
  }, [totalAmount]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setNotice({ type: "", text: "" });

    if (!product) {
      setNotice({ type: "error", text: "Không tìm thấy sản phẩm." });
      return;
    }

    if (!phone.trim()) {
      setNotice({ type: "error", text: "Vui lòng nhập số điện thoại." });
      return;
    }

    if (paymentMethod !== "momo") {
      setNotice({ type: "error", text: "Phương thức này chưa hỗ trợ." });
      return;
    }

    try {
      setSubmitting(true);
      const data = await preorderService.create({
        product_id: product.product_id,
        quantity,
        phone,
      });

      if (!data?.payUrl) {
        setNotice({
          type: "error",
          text: "Không thể tạo link thanh toán MoMo.",
        });
        return;
      }

      setNotice({
        type: "success",
        text: "Đang chuyển đến cổng thanh toán MoMo...",
      });
      window.location.href = data.payUrl;
    } catch (requestError) {
      setNotice({
        type: "error",
        text:
          requestError.response?.data?.message || "Không thể tạo đơn preorder.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="content-panel">
        Đang tải thông tin preorder...
      </section>
    );
  }

  if (error || !product) {
    return (
      <section className="content-panel error-panel">
        {error || "Không tìm thấy sản phẩm."}
        <div style={{ marginTop: "12px" }}>
          <button
            type="button"
            className="ghost-button"
            onClick={() => navigate("/preorder")}
          >
            Quay về danh sách preorder
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="page-stack">
      <section className="section-header-row">
        <div>
          <p className="eyebrow">Thanh toán đặt cọc</p>
          <h1>Xác nhận preorder</h1>
        </div>
        <p>Hoàn tất thông tin và chọn phương thức thanh toán.</p>
      </section>

      {notice.text && (
        <section
          className={
            notice.type === "error"
              ? "content-panel error-panel"
              : "content-panel success-panel"
          }
        >
          {notice.text}
        </section>
      )}

      <div className="cart-layout">
        <section className="content-panel">
          <h2>Thông tin liên hệ</h2>
          <form className="stacked-form" onSubmit={handleSubmit}>
            <label>
              Số lượng
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(event) =>
                  setQuantity(Math.max(Number(event.target.value) || 1, 1))
                }
              />
            </label>

            <label>
              Số điện thoại
              <input
                type="text"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Nhập số điện thoại"
                required
              />
            </label>

            <label>
              Email liên hệ
              <input type="email" value={user?.email || ""} readOnly />
            </label>

            <div className="payment-method-grid">
              {paymentOptions.map((option) => (
                <label
                  key={option.value}
                  className={`payment-method-card ${
                    paymentMethod === option.value ? "active" : ""
                  } ${option.disabled ? "disabled" : ""}`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={option.value}
                    checked={paymentMethod === option.value}
                    onChange={() => setPaymentMethod(option.value)}
                    disabled={option.disabled}
                  />
                  <div>
                    <strong>{option.label}</strong>
                    <span>{option.description}</span>
                  </div>
                </label>
              ))}
            </div>

            <button
              type="submit"
              className="primary-button"
              disabled={submitting}
            >
              {submitting ? "Đang tạo thanh toán..." : "Thanh toán đặt cọc"}
            </button>

            <p style={{ margin: 0 }}>
              <Link to="/preorder" className="ghost-button link-button">
                Quay về danh sách preorder
              </Link>
            </p>
          </form>
        </section>

        <section className="content-panel sticky-panel">
          <h2>Tóm tắt đơn</h2>
          <article className="cart-item-card">
            <img
              src={resolveImageUrl(product.image_url)}
              alt={product.name}
              className="cart-item-image"
              onError={(event) => {
                event.currentTarget.src = IMAGE_FALLBACK;
                event.currentTarget.onerror = null;
              }}
            />
            <div className="cart-item-content">
              <strong>{product.name}</strong>
              <span className="stock-chip preorder">Đặt trước</span>
              <small>
                {formatCurrency(product.price)} x {quantity}
              </small>
            </div>
          </article>

          <div className="order-items-inline">
            <div className="summary-line">
              <span>Tạm tính</span>
              <strong>{formatCurrency(totalAmount)}</strong>
            </div>
            <div className="summary-line">
              <span>Đặt cọc (20%)</span>
              <strong>{formatCurrency(depositAmount)}</strong>
            </div>
          </div>

          <p style={{ marginTop: "12px", color: "var(--muted)" }}>
            Thanh toán phần còn lại khi hàng về và được thông báo từ cửa hàng.
          </p>
        </section>
      </div>
    </div>
  );
}

export default PreorderCheckoutPage;
