const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  // At least 8 characters, one uppercase, one lowercase, one digit
  if (!password || password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
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
  const { username, email, password, full_name, phone } = req.body;

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
  validateProductPayload,
  validateNewsPayload,
  validateEmail,
  validatePassword,
  validatePhone,
  validateUsername,
};
