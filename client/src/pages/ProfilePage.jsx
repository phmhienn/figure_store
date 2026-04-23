import { useEffect, useState } from "react";

import { useAuth } from "../context/AuthContext";
import authService from "../services/authService";
import orderService from "../services/orderService";
import { formatDate, formatRole } from "../utils/format";

function ProfilePage() {
  const { user, updateProfile, changePassword, isBootstrapping } = useAuth();
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordFieldErrors, setPasswordFieldErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [orderCount, setOrderCount] = useState(0);
  const [lastOrderAt, setLastOrderAt] = useState("");
  const [defaultAddress, setDefaultAddress] = useState(null);

  useEffect(() => {
    if (!user) return;
    setFormData({
      full_name: user.full_name || "",
      phone: user.phone || "",
      email: user.email || "",
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let isActive = true;

    const loadAddress = async () => {
      try {
        const response = await authService.getDefaultAddress();
        if (!isActive) return;
        setDefaultAddress(response?.address || null);
      } catch (_error) {
        if (!isActive) return;
        setDefaultAddress(null);
      }
    };

    loadAddress();

    return () => {
      isActive = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let isActive = true;

    const loadOrders = async () => {
      try {
        const orders = await orderService.getMyOrders();
        if (!isActive) return;
        const orderList = Array.isArray(orders) ? orders : [];
        setOrderCount(orderList.length);
        setLastOrderAt(orderList[0]?.created_at || "");
      } catch (_error) {
        if (!isActive) return;
        setOrderCount(0);
        setLastOrderAt("");
      }
    };

    loadOrders();

    return () => {
      isActive = false;
    };
  }, [user]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      setSubmitting(true);
      const response = await updateProfile(formData);
      setSuccess(response?.message || "Cập nhật thông tin thành công.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Cập nhật thông tin thất bại.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    const nextFieldErrors = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    };

    if (!passwordData.currentPassword.trim()) {
      nextFieldErrors.currentPassword = "Vui lòng nhập mật khẩu hiện tại.";
      setPasswordFieldErrors(nextFieldErrors);
      return;
    }

    if (!passwordData.newPassword.trim()) {
      nextFieldErrors.newPassword = "Vui lòng nhập mật khẩu mới.";
    }

    if (!passwordData.confirmPassword.trim()) {
      nextFieldErrors.confirmPassword = "Vui lòng nhập lại mật khẩu mới.";
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      nextFieldErrors.confirmPassword = "Mật khẩu nhập lại không khớp.";
    }

    setPasswordFieldErrors(nextFieldErrors);

    if (nextFieldErrors.newPassword || nextFieldErrors.confirmPassword) {
      return;
    }

    try {
      setPasswordSubmitting(true);
      const response = await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword,
      });
      setPasswordSuccess(response?.message || "Đổi mật khẩu thành công.");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordFieldErrors({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (requestError) {
      setPasswordError(
        requestError.response?.data?.message || "Đổi mật khẩu thất bại.",
      );
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const handlePasswordInputChange = (field) => (event) => {
    const nextValue = event.target.value;

    setPasswordData((current) => ({
      ...current,
      [field]: nextValue,
    }));

    setPasswordError("");
    setPasswordFieldErrors((current) => {
      const nextErrors = { ...current };

      if (nextValue.trim()) {
        nextErrors[field] = "";
      }

      if (
        field === "newPassword" &&
        current.confirmPassword === "Mật khẩu nhập lại không khớp."
      ) {
        nextErrors.confirmPassword = "";
      }

      return nextErrors;
    });
  };

  if (isBootstrapping) {
    return (
      <section className="content-panel">
        Đang tải thông tin tài khoản...
      </section>
    );
  }

  return (
    <section className="auth-shell content-panel">
      <div className="page-stack">
        <div>
          <p className="eyebrow">Tài khoản</p>
          <h1>Thông tin cá nhân</h1>
          <p>Cập nhật thông tin liên hệ và tài khoản của bạn.</p>
        </div>

        <div>
          <p className="eyebrow">Tổng quan</p>
          <div className="summary-box profile-summary">
            <div>
              <p className="eyebrow">Họ và tên</p>
              <strong>{user?.full_name || "Chưa cập nhật"}</strong>
            </div>
            <div>
              <p className="eyebrow">Email</p>
              <strong>{user?.email || "Chưa cập nhật"}</strong>
            </div>
            <div>
              <p className="eyebrow">Số điện thoại</p>
              <strong>{user?.phone || "Chưa cập nhật"}</strong>
            </div>
            <div>
              <p className="eyebrow">Vai trò</p>
              <strong>{formatRole(user?.role)}</strong>
            </div>
            <div>
              <p className="eyebrow">Địa chỉ mặc định</p>
              {defaultAddress ? (
                <div>
                  <strong>
                    {[
                      defaultAddress.address_line,
                      defaultAddress.city,
                      defaultAddress.country,
                    ]
                      .filter(Boolean)
                      .join(", ") || "Chưa cập nhật"}
                  </strong>
                  <small>
                    {[defaultAddress.receiver_name, defaultAddress.phone]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                </div>
              ) : (
                <strong>Chưa cập nhật</strong>
              )}
            </div>
            <div>
              <p className="eyebrow">Ngày tham gia</p>
              <strong>
                {user?.created_at
                  ? formatDate(user.created_at)
                  : "Chưa cập nhật"}
              </strong>
            </div>
            <div>
              <p className="eyebrow">Tổng đơn hàng</p>
              <strong>{orderCount}</strong>
            </div>
            <div>
              <p className="eyebrow">Đơn gần nhất</p>
              <strong>
                {lastOrderAt ? formatDate(lastOrderAt) : "Chưa có"}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div className="page-stack">
        <form className="stacked-form" onSubmit={handleSubmit}>
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
            <span className="input-hint">
              Số điện thoại phải bắt đầu bằng số 0.
            </span>
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

          {error && <p className="form-error">{error}</p>}
          {success && <p className="success-panel">{success}</p>}

          <button
            type="submit"
            className="primary-button"
            disabled={submitting}
          >
            {submitting ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </form>

        <div>
          <p className="eyebrow">Bảo mật</p>
          <h2>Đổi mật khẩu</h2>
          <p>Thay đổi mật khẩu đăng nhập để tăng bảo mật.</p>
        </div>

        <form
          className="stacked-form"
          onSubmit={handleChangePassword}
          noValidate
        >
          <label>
            Mật khẩu hiện tại
            <input
              type="password"
              value={passwordData.currentPassword}
              onChange={handlePasswordInputChange("currentPassword")}
            />
            {passwordFieldErrors.currentPassword && (
              <p className="form-error">
                {passwordFieldErrors.currentPassword}
              </p>
            )}
          </label>

          <label>
            Mật khẩu mới
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={handlePasswordInputChange("newPassword")}
              minLength={8}
            />
            <span className="input-hint">Ít nhất 8 ký tự.</span>
            {passwordFieldErrors.newPassword && (
              <p className="form-error">{passwordFieldErrors.newPassword}</p>
            )}
          </label>

          <label>
            Nhập lại mật khẩu mới
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={handlePasswordInputChange("confirmPassword")}
            />
            {passwordFieldErrors.confirmPassword && (
              <p className="form-error">
                {passwordFieldErrors.confirmPassword}
              </p>
            )}
          </label>

          {passwordError && <p className="form-error">{passwordError}</p>}
          {passwordSuccess && (
            <p className="success-panel">{passwordSuccess}</p>
          )}

          <button
            type="submit"
            className="primary-button"
            disabled={passwordSubmitting}
          >
            {passwordSubmitting ? "Đang đổi mật khẩu..." : "Đổi mật khẩu"}
          </button>
        </form>
      </div>
    </section>
  );
}

export default ProfilePage;
