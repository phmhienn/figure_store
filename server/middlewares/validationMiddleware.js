const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  return Boolean(password) && password.length >= 8;
};

const validatePasswordLengthOnly = (password) => {
  return Boolean(password) && password.length >= 8;
};

const validatePhone = (phone) => {
  const phoneRegex = /^[0-9\s\-\+\(\)]{7,}$/;
  return phoneRegex.test(phone);
};

const validateUsername = (username) => {
  // Alphanumeric and underscore, 3-30 chars
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  return usernameRegex.test(username);
};

const validateRegister = (req, res, next) => {
  const { email, password, full_name, phone } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ message: "Invalid email format." });
  }

  if (!validatePassword(password)) {
    return res.status(400).json({
      message: "Password must be at least 8 characters.",
    });
  }

  if (phone && !validatePhone(phone)) {
    return res.status(400).json({ message: "Invalid phone format." });
  }

  if (full_name && (full_name.length < 2 || full_name.length > 100)) {
    return res
      .status(400)
      .json({ message: "Full name must be 2-100 characters." });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ message: "Invalid email format." });
  }

  next();
};

const validateForgotPassword = (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ message: "Invalid email format." });
  }

  next();
};

const validateResetPassword = (req, res, next) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res
      .status(400)
      .json({ message: "Token and password are required." });
  }

  if (!validatePassword(password)) {
    return res.status(400).json({
      message: "Password must be at least 8 characters.",
    });
  }

  next();
};

const validateVerifyOtp = (req, res, next) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required." });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ message: "Invalid email format." });
  }

  if (!/^[0-9]{4,8}$/.test(String(otp))) {
    return res.status(400).json({ message: "OTP format is invalid." });
  }

  next();
};

const validateUpdateProfile = (req, res, next) => {
  const { username, email, full_name, phone } = req.body;

  if (username && !validateUsername(username)) {
    return res
      .status(400)
      .json({ message: "Tên đăng nhập phải gồm 3-30 ký tự chữ hoặc số." });
  }

  if (email && !validateEmail(email)) {
    return res.status(400).json({ message: "Email không hợp lệ." });
  }

  if (phone && !validatePhone(phone)) {
    return res.status(400).json({ message: "Số điện thoại không hợp lệ." });
  }

  if (full_name && (full_name.length < 2 || full_name.length > 100)) {
    return res
      .status(400)
      .json({ message: "Họ và tên phải có độ dài 2-100 ký tự." });
  }

  next();
};

const validateChangePassword = (req, res, next) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({
      message:
        "Mật khẩu hiện tại, mật khẩu mới và xác nhận mật khẩu là bắt buộc.",
    });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      message: "Xác nhận mật khẩu không khớp.",
    });
  }

  if (!validatePasswordLengthOnly(newPassword)) {
    return res.status(400).json({
      message: "Mật khẩu mới phải có ít nhất 8 ký tự.",
    });
  }

  next();
};

const validateProductPayload = (req, res, next) => {
  const { name, price, stock_quantity } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ message: "Product name is required." });
  }

  if (name.length > 255) {
    return res
      .status(400)
      .json({ message: "Product name must be less than 255 characters." });
  }

  const numPrice = Number(price);
  if (isNaN(numPrice) || numPrice < 0) {
    return res
      .status(400)
      .json({ message: "Price must be a valid non-negative number." });
  }

  const numStock = Number(stock_quantity ?? 0);
  if (isNaN(numStock) || numStock < 0) {
    return res
      .status(400)
      .json({ message: "Stock quantity must be a valid non-negative number." });
  }

  next();
};

const validateNewsPayload = (req, res, next) => {
  const { title, slug, excerpt, content, status } = req.body;

  if (!title || title.trim().length === 0) {
    return res.status(400).json({ message: "News title is required." });
  }

  if (title.length > 255) {
    return res
      .status(400)
      .json({ message: "News title must be less than 255 characters." });
  }

  if (slug && slug.length > 255) {
    return res
      .status(400)
      .json({ message: "Slug must be less than 255 characters." });
  }

  if (excerpt && excerpt.length > 1000) {
    return res
      .status(400)
      .json({ message: "Excerpt must be less than 1000 characters." });
  }

  if (status && !["draft", "published"].includes(status)) {
    return res
      .status(400)
      .json({ message: "Status must be draft or published." });
  }

  if (status === "published") {
    const plainContent = String(content || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!plainContent) {
      return res
        .status(400)
        .json({ message: "Content is required to publish a post." });
    }
  }

  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateVerifyOtp,
  validateUpdateProfile,
  validateChangePassword,
  validateProductPayload,
  validateNewsPayload,
  validateEmail,
  validatePassword,
  validatePasswordLengthOnly,
  validatePhone,
  validateUsername,
};
