import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import userService from "../services/userService";

const initialForm = {
  username: "",
  email: "",
  password: "",
  full_name: "",
  phone: "",
  role: "staff",
};

function AdminStaffPage() {
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState("");
  const [showCustomers, setShowCustomers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const fetchUsers = async () => {
    try {
      const data = await userService.getAll();
      setUsers(data);
    } catch (_error) {
      setMessage({ type: "error", text: "Không thể tải danh sách nhân viên." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const resetForm = () => {
    setFormData(initialForm);
    setEditingId(null);
  };

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = showCustomers
      ? users
      : users.filter((user) => user.role !== "customer");

    if (!normalized) return filtered;

    return filtered.filter((user) => {
      const nameMatch = String(user.full_name || "")
        .toLowerCase()
        .includes(normalized);
      const emailMatch = String(user.email || "")
        .toLowerCase()
        .includes(normalized);
      const usernameMatch = String(user.username || "")
        .toLowerCase()
        .includes(normalized);
      return nameMatch || emailMatch || usernameMatch;
    });
  }, [users, query, showCustomers]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage({ type: "", text: "" });

    try {
      setSubmitting(true);
      const payload = {
        username: formData.username,
        email: formData.email,
        full_name: formData.full_name,
        phone: formData.phone,
        role: formData.role,
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      if (editingId) {
        await userService.updateUser(editingId, payload);
        setMessage({ type: "success", text: "Cập nhật nhân viên thành công." });
      } else {
        if (!formData.password) {
          setMessage({
            type: "error",
            text: "Mật khẩu là bắt buộc khi tạo mới.",
          });
          return;
        }
        await userService.createStaff(payload);
        setMessage({ type: "success", text: "Tạo nhân viên thành công." });
      }

      resetForm();
      await fetchUsers();
    } catch (requestError) {
      setMessage({
        type: "error",
        text:
          requestError.response?.data?.message || "Không thể lưu nhân viên.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (user) => {
    setEditingId(user.user_id);
    setFormData({
      username: user.username || "",
      email: user.email || "",
      password: "",
      full_name: user.full_name || "",
      phone: user.phone || "",
      role: user.role || "staff",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("Bạn có chắc muốn xóa tài khoản này?")) return;

    try {
      await userService.removeUser(userId);
      setMessage({ type: "success", text: "Xóa nhân viên thành công." });
      await fetchUsers();
    } catch (requestError) {
      setMessage({
        type: "error",
        text:
          requestError.response?.data?.message || "Không thể xóa nhân viên.",
      });
    }
  };

  return (
    <div className="admin-layout">
      <section className="section-header-row">
        <div>
          <p className="eyebrow">Khu vực quản trị</p>
          <h1>Quản lý nhân viên</h1>
        </div>
        <div className="admin-header-actions">
          <Link to="/admin" className="ghost-button">
            Bảng điều khiển
          </Link>
          <Link to="/admin/products" className="ghost-button">
            Quản trị sản phẩm
          </Link>
          <Link to="/admin/orders" className="ghost-button">
            Quản trị đơn hàng
          </Link>
          <Link to="/admin/news" className="ghost-button">
            Quản trị tin tức
          </Link>
        </div>
      </section>

      {message.text && (
        <div
          className={
            message.type === "error" ? "error-banner" : "success-banner"
          }
        >
          {message.text}
        </div>
      )}

      <section className="content-panel">
        <div className="section-header-row compact-row">
          <div>
            <h2>{editingId ? "Cập nhật nhân viên" : "Tạo nhân viên mới"}</h2>
          </div>
          {editingId && (
            <button type="button" className="ghost-button" onClick={resetForm}>
              Hủy chỉnh sửa
            </button>
          )}
        </div>

        <form className="admin-form-grid" onSubmit={handleSubmit}>
          <label>
            Username
            <input
              type="text"
              value={formData.username}
              onChange={(e) =>
                setFormData((c) => ({ ...c, username: e.target.value }))
              }
              required
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((c) => ({ ...c, email: e.target.value }))
              }
              required
            />
          </label>

          <label>
            Họ và tên
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) =>
                setFormData((c) => ({ ...c, full_name: e.target.value }))
              }
            />
          </label>

          <label>
            Số điện thoại
            <input
              type="text"
              value={formData.phone}
              onChange={(e) =>
                setFormData((c) => ({ ...c, phone: e.target.value }))
              }
            />
          </label>

          <label>
            Vai trò
            <select
              value={formData.role}
              onChange={(e) =>
                setFormData((c) => ({ ...c, role: e.target.value }))
              }
            >
              <option value="staff">Nhân viên</option>
              <option value="admin">Quản trị viên</option>
              <option value="customer">Khách hàng</option>
            </select>
          </label>

          <label>
            Mật khẩu {editingId ? "(bỏ trống nếu không đổi)" : ""}
            <input
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData((c) => ({ ...c, password: e.target.value }))
              }
              placeholder={editingId ? "••••••" : "Ít nhất 8 ký tự"}
            />
          </label>

          <button
            type="submit"
            className="primary-button"
            disabled={submitting}
          >
            {submitting
              ? "Đang lưu..."
              : editingId
                ? "Cập nhật"
                : "Tạo nhân viên"}
          </button>
        </form>
      </section>

      <section className="content-panel">
        <div className="section-header-row compact-row">
          <div>
            <h2>Danh sách tài khoản ({filteredUsers.length})</h2>
          </div>
          <label className="order-status-label">
            Hiển thị khách hàng
            <select
              value={showCustomers ? "all" : "staff"}
              onChange={(event) =>
                setShowCustomers(event.target.value === "all")
              }
            >
              <option value="staff">Chỉ nhân viên</option>
              <option value="all">Tất cả người dùng</option>
            </select>
          </label>
        </div>

        <label htmlFor="staff-search">
          Tìm theo tên, username hoặc email
          <input
            id="staff-search"
            type="text"
            placeholder="Ví dụ: hoa, admin@..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        {loading && <p>Đang tải danh sách nhân viên...</p>}
        {!loading && !filteredUsers.length && <p>Chưa có tài khoản phù hợp.</p>}

        {!loading && !!filteredUsers.length && (
          <div className="table-shell">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tài khoản</th>
                  <th>Liên hệ</th>
                  <th>Vai trò</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.user_id}>
                    <td>
                      <strong>{user.full_name || user.username}</strong>
                      <p>{user.username}</p>
                    </td>
                    <td>
                      <p>{user.email}</p>
                      <p>{user.phone || "Chưa có số điện thoại"}</p>
                    </td>
                    <td>{user.role}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="ghost-button compact-button"
                          onClick={() => handleEdit(user)}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          className="danger-button compact-button"
                          onClick={() => handleDelete(user.user_id)}
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
        )}
      </section>
    </div>
  );
}

export default AdminStaffPage;
