import { Link } from "react-router-dom";

import {
  IMAGE_FALLBACK,
  formatCategory,
  formatCurrency,
  resolveImageUrl,
} from "../utils/format";

function ProductCard({
  product,
  onAddToCart,
  primaryAction,
  primaryActionLabel,
  primaryDisabled,
  secondaryActionLabel,
  secondaryActionTo,
  stockLabel,
  stockClass,
}) {
  const isInStock = Number(product.stock_quantity) > 0;
  const fallbackPrimaryLabel = isInStock ? "Thêm giỏ hàng" : "Tạm hết hàng";
  const resolvedPrimaryLabel = primaryActionLabel || fallbackPrimaryLabel;
  const handlePrimaryAction =
    primaryAction || (onAddToCart ? () => onAddToCart(product) : null);
  const isPrimaryDisabled =
    primaryDisabled ?? (!isInStock || !handlePrimaryAction);
  const resolvedSecondaryLabel = secondaryActionLabel || "Xem chi tiết";
  const resolvedSecondaryTo =
    secondaryActionTo || `/products/${product.product_id}`;

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
        <span
          className={`stock-chip ${
            stockClass || (isInStock ? "in-stock" : "sold-out")
          }`}
        >
          {stockLabel ||
            (isInStock ? `Còn ${product.stock_quantity}` : "Hết hàng")}
        </span>
      </div>

      <h3>{product.name}</h3>
      <p className="product-series">
        {product.series || "Bộ sưu tập đang cập nhật"}
      </p>

      <div className="product-footer">
        <div className="product-price">
          <strong>{formatCurrency(product.price)}</strong>
          <div className="product-price-meta">
            <p>{product.brand || "Hãng sản xuất đang cập nhật"}</p>
            <span className="product-views">
              Lượt xem: {Number(product.view_count || 0)}
            </span>
          </div>
        </div>

        <div className="product-actions">
          <Link
            to={resolvedSecondaryTo}
            className="ghost-button link-button compact-button"
          >
            {resolvedSecondaryLabel}
          </Link>
          <button
            type="button"
            className="primary-button compact-button"
            onClick={handlePrimaryAction}
            disabled={isPrimaryDisabled}
          >
            {resolvedPrimaryLabel}
          </button>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
