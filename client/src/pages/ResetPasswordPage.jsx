import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

import authService from "../services/authService";

function ResetPasswordPage() {
  const location = useLocation();
  const presetEmail = location.state?.email || "";

  const [email, setEmail] = useState(presetEmail);
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [step, setStep] = useState("verify");

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      setSubmitting(true);
      const response = await authService.verifyPasswordOtp({ email, otp });
      setResetToken(response?.resetToken || "");
      setStep("reset");
      setSuccess("OTP hợp lệ. Hãy đặt mật khẩu mới.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Xác minh OTP thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!resetToken) {
      setError("Vui lòng xác minh OTP trước.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu nhập lại không khớp.");
      return;
    }

    try {
      setSubmitting(true);
      const response = await authService.resetPassword({
        token: resetToken,
        password,
      });
      setSuccess(response?.message || "Đặt lại mật khẩu thành công.");
      setPassword("");
      setConfirmPassword("");
      setStep("done");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Đặt lại mật khẩu thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  const isVerifyStep = step === "verify";
  const isResetStep = step === "reset";
  const isDone = step === "done";

  return (
    <section className="auth-shell content-panel">
      <div>
        <p className="eyebrow">Tài khoản</p>
        <h1>Đặt lại mật khẩu</h1>
        <p>Nhập OTP từ Gmail để xác minh tài khoản, sau đó tạo mật khẩu mới.</p>
      </div>

      <form
        className="stacked-form"
        onSubmit={isVerifyStep ? handleVerifyOtp : handleResetPassword}
      >
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={!isVerifyStep}
          />
        </label>

        {isVerifyStep && (
          <label>
            OTP
            <input
              type="text"
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
            />
          </label>
        )}

        {isResetStep && (
          <>
            <label>
              Mật khẩu mới
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            <label>
              Nhập lại mật khẩu
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </label>
          </>
        )}

        {error && <p className="form-error">{error}</p>}
        {success && <p className="success-panel">{success}</p>}

        <button
          type="submit"
          className="primary-button"
          disabled={submitting || isDone}
        >
          {isVerifyStep && (submitting ? "Đang xác minh..." : "Xác minh OTP")}
          {isResetStep && (submitting ? "Đang cập nhật..." : "Đặt lại mật khẩu")}
          {isDone && "Hoàn tất"}
        </button>

        <p>
          Quay lại <Link to="/login">đăng nhập</Link>
        </p>
      </form>
    </section>
  );
}

export default ResetPasswordPage;
