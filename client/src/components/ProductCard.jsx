import { Link, useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
  const isInStock = Number(product.stock_quantity) > 0;
  const fallbackPrimaryLabel = isInStock ? "Mua ngay" : "Tạm hết hàng";
  const resolvedPrimaryLabel = primaryActionLabel || fallbackPrimaryLabel;
  const handleAddToCart = onAddToCart ? () => onAddToCart(product) : null;
  const buyNowPayload = {
    product_id: product.product_id,
    name: product.name,
    price: Number(product.price),
    image_url: product.image_url,
    stock_quantity: Number(product.stock_quantity),
    quantity: 1,
  };
  const handlePrimaryAction =
    primaryAction ||
    (() => {
      navigate("/cart", {
        state: {
          buyNowProduct: buyNowPayload,
        },
      });
    });
  const isPrimaryDisabled =
    primaryDisabled ?? (!isInStock || !handlePrimaryAction);
  const isAddToCartDisabled = !isInStock || !handleAddToCart;
  const resolvedSecondaryLabel = secondaryActionLabel || "Xem chi tiết";
  const resolvedSecondaryTo =
    secondaryActionTo || `/products/${product.product_id}`;

  return (
    <article className="product-card">
      <div className="product-image-wrap">
        <img
          src={resolveImageUrl(product.image_url)}
          alt={product.name}
          className="product-image"
          onError={(e) => {
            e.currentTarget.src = IMAGE_FALLBACK;
            e.currentTarget.onerror = null;
          }}
        />
        <div className="product-image-overlay">
          <Link
            to={resolvedSecondaryTo}
            className="ghost-button link-button compact-button image-overlay-button"
          >
            {resolvedSecondaryLabel}
          </Link>
        </div>
      </div>

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
          {onAddToCart && (
            <button
              type="button"
              className="ghost-button link-button compact-button"
              onClick={handleAddToCart}
              disabled={isAddToCartDisabled}
            >
              Thêm giỏ hàng
            </button>
          )}
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
