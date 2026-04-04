import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import orderService from "../services/orderService";
import { formatCurrency, formatDate, formatOrderStatus } from "../utils/format";

function PreorderLookupPage() {
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    const fetchOrders = async () => {
      if (!isAuthenticated) {
        setOrders([]);
        return;
      }

      setLoading(true);
      setError("");
      setMessage({ type: "", text: "" });

      try {
        const data = await orderService.getMyOrders();
        setOrders(data);
      } catch (_requestError) {
        setError("Không thể tải danh sách đơn hàng lúc này.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [isAuthenticated]);

  const filteredOrders = useMemo(() => {
    const normalized = query.trim();

    if (!normalized) {
      return orders;
    }

    return orders.filter((order) =>
      String(order.order_id).includes(normalized),
    );
  }, [orders, query]);

  return (
    <div className="page-stack">
      <section className="section-header-row">
        <div>
          <p className="eyebrow">Thông tin tiện ích</p>
          <h1>Tra cứu đơn hàng</h1>
        </div>
        <p>Xem toàn bộ đơn hàng và trạng thái của tài khoản.</p>
      </section>

      {!isAuthenticated && (
        <section className="content-panel">
          <p>
            Vui lòng <Link to="/login">đăng nhập</Link> để xem lịch sử đơn hàng.
          </p>
        </section>
      )}

      {isAuthenticated && (
        <>
          <section className="content-panel">
            <label htmlFor="order-query">
              Mã đơn hàng
              <input
                id="order-query"
                type="text"
                placeholder="Ví dụ: 1024"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          </section>

          <section className="content-panel">
            <h2>Danh sách đơn hàng</h2>
            {message.text && (
              <div
                className={
                  message.type === "error" ? "error-banner" : "success-banner"
                }
              >
                {message.text}
              </div>
            )}
            {loading && <p>Đang tải danh sách đơn hàng...</p>}
            {!loading && error && <p>{error}</p>}
            {!loading && !error && !filteredOrders.length && (
              <p>Không tìm thấy đơn hàng phù hợp.</p>
            )}

            {!loading && !error && !!filteredOrders.length && (
              <div className="order-history-grid">
                {filteredOrders.map((order) => (
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

                    {order.status === "completed" && !!order.items?.length && (
                      <div className="order-items-inline">
                        {order.items.map((item) => (
                          <div key={item.order_item_id}>
                            <span>{item.product_name}</span>
                            <small>
                              x{item.quantity} - {formatCurrency(item.price)}
                            </small>
                            <Link
                              to={`/products/${item.product_id}#reviews`}
                              className="ghost-button link-button compact-button"
                            >
                              Đánh giá
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default PreorderLookupPage;
