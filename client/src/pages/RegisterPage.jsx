import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    username: "",
    full_name: "",
    phone: "",
    email: "",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const navigateTimer = useRef(null);

  const clearTimers = () => {
    if (navigateTimer.current) {
      clearTimeout(navigateTimer.current);
      navigateTimer.current = null;
    }
  };

  const dispatchAppToast = (payload) => {
    window.dispatchEvent(new CustomEvent("app-toast", { detail: payload }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    clearTimers();

    try {
      setSubmitting(true);
      await register(formData);
      dispatchAppToast({
        type: "success",
        text: "Đăng ký thành công. Đang chuyển hướng...",
      });
      navigateTimer.current = setTimeout(() => {
        navigate("/", { replace: true });
      }, 1200);
    } catch (requestError) {
      dispatchAppToast({
        type: "error",
        text: requestError.response?.data?.message || "Đăng ký thất bại.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => () => clearTimers(), []);

  return (
    <section className="auth-shell content-panel">
      <div>
        <p className="eyebrow">Tài khoản mới</p>
        <h1>Đăng ký</h1>
        <p>
          Tạo tài khoản khách hàng để lưu thông tin đặt hàng, lịch sử mua và các
          quyền lợi thành viên.
        </p>
      </div>

      <form className="stacked-form" onSubmit={handleSubmit}>
        <label>
          Tên đăng nhập
          <input
            type="text"
            value={formData.username}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                username: event.target.value,
              }))
            }
            required
          />
        </label>

        <label>
          Họ và tên
          <input
            type="text"
            value={formData.full_name}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                full_name: event.target.value,
              }))
            }
          />
        </label>

        <label>
          Số điện thoại
          <input
            type="text"
            value={formData.phone}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                phone: event.target.value,
              }))
            }
          />
        </label>

        <label>
          Email
          <input
            type="email"
            value={formData.email}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                email: event.target.value,
              }))
            }
            required
          />
        </label>

        <label>
          Mật khẩu
          <input
            type="password"
            value={formData.password}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                password: event.target.value,
              }))
            }
            required
            minLength={8}
          />
          <span className="input-hint">
            Ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số.
          </span>
        </label>

        <button type="submit" className="primary-button" disabled={submitting}>
          {submitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
        </button>

        <p>
          Đã có tài khoản? <Link to="/login">Đăng nhập tại đây</Link>
        </p>
      </form>
    </section>
  );
}

export default RegisterPage;
