import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

import AdminNewsTable from "../components/AdminNewsTable";
import { useAuth } from "../context/AuthContext";
import { IMAGE_FALLBACK, resolveImageUrl } from "../utils/format";
import newsService from "../services/newsService";
import uploadService from "../services/uploadService";

const initialForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  cover_image_url: "",
  status: "draft",
};

const stripHtml = (html = "") =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const buildExcerpt = (html) => {
  const text = stripHtml(html);
  if (!text) return "";
  return text.length > 180 ? `${text.slice(0, 180).trim()}...` : text;
};

const editorModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["blockquote", "code-block"],
    ["link"],
    ["clean"],
  ],
};

const editorFormats = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "list",
  "bullet",
  "blockquote",
  "code-block",
  "link",
];

function AdminNewsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [posts, setPosts] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const fileInputRef = useRef(null);

  const fetchPosts = async () => {
    try {
      const data = await newsService.getAdminList();
      setPosts(data);
    } catch (requestError) {
      setMessage({
        type: "error",
        text: requestError.response?.data?.message || "Không thể tải bài viết.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const resetForm = () => {
    setFormData(initialForm);
    setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCoverFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage({ type: "", text: "" });

    try {
      const imageUrl = await uploadService.uploadNewsCover(file);
      setFormData((curr) => ({ ...curr, cover_image_url: imageUrl }));
      setMessage({ type: "success", text: "✓ Ảnh cover đã được tải lên." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Tải ảnh thất bại. Thử lại sau.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage({ type: "", text: "" });

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        excerpt: formData.excerpt || buildExcerpt(formData.content),
      };

      if (editingId) {
        await newsService.update(editingId, payload);
        setMessage({ type: "success", text: "Cập nhật bài viết thành công." });
      } else {
        await newsService.create(payload);
        setMessage({ type: "success", text: "Đăng bài viết thành công." });
      }

      resetForm();
      await fetchPosts();
    } catch (requestError) {
      setMessage({
        type: "error",
        text: requestError.response?.data?.message || "Không thể lưu bài viết.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (post) => {
    setEditingId(post.news_id);
    setFormData({
      title: post.title || "",
      slug: post.slug || "",
      excerpt: post.excerpt || "",
      content: post.content || "",
      cover_image_url: post.cover_image_url || "",
      status: post.status || "draft",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (postId) => {
    if (!window.confirm("Bạn có chắc muốn xóa bài viết này?")) return;

    try {
      await newsService.remove(postId);
      setMessage({ type: "success", text: "Xóa bài viết thành công." });
      await fetchPosts();
    } catch (requestError) {
      setMessage({
        type: "error",
        text: requestError.response?.data?.message || "Không thể xóa bài viết.",
      });
    }
  };

  const previewSrc = formData.cover_image_url
    ? resolveImageUrl(formData.cover_image_url)
    : IMAGE_FALLBACK;

  return (
    <div className="admin-layout">
      <section className="content-panel">
        <div className="section-header-row compact-row">
          <div>
            <p className="eyebrow">Khu vực quản trị</p>
            <h1>Tin tức & bài viết</h1>
          </div>
          <div className="admin-header-actions">
            <Link to="/admin" className="ghost-button">
              Bảng điều khiển
            </Link>
            <Link to="/admin/orders" className="ghost-button">
              Quản trị đơn hàng
            </Link>
            {isAdmin && (
              <Link to="/admin/products" className="ghost-button">
                Quản trị sản phẩm
              </Link>
            )}
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
          <label>
            Tiêu đề bài viết
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData((c) => ({ ...c, title: e.target.value }))
              }
              required
            />
          </label>

          <label>
            Slug (tự động nếu để trống)
            <input
              type="text"
              value={formData.slug}
              onChange={(e) =>
                setFormData((c) => ({ ...c, slug: e.target.value }))
              }
              placeholder="vd: mo-hinh-hot-thang-4"
            />
          </label>

          <label>
            Trạng thái
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData((c) => ({ ...c, status: e.target.value }))
              }
            >
              <option value="draft">Nháp</option>
              <option value="published">Đã đăng</option>
            </select>
          </label>

          <label>
            Mô tả ngắn
            <textarea
              rows="4"
              value={formData.excerpt}
              onChange={(e) =>
                setFormData((c) => ({ ...c, excerpt: e.target.value }))
              }
              placeholder="Tóm tắt ngắn nội dung bài viết..."
            />
          </label>

          <div className="full-width-field image-upload-block">
            <p className="upload-label">Ảnh cover bài viết</p>
            <div className="image-upload-row">
              <div className="image-preview-box cover-preview-box">
                <img
                  src={previewSrc}
                  alt="Cover preview"
                  onError={(e) => {
                    e.currentTarget.src = IMAGE_FALLBACK;
                    e.currentTarget.onerror = null;
                  }}
                />
              </div>

              <div className="image-upload-controls">
                <label
                  className="ghost-button file-upload-btn"
                  aria-label="Chọn ảnh cover"
                >
                  {uploading ? "Đang tải lên..." : "📁 Chọn ảnh cover"}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleCoverFile}
                    disabled={uploading}
                    style={{ display: "none" }}
                  />
                </label>

                <span className="upload-divider">hoặc nhập URL:</span>

                <input
                  type="text"
                  value={formData.cover_image_url}
                  onChange={(e) =>
                    setFormData((c) => ({
                      ...c,
                      cover_image_url: e.target.value,
                    }))
                  }
                  placeholder="https://... hoặc images/news/ten-anh.jpg"
                />

                <span className="input-hint">
                  File ảnh: jpg, png, webp, gif — tối đa 5MB.
                  <br />
                  Hoặc đặt ảnh vào <code>client/public/images/news/</code> và
                  nhập đường dẫn <code>images/news/ten-anh.jpg</code>.
                </span>
              </div>
            </div>
          </div>

          <div className="full-width-field">
            <p className="upload-label">Nội dung bài viết</p>
            <div className="news-editor">
              <ReactQuill
                theme="snow"
                value={formData.content}
                onChange={(value) =>
                  setFormData((c) => ({ ...c, content: value }))
                }
                modules={editorModules}
                formats={editorFormats}
              />
            </div>
          </div>

          <button
            type="submit"
            className="primary-button"
            disabled={submitting || uploading}
          >
            {submitting
              ? "Đang lưu..."
              : editingId
                ? "Cập nhật bài viết"
                : "Đăng bài viết"}
          </button>
        </form>
      </section>

      <section className="content-panel">
        <h2>Danh sách bài viết ({posts.length})</h2>
        {loading ? (
          <p>Đang tải bài viết...</p>
        ) : (
          <AdminNewsTable
            posts={posts}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </section>
    </div>
  );
}

export default AdminNewsPage;
