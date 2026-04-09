import {
  IMAGE_FALLBACK,
  formatCurrency,
  resolveImageUrl,
} from "../utils/format";

function CartItem({ item, onQuantityChange, onRemove, readOnly = false }) {
  return (
    <article className="cart-item-card">
      <img
        src={resolveImageUrl(item.image_url)}
        alt={item.name}
        className="cart-item-image"
        onError={(e) => {
          e.currentTarget.src = IMAGE_FALLBACK;
          e.currentTarget.onerror = null;
        }}
      />

      <div className="cart-item-content">
        <div>
          <h3>{item.name}</h3>
          <p>{formatCurrency(item.price)} / sản phẩm</p>
        </div>

        <div className="cart-item-actions">
          {readOnly ? (
            <>
              <p>Số lượng: {item.quantity}</p>
              <strong>{formatCurrency(item.price * item.quantity)}</strong>
            </>
          ) : (
            <>
              <label>
                Số lượng
                <input
                  type="number"
                  min="1"
                  max={item.stock_quantity}
                  value={item.quantity}
                  onChange={(event) =>
                    onQuantityChange(
                      item.product_id,
                      Number(event.target.value),
                    )
                  }
                />
              </label>

              <strong>{formatCurrency(item.price * item.quantity)}</strong>

              <button
                type="button"
                className="ghost-button compact-button"
                onClick={() => onRemove(item.product_id)}
              >
                Xóa
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export default CartItem;
