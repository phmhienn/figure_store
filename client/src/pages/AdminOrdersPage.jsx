import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import orderService from "../services/orderService";
import { useAuth } from "../context/AuthContext";
import { formatCurrency, formatDate, formatOrderStatus } from "../utils/format";

function AdminOrdersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [updatingId, setUpdatingId] = useState(null);
  const [statusDrafts, setStatusDrafts] = useState({});

  const statusOptions = [
    { value: "pending", label: "Chờ xác nhận" },
    { value: "confirmed", label: "Đã xác nhận" },
    { value: "shipping", label: "Đang giao" },
    { value: "completed", label: "Giao thành công" },
    { value: "cancelled", label: "Đã hủy" },
  ];

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await orderService.getAllOrders();
        setOrders(data);
      } catch (_error) {
        setError("Không thể tải danh sách đơn hàng.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  useEffect(() => {
    const nextDrafts = {};
    orders.forEach((order) => {
      nextDrafts[order.order_id] = order.status;
    });
    setStatusDrafts(nextDrafts);
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) return orders;

    return orders.filter((order) => {
      const idMatch = String(order.order_id).includes(normalized);
      const userMatch = String(order.username || "")
        .toLowerCase()
        .includes(normalized);
      const emailMatch = String(order.email || "")
        .toLowerCase()
        .includes(normalized);
      return idMatch || userMatch || emailMatch;
    });
  }, [orders, query]);

  const handleStatusChange = (orderId, value) => {
    setStatusDrafts((current) => ({ ...current, [orderId]: value }));
  };

  const handleStatusSave = async (orderId) => {
    const nextStatus = statusDrafts[orderId];
    const currentOrder = orders.find((order) => order.order_id === orderId);

    if (!nextStatus || nextStatus === currentOrder?.status) {
      return;
    }

    setUpdatingId(orderId);
    setMessage({ type: "", text: "" });

    try {
      await orderService.updateStatus(orderId, nextStatus);
      setOrders((current) =>
        current.map((order) =>
          order.order_id === orderId ? { ...order, status: nextStatus } : order,
        ),
      );
      setMessage({ type: "success", text: "Đã cập nhật trạng thái đơn." });
    } catch (_error) {
      setMessage({ type: "error", text: "Không thể cập nhật trạng thái đơn." });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="admin-layout">
      <section className="section-header-row">
        <div>
          <p className="eyebrow">Khu vực quản trị</p>
          <h1>Đơn hàng khách hàng</h1>
        </div>
        <div className="admin-header-actions">
          <Link to="/admin" className="ghost-button">
            Bảng điều khiển
          </Link>
          <Link to="/admin/preorders" className="ghost-button">
            Preorder
          </Link>
          {isAdmin && (
            <Link to="/admin/products" className="ghost-button">
              Quản trị sản phẩm
            </Link>
          )}
          <Link to="/admin/news" className="ghost-button">
            Quản trị tin tức
          </Link>
        </div>
      </section>

      <section className="content-panel">
        <label htmlFor="order-search">
          Tìm theo mã đơn / tài khoản / email
          <input
            id="order-search"
            type="text"
            placeholder="Ví dụ: 1024, username, email..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </section>

      <section className="content-panel">
        <h2>Danh sách đơn ({filteredOrders.length})</h2>
        {message.text && (
          <div
            className={
              message.type === "error" ? "error-banner" : "success-banner"
            }
          >
            {message.text}
          </div>
        )}
        {loading && <p>Đang tải đơn hàng...</p>}
        {!loading && error && <p>{error}</p>}
        {!loading && !error && !filteredOrders.length && (
          <p>Chưa có đơn hàng nào phù hợp.</p>
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

                <p>
                  {order.username || "Khách"} · {order.email || "Chưa có email"}
                </p>
                <p>
                  {order.recipient_name || "Chưa có người nhận"} · SĐT:{" "}
                  {order.address_phone || "Chưa có số điện thoại"}
                </p>
                <p>{order.shipping_address || "Chưa có địa chỉ"}</p>
                <strong>{formatCurrency(order.total_amount)}</strong>

                <div className="order-status-row">
                  <label className="order-status-label">
                    Trạng thái
                    <select
                      value={statusDrafts[order.order_id] || order.status}
                      onChange={(event) =>
                        handleStatusChange(order.order_id, event.target.value)
                      }
                      disabled={updatingId === order.order_id}
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="primary-button compact-button"
                    onClick={() => handleStatusSave(order.order_id)}
                    disabled={
                      updatingId === order.order_id ||
                      statusDrafts[order.order_id] === order.status
                    }
                  >
                    {updatingId === order.order_id ? "Đang lưu..." : "Cập nhật"}
                  </button>
                </div>

                {!!order.items?.length && (
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
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminOrdersPage;
