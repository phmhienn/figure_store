import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import authService from "../services/authService";

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      setSubmitting(true);
      const response = await authService.requestPasswordReset(email);
      setSuccess(
        response?.message ||
          "Nếu email tồn tại, chúng tôi đã gửi mã OTP.",
      );
      navigate("/reset-password", { state: { email } });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Gửi yêu cầu thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="auth-shell content-panel">
      <div>
        <p className="eyebrow">Tài khoản</p>
        <h1>Quên mật khẩu</h1>
        <p>Nhập email để nhận mã OTP từ Gmail.</p>
      </div>

      <form className="stacked-form" onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        {error && <p className="form-error">{error}</p>}
        {success && <p className="success-panel">{success}</p>}

        <button type="submit" className="primary-button" disabled={submitting}>
          {submitting ? "Đang gửi..." : "Gửi mã OTP"}
        </button>

        <p>
          Đã nhớ mật khẩu? <Link to="/login">Đăng nhập</Link>
        </p>
      </form>
    </section>
  );
}

export default ForgotPasswordPage;
