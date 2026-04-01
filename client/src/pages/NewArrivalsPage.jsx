import { useEffect, useState } from "react";

import ProductCard from "../components/ProductCard";
import { useCart } from "../context/CartContext";
import productService from "../services/productService";

function NewArrivalsPage() {
  const { addToCart } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchNewArrivals = async () => {
      setLoading(true);
      setError("");

      try {
        const result = await productService.getAll({ page: 1, limit: 12 });
        setProducts(result.data);
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            "Không thể tải danh sách hàng mới về lúc này.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchNewArrivals();
  }, []);

  return (
    <div className="page-stack">
      <section className="section-header-row">
        <div>
          <p className="eyebrow">Danh mục trưng bày</p>
          <h1>Hàng mới về</h1>
        </div>
        <p>Tuyển chọn các mẫu figure mới cập nhật gần đây.</p>
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
          <h3>Chưa có sản phẩm mới</h3>
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

export default NewArrivalsPage;
