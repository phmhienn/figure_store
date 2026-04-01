import { Link } from "react-router-dom";

import {
  IMAGE_FALLBACK,
  formatCategory,
  formatCurrency,
  resolveImageUrl,
} from "../utils/format";

function ProductCard({ product, onAddToCart }) {
  const isInStock = Number(product.stock_quantity) > 0;

  return (
    <article className="product-card">
      <Link
        to={`/products/${product.product_id}`}
        className="product-image-wrap"
      >
        <img
          src={resolveImageUrl(product.image_url)}
          alt={product.name}
          className="product-image"
          onError={(e) => {
            e.currentTarget.src = IMAGE_FALLBACK;
            e.currentTarget.onerror = null;
          }}
        />
      </Link>

      <div className="product-meta-row">
        <span>{formatCategory(product.category)}</span>
        <span className={`stock-chip ${isInStock ? "in-stock" : "sold-out"}`}>
          {isInStock ? `Còn ${product.stock_quantity}` : "Hết hàng"}
        </span>
      </div>

      <h3>{product.name}</h3>
      <p className="product-series">
        {product.series || "Bộ sưu tập đang cập nhật"}
      </p>

      <div className="product-footer">
        <div className="product-price">
          <strong>{formatCurrency(product.price)}</strong>
          <p>{product.brand || "Hãng sản xuất đang cập nhật"}</p>
        </div>

        <div className="product-actions">
          <Link
            to={`/products/${product.product_id}`}
            className="ghost-button link-button compact-button"
          >
            Xem chi tiết
          </Link>
          <button
            type="button"
            className="primary-button compact-button"
            onClick={() => onAddToCart(product)}
            disabled={!isInStock}
          >
            {isInStock ? "Thêm giỏ hàng" : "Tạm hết hàng"}
          </button>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
