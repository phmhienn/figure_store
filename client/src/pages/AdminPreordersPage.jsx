import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import preorderService from "../services/preorderService";
import {
  formatCurrency,
  formatDate,
  formatPreorderStatus,
} from "../utils/format";

const statusOptions = [
  { value: "requested", label: "Chờ thanh toán cọc" },
  { value: "deposited", label: "Đã cọc" },
  { value: "in_transit", label: "Đang về" },
  { value: "ready_to_pay", label: "Hàng đã về" },
  { value: "completed", label: "Hoàn tất" },
  { value: "cancelled", label: "Đã hủy" },
  { value: "payment_failed", label: "Thanh toán lỗi" },
];

function AdminPreordersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [preorders, setPreorders] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [updatingId, setUpdatingId] = useState(null);
  const [statusDrafts, setStatusDrafts] = useState({});

  const fetchPreorders = async () => {
    try {
      const data = await preorderService.getAll();
      setPreorders(Array.isArray(data) ? data : []);
    } catch (_error) {
      setError("Không thể tải danh sách preorder.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreorders();
  }, []);

  useEffect(() => {
    const nextDrafts = {};
    preorders.forEach((preorder) => {
      nextDrafts[preorder.preorder_id] = preorder.status;
    });
    setStatusDrafts(nextDrafts);
  }, [preorders]);

  const filteredPreorders = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) return preorders;

    return preorders.filter((preorder) => {
      const idMatch = String(preorder.preorder_id || "").includes(normalized);
      const codeMatch = String(preorder.code || "")
        .toLowerCase()
        .includes(normalized);
      const productMatch = String(preorder.product?.name || "")
        .toLowerCase()
        .includes(normalized);
      const emailMatch = String(preorder.contact_email || "")
        .toLowerCase()
        .includes(normalized);
      const phoneMatch = String(preorder.contact_phone || "")
        .toLowerCase()
        .includes(normalized);
      const userMatch = String(preorder.user?.username || "")
        .toLowerCase()
        .includes(normalized);

      return (
        idMatch ||
        codeMatch ||
        productMatch ||
        emailMatch ||
        phoneMatch ||
        userMatch
      );
    });
  }, [preorders, query]);

  const handleStatusChange = (preorderId, value) => {
    setStatusDrafts((current) => ({ ...current, [preorderId]: value }));
  };

  const handleStatusSave = async (preorderId) => {
    const nextStatus = statusDrafts[preorderId];
    const currentPreorder = preorders.find(
      (preorder) => preorder.preorder_id === preorderId,
    );

    if (!nextStatus || nextStatus === currentPreorder?.status) {
      return;
    }

    setUpdatingId(preorderId);
    setMessage({ type: "", text: "" });

    try {
      await preorderService.updateStatus(preorderId, nextStatus);
      setPreorders((current) =>
        current.map((preorder) =>
          preorder.preorder_id === preorderId
            ? { ...preorder, status: nextStatus }
            : preorder,
        ),
      );
      setMessage({ type: "success", text: "Đã cập nhật trạng thái preorder." });
    } catch (_error) {
      setMessage({ type: "error", text: "Không thể cập nhật trạng thái." });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="admin-layout">
      <section className="section-header-row">
        <div>
          <p className="eyebrow">Khu vực quản trị</p>
          <h1>Đơn hàng preorder</h1>
        </div>
        <div className="admin-header-actions">
          <Link to="/admin" className="ghost-button">
            Bảng điều khiển
          </Link>
          <Link to="/admin/orders" className="ghost-button">
            Đơn hàng thường
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
        <label htmlFor="preorder-search">
          Tìm theo mã / tài khoản / sản phẩm / liên hệ
          <input
            id="preorder-search"
            type="text"
            placeholder="Ví dụ: PO-AB12CD, username, email, SĐT..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </section>

      <section className="content-panel">
        <h2>Danh sách preorder ({filteredPreorders.length})</h2>
        {message.text && (
          <div
            className={
              message.type === "error" ? "error-banner" : "success-banner"
            }
          >
            {message.text}
          </div>
        )}
        {loading && <p>Đang tải preorder...</p>}
        {!loading && error && <p>{error}</p>}
        {!loading && !error && !filteredPreorders.length && (
          <p>Chưa có preorder nào phù hợp.</p>
        )}

        {!loading && !error && !!filteredPreorders.length && (
          <div className="order-history-grid">
            {filteredPreorders.map((preorder) => (
              <article key={preorder.preorder_id} className="order-card">
                <div className="order-card-header">
                  <div>
                    <strong>Preorder #{preorder.preorder_id}</strong>
                    <p>{formatDate(preorder.created_at)}</p>
                    <small>Mã: {preorder.code}</small>
                  </div>
                  <span className={`status-chip ${preorder.status}`}>
                    {formatPreorderStatus(preorder.status)}
                  </span>
                </div>

                <p>{preorder.product?.name || "Sản phẩm preorder"}</p>
                <p>
                  {preorder.user?.username || "Khách"} ·{" "}
                  {preorder.user?.email || preorder.contact_email || "Chưa có"}
                </p>
                <p>
                  Liên hệ: {preorder.contact_phone || "Chưa có"} ·{" "}
                  {preorder.contact_email || "Chưa có"}
                </p>

                <div className="order-items-inline">
                  <div>
                    <span>Số lượng</span>
                    <small>x{preorder.quantity}</small>
                  </div>
                  <div>
                    <span>Giá tại thời điểm đặt</span>
                    <small>{formatCurrency(preorder.price_at_order)}</small>
                  </div>
                  <div>
                    <span>Đặt cọc</span>
                    <small>{formatCurrency(preorder.deposit_amount)}</small>
                  </div>
                </div>

                <div className="order-status-row">
                  <label className="order-status-label">
                    Trạng thái
                    <select
                      value={
                        statusDrafts[preorder.preorder_id] || preorder.status
                      }
                      onChange={(event) =>
                        handleStatusChange(
                          preorder.preorder_id,
                          event.target.value,
                        )
                      }
                      disabled={updatingId === preorder.preorder_id}
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
                    onClick={() => handleStatusSave(preorder.preorder_id)}
                    disabled={
                      updatingId === preorder.preorder_id ||
                      statusDrafts[preorder.preorder_id] === preorder.status
                    }
                  >
                    {updatingId === preorder.preorder_id
                      ? "Đang lưu..."
                      : "Cập nhật"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminPreordersPage;
