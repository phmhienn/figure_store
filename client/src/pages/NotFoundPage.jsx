import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <section className="content-panel not-found-panel">
      <p className="eyebrow">404</p>
      <h1>Không tìm thấy trang</h1>
      <p>Đường dẫn bạn mở hiện không tồn tại trong giao diện cửa hàng này.</p>
      <Link to="/" className="primary-button link-button">
        Quay lại trang chủ
      </Link>
    </section>
  );
}

export default NotFoundPage;
