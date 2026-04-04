import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import orderService from "../services/orderService";
import preorderService from "../services/preorderService";
import {
  formatCurrency,
  formatDate,
  formatOrderStatus,
  formatPreorderStatus,
} from "../utils/format";

function PreorderLookupPage() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState([]);
  const [preorders, setPreorders] = useState([]);
  const [query, setQuery] = useState("");
  const [preorderQuery, setPreorderQuery] = useState("");
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingPreorders, setLoadingPreorders] = useState(false);
  const [error, setError] = useState("");
  const [preorderError, setPreorderError] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const resultCode = params.get("resultCode");
    const paymentMessage = params.get("message");

    if (!resultCode) {
      return;
    }

    const isSuccess = Number(resultCode) === 0;
    setMessage({
      type: isSuccess ? "success" : "error",
      text: isSuccess
        ? "Thanh toán cọc qua MoMo thành công."
        : paymentMessage || "Thanh toán qua MoMo không thành công.",
    });
  }, [location.search]);

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated) {
        setOrders([]);
        setPreorders([]);
        return;
      }

      setLoadingOrders(true);
      setLoadingPreorders(true);
      setError("");
      setPreorderError("");

      const [ordersResult, preordersResult] = await Promise.allSettled([
        orderService.getMyOrders(),
        preorderService.getMine(),
      ]);

      if (ordersResult.status === "fulfilled") {
        setOrders(Array.isArray(ordersResult.value) ? ordersResult.value : []);
      } else {
        setError("Không thể tải danh sách đơn hàng lúc này.");
      }

      if (preordersResult.status === "fulfilled") {
        setPreorders(
          Array.isArray(preordersResult.value) ? preordersResult.value : [],
        );
      } else {
        setPreorderError("Không thể tải danh sách preorder lúc này.");
      }

      setLoadingOrders(false);
      setLoadingPreorders(false);
    };

    fetchData();
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

  const filteredPreorders = useMemo(() => {
    const normalized = preorderQuery.trim().toLowerCase();

    if (!normalized) {
      return preorders;
    }

    return preorders.filter((preorder) => {
      const code = String(preorder.code || "").toLowerCase();
      const id = String(preorder.preorder_id || "");
      const productName = String(preorder.product?.name || "").toLowerCase();
      return (
        code.includes(normalized) ||
        id.includes(normalized) ||
        productName.includes(normalized)
      );
    });
  }, [preorders, preorderQuery]);

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
            <label htmlFor="preorder-query">
              Mã preorder / sản phẩm
              <input
                id="preorder-query"
                type="text"
                placeholder="Ví dụ: PO-AB12CD hoặc tên sản phẩm"
                value={preorderQuery}
                onChange={(event) => setPreorderQuery(event.target.value)}
              />
            </label>
          </section>

          <section className="content-panel">
            <h2>Đơn preorder</h2>
            {message.text && (
              <div
                className={
                  message.type === "error" ? "error-banner" : "success-banner"
                }
              >
                {message.text}
              </div>
            )}
            {loadingPreorders && <p>Đang tải danh sách preorder...</p>}
            {!loadingPreorders && preorderError && <p>{preorderError}</p>}
            {!loadingPreorders &&
              !preorderError &&
              !filteredPreorders.length && (
                <p>Không tìm thấy preorder phù hợp.</p>
              )}

            {!loadingPreorders &&
              !preorderError &&
              !!filteredPreorders.length && (
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
                      <strong>
                        Đặt cọc: {formatCurrency(preorder.deposit_amount)}
                      </strong>

                      <div className="order-items-inline">
                        <div>
                          <span>Số lượng</span>
                          <small>x{preorder.quantity}</small>
                        </div>
                        <div>
                          <span>Giá tại thời điểm đặt</span>
                          <small>
                            {formatCurrency(preorder.price_at_order)}
                          </small>
                        </div>
                        {preorder.status === "completed" &&
                          (preorder.product?.product_id ||
                            preorder.product_id) && (
                            <div className="order-review-action">
                              <Link
                                to={`/products/${
                                  preorder.product?.product_id ||
                                  preorder.product_id
                                }#reviews`}
                                className="ghost-button link-button compact-button"
                              >
                                Đánh giá
                              </Link>
                            </div>
                          )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
          </section>

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
            <h2>Đơn hàng</h2>
            {loadingOrders && <p>Đang tải danh sách đơn hàng...</p>}
            {!loadingOrders && error && <p>{error}</p>}
            {!loadingOrders && !error && !filteredOrders.length && (
              <p>Không tìm thấy đơn hàng phù hợp.</p>
            )}

            {!loadingOrders && !error && !!filteredOrders.length && (
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
