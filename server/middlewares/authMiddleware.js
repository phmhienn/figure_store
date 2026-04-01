const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized. Missing token." });
  }

  try {
    const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ message: "Server configuration error." });
    }
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Unauthorized. Invalid token." });
  }
};

module.exports = {
  protect,
};
