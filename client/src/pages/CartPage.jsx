import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import CartItem from "../components/CartItem";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import orderService from "../services/orderService";
import productService from "../services/productService";
import { formatCurrency, formatDate, formatOrderStatus } from "../utils/format";

const defaultShippingForm = {
  recipient_name: "",
  phone: "",
  shipping_address: "",
};

function CartPage() {
  const { items, cartSubtotal, updateQuantity, removeFromCart, clearCart } =
    useCart();
  const { user, isAuthenticated } = useAuth();
  const [shippingForm, setShippingForm] = useState(defaultShippingForm);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (user) {
      setShippingForm((currentForm) => ({
        ...currentForm,
        recipient_name:
          currentForm.recipient_name || user.full_name || user.username || "",
        phone: currentForm.phone || user.phone || "",
      }));
    }
  }, [user]);

  // Validate stock quantities against live API data
  useEffect(() => {
    if (!items.length) return;
    const validate = async () => {
      try {
        const ids = items.map((i) => i.product_id);
        const staleItems = [];
        await Promise.all(
          ids.map(async (id) => {
            const product = await productService.getById(id).catch(() => null);
            if (!product) {
              removeFromCart(id);
              staleItems.push("Một sản phẩm đã bị xóa khỏi cửa hàng.");
              return;
            }
            const inCart = items.find((i) => i.product_id === id);
            if (inCart && inCart.quantity > product.stock_quantity) {
              updateQuantity(id, product.stock_quantity);
              staleItems.push(
                `"${product.name}" chỉ còn ${product.stock_quantity} sản phẩm — số lượng đã được điều chỉnh.`,
              );
            }
          }),
        );
        if (staleItems.length) {
          setMessage({ type: "error", text: staleItems.join(" ") });
        }
      } catch (_err) {
        /* silent fail — server will validate on checkout */
      }
    };
    validate();
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!isAuthenticated) {
        setOrders([]);
        return;
      }

      setLoadingOrders(true);

      try {
        const data = await orderService.getMyOrders();
        setOrders(data);
      } catch (_error) {
        setMessage({
          type: "error",
          text: "Không thể tải lịch sử đơn hàng lúc này.",
        });
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchOrders();
  }, [isAuthenticated]);

  const handleCheckout = async (event) => {
    event.preventDefault();
    setMessage({ type: "", text: "" });

    if (!isAuthenticated) {
      setMessage({
        type: "error",
        text: "Vui lòng đăng nhập trước khi đặt hàng.",
      });
      return;
    }

    if (!items.length) {
      setMessage({ type: "error", text: "Giỏ hàng của bạn đang trống." });
      return;
    }

    try {
      setSubmitting(true);
      await orderService.createOrder({
        ...shippingForm,
        items: items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
        })),
      });

      clearCart();
      setShippingForm((currentForm) => ({
        ...currentForm,
        shipping_address: "",
      }));
      setMessage({ type: "success", text: "Đặt hàng thành công." });
      const refreshedOrders = await orderService.getMyOrders();
      setOrders(refreshedOrders);
    } catch (requestError) {
      setMessage({
        type: "error",
        text: requestError.response?.data?.message || "Tạo đơn hàng thất bại.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Bạn có chắc muốn hủy đơn hàng này?")) return;

    setMessage({ type: "", text: "" });
    setCancellingId(orderId);

    try {
      await orderService.cancelOrder(orderId);
      setOrders((current) =>
        current.map((order) =>
          order.order_id === orderId
            ? { ...order, status: "cancelled" }
            : order,
        ),
      );
      setMessage({ type: "success", text: "Đã hủy đơn hàng." });
    } catch (requestError) {
      setMessage({
        type: "error",
        text: requestError.response?.data?.message || "Không thể hủy đơn hàng.",
      });
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="page-stack">
      <section className="section-header-row">
        <div>
          <p className="eyebrow">Giỏ hàng & thanh toán</p>
          <h1>Đơn nháp sưu tầm của bạn</h1>
        </div>
        {!isAuthenticated && (
          <p>
            Cần đăng nhập để hoàn tất đơn hàng.{" "}
            <Link to="/login">Đến trang đăng nhập</Link>
          </p>
        )}
      </section>

      {message.text && (
        <section
          className={`content-panel ${message.type === "error" ? "error-panel" : "success-panel"}`}
        >
          {message.text}
        </section>
      )}

      <div className="cart-layout">
        <section className="content-panel">
          <h2>Sản phẩm trong giỏ</h2>

          {items.length ? (
            <div className="cart-list">
              {items.map((item) => (
                <CartItem
                  key={item.product_id}
                  item={item}
                  onQuantityChange={updateQuantity}
                  onRemove={removeFromCart}
                />
              ))}
            </div>
          ) : (
            <p>Giỏ hàng đang trống. Hãy quay lại trang chủ để thêm sản phẩm.</p>
          )}
        </section>

        <section className="content-panel sticky-panel">
          <h2>Thông tin nhận hàng</h2>
          <form className="stacked-form" onSubmit={handleCheckout}>
            <label>
              Tên người nhận
              <input
                type="text"
                value={shippingForm.recipient_name}
                onChange={(event) =>
                  setShippingForm((currentForm) => ({
                    ...currentForm,
                    recipient_name: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label>
              Số điện thoại
              <input
                type="text"
                value={shippingForm.phone}
                onChange={(event) =>
                  setShippingForm((currentForm) => ({
                    ...currentForm,
                    phone: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label>
              Địa chỉ giao hàng
              <textarea
                rows="4"
                value={shippingForm.shipping_address}
                onChange={(event) =>
                  setShippingForm((currentForm) => ({
                    ...currentForm,
                    shipping_address: event.target.value,
                  }))
                }
                required
              />
            </label>

            <div className="summary-box">
              <div>
                <span>Tạm tính</span>
                <strong>{formatCurrency(cartSubtotal)}</strong>
              </div>
              <div>
                <span>Vận chuyển</span>
                <strong>Miễn phí demo</strong>
              </div>
            </div>

            <button
              type="submit"
              className="primary-button"
              disabled={submitting || !items.length}
            >
              {submitting ? "Đang tạo đơn..." : "Đặt hàng ngay"}
            </button>
          </form>
        </section>
      </div>

      <section className="content-panel">
        <div className="section-header-row compact-row">
          <div>
            <p className="eyebrow">Lịch sử đơn hàng</p>
            <h2>Đơn gần đây của bạn</h2>
          </div>
        </div>

        {loadingOrders && <p>Đang tải lịch sử đơn hàng...</p>}
        {!loadingOrders && !orders.length && <p>Bạn chưa có đơn hàng nào.</p>}

        <div className="order-history-grid">
          {orders.map((order) => (
            <article key={order.order_id} className="order-card">
              <div className="order-card-header">
                <div>
                  <strong>Đơn #{order.order_id}</strong>
                  <p>{formatDate(order.created_at)}</p>
                </div>
                <span className={`status-chip ${order.status}`}>
                  {formatOrderStatus(order.status)}
                </span>
              </div>

              <p>{order.shipping_address}</p>
              <strong>{formatCurrency(order.total_amount)}</strong>

              {order.status === "pending" ? (
                <button
                  type="button"
                  className="danger-button compact-button"
                  onClick={() => handleCancelOrder(order.order_id)}
                  disabled={cancellingId === order.order_id}
                >
                  {cancellingId === order.order_id ? "Đang hủy..." : "Hủy đơn"}
                </button>
              ) : order.status !== "cancelled" ? (
                <p className="order-cancel-note">
                  Đơn đã được xác nhận. Vui lòng liên hệ hotline 0396686826 để
                  hỗ trợ.
                </p>
              ) : null}

              <div className="order-items-inline">
                {order.items.map((item) => (
                  <div key={item.order_item_id}>
                    <span>{item.product_name}</span>
                    <small>
                      x{item.quantity} - {formatCurrency(item.price)}
                    </small>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default CartPage;
