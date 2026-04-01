import { IMAGE_FALLBACK, formatDate, resolveImageUrl } from "../utils/format";

const statusLabels = {
  draft: "Nháp",
  published: "Đã đăng",
};

function AdminNewsTable({ posts, onEdit, onDelete }) {
  return (
    <div className="table-shell">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Bài viết</th>
            <th>Trạng thái</th>
            <th>Cập nhật</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => (
            <tr key={post.news_id}>
              <td>
                <div className="table-product-cell">
                  <img
                    src={
                      resolveImageUrl(post.cover_image_url) || IMAGE_FALLBACK
                    }
                    alt={post.title}
                    onError={(e) => {
                      e.currentTarget.src = IMAGE_FALLBACK;
                      e.currentTarget.onerror = null;
                    }}
                  />
                  <div>
                    <strong>{post.title}</strong>
                    <p>{post.excerpt || "Chưa có mô tả ngắn."}</p>
                  </div>
                </div>
              </td>
              <td>
                <span className={`status-chip ${post.status}`}>
                  {statusLabels[post.status] || post.status}
                </span>
              </td>
              <td>{formatDate(post.updated_at || post.created_at)}</td>
              <td>
                <div className="table-actions">
                  <button
                    type="button"
                    className="ghost-button compact-button"
                    onClick={() => onEdit(post)}
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    className="danger-button compact-button"
                    onClick={() => onDelete(post.news_id)}
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

export default AdminNewsTable;
