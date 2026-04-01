// Simple memory-based rate limiter without external dependencies.
// In production, use Redis for distributed systems.

const createRateLimiter = (maxRequests = 100, windowMs = 60000) => {
  const store = new Map();

  // Periodic cleanup every 60 seconds to prevent memory leaks
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    const windowStart = now - windowMs;

    for (const [ipKey, timestamps] of store.entries()) {
      const activeRequests = timestamps.filter(
        (timestamp) => timestamp > windowStart,
      );

      if (activeRequests.length === 0) {
        store.delete(ipKey);
      } else {
        store.set(ipKey, activeRequests);
      }
    }
  }, 60000);

  // Allow the process to exit cleanly even if the interval is running
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!store.has(key)) {
      store.set(key, []);
    }

    const requests = store
      .get(key)
      .filter((timestamp) => timestamp > windowStart);
    store.set(key, requests);

    if (requests.length >= maxRequests) {
      return res.status(429).json({
        message: "Too many requests, please try again later.",
        retryAfter: Math.ceil((requests[0] + windowMs - now) / 1000),
      });
    }

    requests.push(now);
    store.set(key, requests);

    next();
  };
};

// Specific limiters
const authLimiter = createRateLimiter(100, 900000); // Increased for dev: 100 per 15 mins
const apiLimiter = createRateLimiter(1000, 60000); // 1000 requests per minute
const createProductLimiter = createRateLimiter(100, 3600000); // 100 per hour

module.exports = {
  authLimiter,
  apiLimiter,
  createProductLimiter,
  createRateLimiter,
};
