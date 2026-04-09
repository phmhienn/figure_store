import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigateTimer = useRef(null);

  const redirectPath = location.state?.from?.pathname || "/";

  const clearTimers = () => {
    if (navigateTimer.current) {
      clearTimeout(navigateTimer.current);
      navigateTimer.current = null;
    }
  };

  const dispatchAppToast = (payload) => {
    window.dispatchEvent(new CustomEvent("app-toast", { detail: payload }));
  };

  const validateForm = () => {
    const nextFieldErrors = { email: "", password: "" };

    if (!formData.email.trim()) {
      nextFieldErrors.email = "Vui lòng nhập email.";
    }

    if (!formData.password.trim()) {
      nextFieldErrors.password = "Vui lòng nhập mật khẩu.";
    }

    setFieldErrors(nextFieldErrors);
    return !nextFieldErrors.email && !nextFieldErrors.password;
  };

  const handleInputChange = (field) => (event) => {
    const nextValue = event.target.value;

    setFormData((current) => ({
      ...current,
      [field]: nextValue,
    }));

    setAuthError("");
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      if (nextValue.trim()) {
        return {
          ...current,
          [field]: "",
        };
      }

      return current;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    clearTimers();
    setAuthError("");

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      await login({
        email: formData.email.trim(),
        password: formData.password,
      });
      dispatchAppToast({
        type: "success",
        text: "Đăng nhập thành công. Đang chuyển hướng...",
      });
      navigateTimer.current = setTimeout(() => {
        navigate(redirectPath, { replace: true });
      }, 1200);
    } catch (_requestError) {
      setAuthError("Sai tài khoản hoặc mật khẩu.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => () => clearTimers(), []);

  return (
    <section className="auth-shell content-panel">
      <div>
        <p className="eyebrow">Tài khoản</p>
        <h1>Đăng nhập</h1>
        <p>
          Dùng tài khoản hiện có để quản lý giỏ hàng, theo dõi đơn đặt trước và
          truy cập quyền quản trị.
        </p>
      </div>

      <form className="stacked-form" onSubmit={handleSubmit} noValidate>
        <label>
          Email
          <input
            type="email"
            value={formData.email}
            onChange={handleInputChange("email")}
          />
          {fieldErrors.email && (
            <p className="form-error">{fieldErrors.email}</p>
          )}
        </label>

        <label>
          Mật khẩu
          <input
            type="password"
            value={formData.password}
            onChange={handleInputChange("password")}
          />
          {fieldErrors.password && (
            <p className="form-error">{fieldErrors.password}</p>
          )}
        </label>

        {authError && <p className="form-error">{authError}</p>}

        <button type="submit" className="primary-button" disabled={submitting}>
          {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>

        <p>
          Chưa có tài khoản?{" "}
          <Link className="auth-link-highlight" to="/register">
            Đăng ký ngay
          </Link>
        </p>
        <p>
          Quên mật khẩu?{" "}
          <Link className="auth-link-highlight" to="/forgot-password">
            Khôi phục ngay
          </Link>
        </p>
      </form>
    </section>
  );
}

export default LoginPage;
