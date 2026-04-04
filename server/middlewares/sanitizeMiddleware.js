const xss = require("xss");

// XSS options: strip all HTML tags and attributes from strings
const xssOptions = {
  whiteList: {}, // no tags allowed
  stripIgnoreTag: true,
  stripIgnoreTagBody: ["script", "style"],
};

const richTextOptions = {
  whiteList: {
    p: [],
    br: [],
    b: [],
    strong: [],
    i: [],
    em: [],
    u: [],
    s: [],
    blockquote: [],
    code: [],
    pre: [],
    ul: [],
    ol: [],
    li: [],
    h1: [],
    h2: [],
    h3: [],
    h4: [],
    a: ["href", "target", "rel"],
    span: ["class"],
  },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ["script", "style"],
};

const richTextKeys = new Set(["content", "excerpt"]);

const sanitizeValue = (value, key, req) => {
  if (typeof value === "string") {
    const isNewsRequest = req?.originalUrl?.startsWith("/api/news");
    const useRichText = isNewsRequest && richTextKeys.has(key);
    const options = useRichText ? richTextOptions : xssOptions;
    return xss(value, options).trim();
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, key, req));
  }

  if (value !== null && typeof value === "object") {
    return sanitizeObject(value, req);
  }

  return value;
};

const sanitizeObject = (obj, req) => {
  const result = {};

  for (const key of Object.keys(obj)) {
    result[key] = sanitizeValue(obj[key], key, req);
  }

  return result;
};

/**
 * Express middleware: recursively sanitizes all string values in req.body
 * to prevent stored XSS attacks.
 * Runs after express.json() so req.body is already parsed.
 */
const sanitizeInput = (req, _res, next) => {
  if (req.originalUrl?.startsWith("/api/preorders/vnpay/ipn")) {
    return next();
  }

  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body, req);
  }

  next();
};

module.exports = { sanitizeInput };
