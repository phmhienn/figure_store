const cacheMiddleware = (req, res, next) => {
  // Set cache headers based on file type
  if (req.path.includes("/api/")) {
    // API responses - no cache (or cache for short time)
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  } else if (
    req.path.match(/\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp)$/)
  ) {
    // Static assets - cache for 1 year (immutable)
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  } else if (req.path === "/" || req.path.match(/\.html$/)) {
    // HTML pages - cache for 1 hour (or no-cache for index.html)
    res.setHeader("Cache-Control", "public, max-age=3600");
  }

  next();
};

module.exports = {
  cacheMiddleware,
};
