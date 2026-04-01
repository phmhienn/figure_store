const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const userModel = require("../models/userModel");
const refreshTokenModel = require("../models/refreshTokenModel");
const {
  validateEmail,
  validatePassword,
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

const sanitizeUser = (user) => ({
  user_id: user.user_id,
  username: user.username,
  email: user.email,
  full_name: user.full_name,
  phone: user.phone,
  role: user.role,
  created_at: user.created_at,
});

const register = async (req, res, next) => {
  try {
    const { username, email, password, full_name, phone } = req.body;

    const existingEmail = await userModel.findByEmail(email);
    const existingUsername = await userModel.findByUsername(username);

    if (existingEmail || existingUsername) {
      return res
        .status(409)
        .json({ message: "Email or username already exists." });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await userModel.create({
      username,
      email,
      password_hash,
      full_name,
      phone,
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
        message:
          "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.",
      });
    }

    if (phone && !validatePhone(phone)) {
      return res.status(400).json({ message: "Invalid phone format." });
    }

    const existingEmail = await userModel.findByEmail(email);
    const existingUsername = await userModel.findByUsername(username);

    if (existingEmail || existingUsername) {
      return res
        .status(409)
        .json({ message: "Email or username already exists." });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await userModel.create({
      username,
      email,
      password_hash,
      full_name,
      phone,
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
        message:
          "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.",
      });
    }

    if (phone && !validatePhone(phone)) {
      return res.status(400).json({ message: "Invalid phone format." });
    }

    if (role && !["admin", "staff", "customer"].includes(role)) {
      return res.status(400).json({ message: "Invalid role." });
    }

    const payload = {
      username,
      email,
      full_name,
      phone,
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
  getCurrentUser,
  refreshAccessToken,
  logout,
  getAllUsers,
  createStaffUser,
  updateUser,
  deleteUser,
};
