import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import AdminProductTable from "../components/AdminProductTable";
import { IMAGE_FALLBACK, resolveImageUrl } from "../utils/format";
import productService from "../services/productService";
import uploadService from "../services/uploadService";

const initialForm = {
  name: "",
  slug: "",
  description: "",
  price: "",
  stock_quantity: "",
  image_url: "",
  category: "",
  series: "",
  brand: "",
  status: "active",
};

function AdminDashboardPage() {
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const fileInputRef = useRef(null);

  const fetchProducts = async () => {
    try {
      const result = await productService.getAll({ limit: 100 });
      setProducts(result.data);
    } catch (requestError) {
      setMessage({
        type: "error",
        text:
          requestError.response?.data?.message ||
          "Không thể tải danh sách sản phẩm.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const resetForm = () => {
    setFormData(initialForm);
    setEditingId(null);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Image upload ────────────────────────────────────────────────
  const handleImageFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formPayload = new FormData();
    formPayload.append("image", file);

    setUploading(true);
    setMessage({ type: "", text: "" });

    try {
      const imageUrl = await uploadService.uploadProductImage(file);
      setFormData((curr) => ({ ...curr, image_url: imageUrl }));
      setMessage({
        type: "success",
        text: "✓ Ảnh đã được tải lên thành công.",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Tải ảnh thất bại. Thử lại sau.",
      });
    } finally {
      setUploading(false);
    }
  };

  // ── Form submit ─────────────────────────────────────────────────
  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage({ type: "", text: "" });

    try {
      setSubmitting(true);

      if (editingId) {
        await productService.update(editingId, formData);
        setMessage({ type: "success", text: "Cập nhật sản phẩm thành công." });
      } else {
        await productService.create(formData);
        setMessage({ type: "success", text: "Tạo sản phẩm thành công." });
      }

      resetForm();
      await fetchProducts();
    } catch (requestError) {
      setMessage({
        type: "error",
        text: requestError.response?.data?.message || "Không thể lưu sản phẩm.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (product) => {
    setEditingId(product.product_id);
    setFormData({
      name: product.name || "",
      slug: product.slug || "",
      description: product.description || "",
      price: product.price,
      stock_quantity: product.stock_quantity,
      image_url: product.image_url || "",
      category: product.category || "",
      series: product.series || "",
      brand: product.brand || "",
      status: product.status || "active",
    });
    // Scroll to form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (productId) => {
    if (!window.confirm("Bạn có chắc muốn xóa sản phẩm này?")) return;

    try {
      await productService.remove(productId);
      setMessage({ type: "success", text: "Xóa sản phẩm thành công." });
      await fetchProducts();
    } catch (requestError) {
      setMessage({
        type: "error",
        text: requestError.response?.data?.message || "Không thể xóa sản phẩm.",
      });
    }
  };

  // Current image preview
  const previewSrc = formData.image_url
    ? resolveImageUrl(formData.image_url)
    : IMAGE_FALLBACK;

  return (
    <div className="admin-layout">
      {/* ── Product Form ── */}
      <section className="content-panel">
        <div className="section-header-row compact-row">
          <div>
            <p className="eyebrow">Khu vực quản trị</p>
            <h1>Bảng điều khiển sản phẩm</h1>
          </div>
          <div className="admin-header-actions">
            <Link to="/admin" className="ghost-button">
              Bảng điều khiển
            </Link>
            <Link to="/admin/orders" className="ghost-button">
              Quản trị đơn hàng
            </Link>
            <Link to="/admin/news" className="ghost-button">
              Quản trị tin tức
            </Link>
            {editingId && (
              <button
                type="button"
                className="ghost-button"
                onClick={resetForm}
              >
                Hủy chỉnh sửa
              </button>
            )}
          </div>
        </div>

        {message.text && (
          <div
            className={
              message.type === "error" ? "error-banner" : "success-banner"
            }
          >
            {message.text}
          </div>
        )}

        <form className="admin-form-grid" onSubmit={handleSubmit}>
          {/* Name */}
          <label>
            Tên sản phẩm
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((c) => ({ ...c, name: e.target.value }))
              }
              required
            />
          </label>

          {/* Slug */}
          <label>
            Slug (tự động nếu để trống)
            <input
              type="text"
              value={formData.slug}
              onChange={(e) =>
                setFormData((c) => ({ ...c, slug: e.target.value }))
              }
              placeholder="vd: naruto-sage-mode-figure"
            />
          </label>

          {/* Price */}
          <label>
            Giá bán (VNĐ)
            <input
              type="number"
              min="0"
              value={formData.price}
              onChange={(e) =>
                setFormData((c) => ({ ...c, price: e.target.value }))
              }
              required
            />
          </label>

          {/* Stock */}
          <label>
            Số lượng tồn kho
            <input
              type="number"
              min="0"
              value={formData.stock_quantity}
              onChange={(e) =>
                setFormData((c) => ({ ...c, stock_quantity: e.target.value }))
              }
              required
            />
          </label>

          {/* Category */}
          <label>
            Danh mục
            <input
              type="text"
              value={formData.category}
              onChange={(e) =>
                setFormData((c) => ({ ...c, category: e.target.value }))
              }
              placeholder="vd: Scale Figure"
            />
          </label>

          {/* Series */}
          <label>
            Series
            <input
              type="text"
              value={formData.series}
              onChange={(e) =>
                setFormData((c) => ({ ...c, series: e.target.value }))
              }
              placeholder="vd: Naruto Shippuden"
            />
          </label>

          {/* Brand */}
          <label>
            Thương hiệu
            <input
              type="text"
              value={formData.brand}
              onChange={(e) =>
                setFormData((c) => ({ ...c, brand: e.target.value }))
              }
              placeholder="vd: Good Smile Company"
            />
          </label>

          {/* Status */}
          <label>
            Trạng thái
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData((c) => ({ ...c, status: e.target.value }))
              }
            >
              <option value="active">Đang bán</option>
              <option value="inactive">Tạm ẩn</option>
            </select>
          </label>

          {/* Image upload — full width */}
          <div className="full-width-field image-upload-block">
            <p className="upload-label">Hình ảnh sản phẩm</p>
            <div className="image-upload-row">
              {/* Preview */}
              <div className="image-preview-box">
                <img
                  src={previewSrc}
                  alt="Preview"
                  onError={(e) => {
                    e.currentTarget.src = IMAGE_FALLBACK;
                    e.currentTarget.onerror = null;
                  }}
                />
              </div>

              {/* Controls */}
              <div className="image-upload-controls">
                {/* File picker */}
                <label
                  className="ghost-button file-upload-btn"
                  aria-label="Chọn ảnh từ máy"
                >
                  {uploading ? "Đang tải lên..." : "📁 Chọn file ảnh"}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageFile}
                    disabled={uploading}
                    style={{ display: "none" }}
                  />
                </label>

                <span className="upload-divider">hoặc nhập URL:</span>

                {/* Manual URL */}
                <input
                  type="text"
                  value={formData.image_url}
                  onChange={(e) =>
                    setFormData((c) => ({ ...c, image_url: e.target.value }))
                  }
                  placeholder="https://... hoặc images/products/ten-anh.jpg"
                />

                <span className="input-hint">
                  File ảnh: jpg, png, webp, gif — tối đa 5MB.
                  <br />
                  Hoặc đặt ảnh vào <code>
                    client/public/images/products/
                  </code>{" "}
                  và nhập đường dẫn <code>images/products/ten-anh.jpg</code>.
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <label className="full-width-field">
            Mô tả sản phẩm
            <textarea
              rows="4"
              value={formData.description}
              onChange={(e) =>
                setFormData((c) => ({ ...c, description: e.target.value }))
              }
              placeholder="Mô tả chi tiết về sản phẩm..."
            />
          </label>

          <button
            type="submit"
            className="primary-button"
            disabled={submitting || uploading}
          >
            {submitting
              ? "Đang lưu..."
              : editingId
                ? "Cập nhật sản phẩm"
                : "Tạo sản phẩm"}
          </button>
        </form>
      </section>

      {/* ── Product Table ── */}
      <section className="content-panel">
        <h2>Catalog hiện tại ({products.length} sản phẩm)</h2>
        {loading ? (
          <p>Đang tải sản phẩm...</p>
        ) : (
          <AdminProductTable
            products={products}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </section>
    </div>
  );
}

export default AdminDashboardPage;
