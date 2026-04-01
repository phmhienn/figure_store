import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import ProductCard from "../components/ProductCard";
import { useCart } from "../context/CartContext";
import productService from "../services/productService";

function PreorderPage() {
  const { addToCart } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPreorders = async () => {
      setLoading(true);
      setError("");

      try {
        const result = await productService.getAll({ page: 1, limit: 24 });
        setProducts(result.data);
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
            <small>Đặt cọc để giữ suất, có thông báo khi hàng về.</small>
          </div>
          <div>
            <span>Mốc thanh toán</span>
            <small>Thanh toán phần còn lại trước khi giao hàng.</small>
          </div>
          <div>
            <span>Tra cứu đơn</span>
            <small>
              Theo dõi tiến độ tại{" "}
              <Link to="/preorder-lookup">Tra cứu đơn đặt trước</Link>.
            </small>
          </div>
        </div>
      </section>

      {loading && (
        <section className="content-panel">
          Đang tải danh sách sản phẩm...
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
              onAddToCart={addToCart}
            />
          ))}
        </section>
      )}
    </div>
  );
}

export default PreorderPage;
