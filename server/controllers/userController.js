const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const userModel = require("../models/userModel");
const addressModel = require("../models/addressModel");
const passwordResetTokenModel = require("../models/passwordResetTokenModel");
const refreshTokenModel = require("../models/refreshTokenModel");
const { sendPasswordResetOtpEmail } = require("../services/emailService");
const {
  validateEmail,
  validatePassword,
  validatePasswordLengthOnly,
  normalizePhone,
  validatePhone,
  validateUsername,
} = require("../middlewares/validationMiddleware");

const getAccessSecret = () => {
  const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET is not configured");
  }
  return secret;
};

const getRefreshSecret = () => {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_REFRESH_SECRET is not configured");
  }
  return secret;
};

const createAccessToken = (user) =>
  jwt.sign(
    {
      userId: user.user_id,
      role: user.role,
      email: user.email,
    },
    getAccessSecret(),
    {
      expiresIn: "1d",
    },
  );

const createRefreshToken = (user) =>
  jwt.sign(
    {
      userId: user.user_id,
    },
    getRefreshSecret(),
    {
      expiresIn: "30d",
    },
  );

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const getOtpLength = () => {
  const length = Number(process.env.PASSWORD_RESET_OTP_LENGTH || 6);
  if (!Number.isFinite(length) || length < 4) return 6;
  return Math.min(length, 8);
};

const getOtpTtlMs = () => {
  const minutes = Number(process.env.PASSWORD_RESET_OTP_TTL_MINUTES || 10);
  return minutes * 60 * 1000;
};

const getResetSessionTtlMs = () => {
  const minutes = Number(process.env.PASSWORD_RESET_SESSION_TTL_MINUTES || 10);
  return minutes * 60 * 1000;
};

const generateOtp = (length) => {
  const max = 10 ** length;
  return String(crypto.randomInt(0, max)).padStart(length, "0");
};

const sanitizeUser = (user) => ({
  user_id: user.user_id,
  username: user.username,
  email: user.email,
  full_name: user.full_name,
  phone: user.phone,
  role: user.role,
  created_at: user.created_at,
});

const normalizeOptionalPhone = (phone) => {
  const normalizedPhone = normalizePhone(phone);
  return normalizedPhone || null;
};

const normalizeUsernameSeed = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .toLowerCase();

const buildRegisterUsernameCandidate = ({ email, full_name, attempt = 0 }) => {
  const fullNameSeed = normalizeUsernameSeed(full_name);
  const emailLocalPart = String(email || "").split("@")[0];
  const emailSeed = normalizeUsernameSeed(emailLocalPart);
  const baseSeed = fullNameSeed || emailSeed || "user";
  const suffix = `${Date.now().toString(36).slice(-4)}${Math.random()
    .toString(36)
    .slice(2, 6)}${attempt}`;
  const maxBaseLength = Math.max(3, 30 - suffix.length - 1);
  const safeBase = baseSeed.slice(0, maxBaseLength) || "user";

  return `${safeBase}_${suffix}`;
};

const createUniqueRegisterUsername = async ({ email, full_name }) => {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = buildRegisterUsernameCandidate({
      email,
      full_name,
      attempt,
    });
    const existingUser = await userModel.findByUsername(candidate);
    if (!existingUser) {
      return candidate;
    }
  }

  throw new Error("Unable to generate a unique username.");
};

const register = async (req, res, next) => {
  try {
    const { email, password, full_name, phone } = req.body;
    const cleanEmail = String(email || "").trim();
    const cleanPhone = phone ? normalizeOptionalPhone(phone) : null;

    const existingEmail = await userModel.findByEmail(cleanEmail);

    if (existingEmail) {
      return res.status(409).json({ message: "Email already exists." });
    }

    if (cleanPhone) {
      const existingPhone = await userModel.findByPhone(cleanPhone);
      if (existingPhone) {
        return res.status(409).json({ message: "Số điện thoại đã tồn tại." });
      }
    }

    const username = await createUniqueRegisterUsername({
      email: cleanEmail,
      full_name,
    });

    const password_hash = await bcrypt.hash(password, 10);
    const user = await userModel.create({
      username,
      email: cleanEmail,
      password_hash,
      full_name,
      phone: cleanPhone,
      role: "customer",
    });

    const refreshToken = createRefreshToken(user);
    await refreshTokenModel.create({
      user_id: user.user_id,
      token_hash: hashToken(refreshToken),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    return res.status(201).json({
      message: "Register successful.",
      accessToken: createAccessToken(user),
      refreshToken,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = String(email || "").trim();

    console.log(
      `[DEBUG] Login attempt: email="${cleanEmail}" (raw count: ${String(email).length}), password length: ${String(password).length}`,
    );

    const user = await userModel.findByEmail(cleanEmail);

    if (!user) {
      console.log(`[DEBUG] No user found for email: ${cleanEmail}`);
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    console.log(`[DEBUG] Password match: ${isMatch}`);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const refreshToken = createRefreshToken(user);
    await refreshTokenModel.create({
      user_id: user.user_id,
      token_hash: hashToken(refreshToken),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    return res.json({
      message: "Login successful.",
      accessToken: createAccessToken(user),
      refreshToken,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const cleanEmail = String(email || "").trim();

    const user = await userModel.findByEmail(cleanEmail);

    if (!user) {
      return res.json({
        message: "If the email exists, an OTP has been sent.",
      });
    }

    const otpLength = getOtpLength();
    const otp = generateOtp(otpLength);
    const tokenHash = hashToken(otp);

    await passwordResetTokenModel.deleteAllForUser(user.user_id);
    await passwordResetTokenModel.create({
      user_id: user.user_id,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + getOtpTtlMs()),
    });

    await sendPasswordResetOtpEmail({
      to: user.email,
      otp,
      ttlMinutes: Math.round(getOtpTtlMs() / 60000),
    });

    return res.json({
      message: "If the email exists, an OTP has been sent.",
    });
  } catch (error) {
    return next(error);
  }
};

const verifyPasswordOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const cleanEmail = String(email || "").trim();
    const cleanOtp = String(otp || "").trim();

    const user = await userModel.findByEmail(cleanEmail);
    if (!user) {
      return res.status(400).json({ message: "OTP không hợp lệ." });
    }

    const tokenHash = hashToken(cleanOtp);
    const storedToken = await passwordResetTokenModel.findByHash(tokenHash);

    if (!storedToken || storedToken.user_id !== user.user_id) {
      return res.status(400).json({ message: "OTP không hợp lệ." });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    await passwordResetTokenModel.deleteAllForUser(user.user_id);
    await passwordResetTokenModel.create({
      user_id: user.user_id,
      token_hash: hashToken(resetToken),
      expires_at: new Date(Date.now() + getResetSessionTtlMs()),
    });

    return res.json({ resetToken });
  } catch (error) {
    return next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const tokenHash = hashToken(String(token || ""));

    const storedToken = await passwordResetTokenModel.findByHash(tokenHash);

    if (!storedToken) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token." });
    }

    const user = await userModel.findById(storedToken.user_id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const password_hash = await bcrypt.hash(password, 10);
    await userModel.update(user.user_id, { password_hash });
    await passwordResetTokenModel.deleteAllForUser(user.user_id);
    await refreshTokenModel.deleteAllForUser(user.user_id);

    return res.json({ message: "Password reset successful." });
  } catch (error) {
    return next(error);
  }
};

const refreshAccessToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required." });
    }

    // Verify JWT signature and expiry
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, getRefreshSecret());
    } catch (_error) {
      return res
        .status(401)
        .json({ message: "Invalid or expired refresh token." });
    }

    // Check token exists in database (revocation check)
    const tokenHash = hashToken(refreshToken);
    const storedToken = await refreshTokenModel.findByHash(tokenHash);

    if (!storedToken) {
      return res
        .status(401)
        .json({ message: "Refresh token has been revoked." });
    }

    const user = await userModel.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Rotate: delete old token and create new one
    await refreshTokenModel.deleteByHash(tokenHash);
    const newRefreshToken = createRefreshToken(user);
    await refreshTokenModel.create({
      user_id: user.user_id,
      token_hash: hashToken(newRefreshToken),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    return res.json({
      accessToken: createAccessToken(user),
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    return next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await refreshTokenModel.deleteByHash(hashToken(refreshToken));
    }

    return res.json({ message: "Logged out successfully." });
  } catch (error) {
    return next(error);
  }
};

const getCurrentUser = async (req, res, next) => {
  try {
    const user = await userModel.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json(sanitizeUser(user));
  } catch (error) {
    return next(error);
  }
};

const updateCurrentUser = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { username, email, full_name, phone } = req.body;
    const hasPhoneField = Object.prototype.hasOwnProperty.call(
      req.body,
      "phone",
    );
    const cleanPhone = hasPhoneField
      ? normalizeOptionalPhone(phone)
      : undefined;

    if (!username && !email && !full_name && !hasPhoneField) {
      return res.status(400).json({ message: "Không có thay đổi nào." });
    }

    const existingUser = await userModel.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }

    if (username && username !== existingUser.username) {
      const existingUsername = await userModel.findByUsername(username);
      if (existingUsername) {
        return res.status(409).json({ message: "Tên đăng nhập đã tồn tại." });
      }
    }

    if (email && email !== existingUser.email) {
      const existingEmail = await userModel.findByEmail(email);
      if (existingEmail) {
        return res.status(409).json({ message: "Email đã tồn tại." });
      }
    }

    if (hasPhoneField && cleanPhone && cleanPhone !== existingUser.phone) {
      const existingPhone = await userModel.findByPhone(cleanPhone);
      if (existingPhone && existingPhone.user_id !== userId) {
        return res.status(409).json({ message: "Số điện thoại đã tồn tại." });
      }
    }

    const updatedUser = await userModel.update(userId, {
      username,
      email,
      full_name,
      phone: cleanPhone,
    });

    return res.json({
      message: "Cập nhật thông tin thành công.",
      user: sanitizeUser(updatedUser),
    });
  } catch (error) {
    return next(error);
  }
};

const getDefaultAddress = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const address = await addressModel.findDefaultByUserId(userId);
    return res.json({ address });
  } catch (error) {
    return next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: "Mật khẩu hiện tại không đúng." });
    }

    if (currentPassword === newPassword) {
      return res
        .status(400)
        .json({ message: "Mật khẩu mới phải khác mật khẩu hiện tại." });
    }

    if (!validatePasswordLengthOnly(newPassword)) {
      return res
        .status(400)
        .json({ message: "Mật khẩu mới phải có ít nhất 8 ký tự." });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Xác nhận mật khẩu không khớp." });
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    await userModel.update(userId, { password_hash });
    await refreshTokenModel.deleteAllForUser(userId);

    return res.json({ message: "Đổi mật khẩu thành công." });
  } catch (error) {
    return next(error);
  }
};

const getAllUsers = async (_req, res, next) => {
  try {
    const users = await userModel.findAll();
    return res.json(users.map(sanitizeUser));
  } catch (error) {
    return next(error);
  }
};

const createStaffUser = async (req, res, next) => {
  try {
    const { username, email, password, full_name, phone, role } = req.body;
    const normalizedRole = role === "admin" ? "admin" : "staff";
    const cleanPhone = phone ? normalizeOptionalPhone(phone) : null;

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ message: "Username, email and password are required." });
    }

    if (!validateUsername(username)) {
      return res
        .status(400)
        .json({ message: "Username must be 3-30 alphanumeric characters." });
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
      return res.status(400).json({
        message: "Phone must start with 0 and contain digits only.",
      });
    }

    const existingEmail = await userModel.findByEmail(email);
    const existingUsername = await userModel.findByUsername(username);
    const existingPhone = cleanPhone
      ? await userModel.findByPhone(cleanPhone)
      : null;

    if (existingEmail || existingUsername || existingPhone) {
      return res.status(409).json({
        message: "Email, username or phone already exists.",
      });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await userModel.create({
      username,
      email,
      password_hash,
      full_name,
      phone: cleanPhone,
      role: normalizedRole,
    });

    return res.status(201).json(sanitizeUser(user));
  } catch (error) {
    return next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const { username, email, password, full_name, phone, role } = req.body;
    const hasPhoneField = Object.prototype.hasOwnProperty.call(
      req.body,
      "phone",
    );
    const cleanPhone = hasPhoneField
      ? normalizeOptionalPhone(phone)
      : undefined;

    if (username && !validateUsername(username)) {
      return res
        .status(400)
        .json({ message: "Username must be 3-30 alphanumeric characters." });
    }

    if (email && !validateEmail(email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    if (password && !validatePassword(password)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters.",
      });
    }

    if (phone && !validatePhone(phone)) {
      return res.status(400).json({
        message: "Phone must start with 0 and contain digits only.",
      });
    }

    if (cleanPhone) {
      const existingPhone = await userModel.findByPhone(cleanPhone);
      if (existingPhone && existingPhone.user_id !== userId) {
        return res
          .status(409)
          .json({ message: "Phone number already exists." });
      }
    }

    if (role && !["admin", "staff", "customer"].includes(role)) {
      return res.status(400).json({ message: "Invalid role." });
    }

    const payload = {
      username,
      email,
      full_name,
      phone: cleanPhone,
      role,
    };

    if (password) {
      payload.password_hash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await userModel.update(userId, payload);

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json(sanitizeUser(updatedUser));
  } catch (error) {
    return next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const userId = Number(req.params.id);

    if (req.user.userId === userId) {
      return res.status(400).json({ message: "You cannot delete yourself." });
    }

    const deleted = await userModel.delete(userId);

    if (!deleted) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({ message: "User deleted successfully." });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  verifyPasswordOtp,
  resetPassword,
  getCurrentUser,
  updateCurrentUser,
  getDefaultAddress,
  changePassword,
  refreshAccessToken,
  logout,
  getAllUsers,
  createStaffUser,
  updateUser,
  deleteUser,
};
