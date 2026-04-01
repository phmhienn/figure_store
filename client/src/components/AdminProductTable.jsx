import {
  IMAGE_FALLBACK,
  formatCategory,
  formatCurrency,
  formatProductStatus,
  resolveImageUrl,
} from "../utils/format";

function AdminProductTable({ products, onEdit, onDelete }) {
  return (
    <div className="table-shell">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Sản phẩm</th>
            <th>Series</th>
            <th>Giá</th>
            <th>Tồn kho</th>
            <th>Trạng thái</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.product_id}>
              <td>
                <div className="table-product-cell">
                  <img
                    src={resolveImageUrl(product.image_url)}
                    alt={product.name}
                    onError={(e) => { e.currentTarget.src = IMAGE_FALLBACK; e.currentTarget.onerror = null; }}
                  />
                  <div>
                    <strong>{product.name}</strong>
                    <p>{formatCategory(product.category)}</p>
                  </div>
                </div>
              </td>
              <td>{product.series || "Chưa cập nhật"}</td>
              <td>{formatCurrency(product.price)}</td>
              <td>{product.stock_quantity}</td>
              <td>
                <span className={`status-chip ${product.status}`}>
                  {formatProductStatus(product.status)}
                </span>
              </td>
              <td>
                <div className="table-actions">
                  <button
                    type="button"
                    className="ghost-button compact-button"
                    onClick={() => onEdit(product)}
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    className="danger-button compact-button"
                    onClick={() => onDelete(product.product_id)}
                  >
                    Xóa
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminProductTable;
