import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const redirectPath = location.state?.from?.pathname || '/';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      setSubmitting(true);
      await login(formData);
      navigate(redirectPath, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Đăng nhập thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="auth-shell content-panel">
      <div>
        <p className="eyebrow">Tài khoản</p>
        <h1>Đăng nhập</h1>
        <p>Dùng tài khoản hiện có để quản lý giỏ hàng, theo dõi đơn đặt trước và truy cập quyền quản trị.</p>
      </div>

      <form className="stacked-form" onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            value={formData.email}
            onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
            required
          />
        </label>

        <label>
          Mật khẩu
          <input
            type="password"
            value={formData.password}
            onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))}
            required
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="primary-button" disabled={submitting}>
          {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>

        <p>
          Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
        </p>
        <p>
          Quên mật khẩu? <Link to="/forgot-password">Khôi phục ngay</Link>
        </p>
      </form>
    </section>
  );
}

export default LoginPage;
