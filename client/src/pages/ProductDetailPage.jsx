import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { useCart } from "../context/CartContext";
import productService from "../services/productService";
import {
  IMAGE_FALLBACK,
  formatCategory,
  formatCurrency,
  formatProductStatus,
  resolveImageUrl,
} from "../utils/format";

function ProductDetailPage() {
  const { id } = useParams();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    <section className="detail-layout content-panel">
      <div className="detail-image-shell">
        <img
          src={resolveImageUrl(product.image_url)}
          alt={product.name}
          className="detail-image"
          onError={(e) => { e.currentTarget.src = IMAGE_FALLBACK; e.currentTarget.onerror = null; }}
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
            {product.stock_quantity > 0 ? "Thêm vào giỏ hàng" : "Tạm hết hàng"}
          </button>
        </div>
      </div>
    </section>
  );
}

export default ProductDetailPage;
