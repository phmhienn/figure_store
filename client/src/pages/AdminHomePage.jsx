import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const adminLinks = [
  {
    title: "Quản lý sản phẩm",
    copy: "Thêm/sửa/xóa sản phẩm, tồn kho, hình ảnh và trạng thái bán.",
    to: "/admin/products",
  },
  {
    title: "Quản lý đơn hàng",
    copy: "Xác nhận đơn, theo dõi và cập nhật trạng thái xử lý.",
    to: "/admin/orders",
  },
  {
    title: "Quản lý tin tức",
    copy: "Đăng bài, chỉnh sửa nội dung và quản lý bài viết đã đăng.",
    to: "/admin/news",
  },
  {
    title: "Quản lý nhân viên",
    copy: "Tài khoản nhân viên, phân quyền và thông tin liên hệ.",
    to: "/admin/staff",
  },
];

function AdminHomePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const visibleLinks = isAdmin
    ? adminLinks
    : adminLinks.filter((item) =>
        ["/admin/orders", "/admin/news"].includes(item.to),
      );

  return (
    <div className="admin-layout">
      <section className="section-header-row">
        <div>
          <p className="eyebrow">Khu vực quản trị</p>
          <h1>Bảng điều khiển quản trị</h1>
        </div>
        <p>Chọn chức năng để quản lý cửa hàng.</p>
      </section>

      <section className="content-panel">
        <div className="admin-menu-grid">
          {visibleLinks.map((item) => (
            <Link key={item.title} to={item.to} className="admin-menu-card">
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
              <span className="admin-menu-meta">Mở quản trị →</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export default AdminHomePage;
