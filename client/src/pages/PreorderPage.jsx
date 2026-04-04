import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import ProductCard from "../components/ProductCard";
import { useAuth } from "../context/AuthContext";
import productService from "../services/productService";
import preorderService from "../services/preorderService";
import { formatCurrency } from "../utils/format";

const DEPOSIT_RATIO = 0.2;

function PreorderPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [submittingId, setSubmittingId] = useState(null);

  useEffect(() => {
    const fetchPreorders = async () => {
      setLoading(true);
      setError("");
      setNotice({ type: "", text: "" });

      try {
        const result = await productService.getAll({ page: 1, limit: 48 });
        const preorderItems = (result.data || []).filter(
          (item) => Number(item.stock_quantity || 0) <= 0,
        );
        setProducts(preorderItems);
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            "Không thể tải danh sách hàng đặt trước lúc này.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPreorders();
  }, []);

  const handlePreorder = async (product) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    setNotice({ type: "", text: "" });
    setSubmittingId(product.product_id);

    try {
      const data = await preorderService.create({
        product_id: product.product_id,
        quantity: 1,
      });

      if (!data?.payUrl) {
        setNotice({
          type: "error",
          text: "Không thể tạo link thanh toán VNPay.",
        });
        return;
      }

      setNotice({
        type: "success",
        text: "Đang chuyển đến cổng thanh toán VNPay...",
      });
      window.location.href = data.payUrl;
    } catch (requestError) {
      setNotice({
        type: "error",
        text:
          requestError.response?.data?.message ||
          "Không thể tạo đơn đặt trước.",
      });
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="page-stack">
      <section className="section-header-row">
        <div>
          <p className="eyebrow">Danh mục trưng bày</p>
          <h1>Hàng đặt trước</h1>
        </div>
        <p>Chốt giá sớm, giữ suất ưu tiên cho những mẫu sắp ra mắt.</p>
      </section>

      <section className="content-panel">
        <div className="order-items-inline">
          <div>
            <span>Quy trình preorder</span>
            <small>Đặt cọc 20% để giữ suất, có thông báo khi hàng về.</small>
          </div>
          <div>
            <span>Mốc thanh toán</span>
            <small>Thanh toán phần còn lại trước khi giao hàng.</small>
          </div>
          <div>
            <span>Tra cứu đơn</span>
            <small>
              Theo dõi tiến độ tại{" "}
              <Link to="/preorder-lookup">Tra cứu đơn hàng</Link>.
            </small>
          </div>
        </div>
      </section>

      {loading && (
        <section className="content-panel">
          Đang tải danh sách sản phẩm...
        </section>
      )}
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
      {!loading && error && (
        <section className="content-panel error-panel">{error}</section>
      )}

      {!loading && !error && !products.length && (
        <section className="content-panel empty-state">
          <h3>Chưa có sản phẩm preorder</h3>
          <p>Vui lòng quay lại sau, chúng tôi sẽ cập nhật thêm.</p>
        </section>
      )}

      {!loading && !error && !!products.length && (
        <section className="product-grid">
          {products.map((product) => (
            <ProductCard
              key={product.product_id}
              product={product}
              primaryActionLabel={`Đặt cọc ${formatCurrency(
                Number(product.price || 0) * DEPOSIT_RATIO,
              )}`}
              primaryAction={() => handlePreorder(product)}
              primaryDisabled={submittingId === product.product_id}
              stockLabel="Đặt trước"
              stockClass="preorder"
            />
          ))}
        </section>
      )}
    </div>
  );
}

export default PreorderPage;
