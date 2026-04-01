const fs = require("fs");
const path = require("path");
const multer = require("multer");

const PRODUCTS_UPLOADS_DIR = path.join(__dirname, "..", "uploads", "products");
const NEWS_UPLOADS_DIR = path.join(__dirname, "..", "uploads", "news");

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

ensureDir(PRODUCTS_UPLOADS_DIR);
ensureDir(NEWS_UPLOADS_DIR);

const buildStorage = (dir, prefix) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${prefix}-${uniqueSuffix}${ext}`);
    },
  });

// Accept only images, max 5 MB
const fileFilter = (_req, file, cb) => {
  if (/^image\/(jpeg|jpg|png|webp|gif)$/i.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed (jpg, png, webp, gif)."), false);
  }
};

const buildUploader = (storage) =>
  multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  });

const uploadProductImage = buildUploader(
  buildStorage(PRODUCTS_UPLOADS_DIR, "product"),
);
const uploadNewsCover = buildUploader(buildStorage(NEWS_UPLOADS_DIR, "news"));

const upload = uploadProductImage;

module.exports = {
  upload,
  uploadProductImage,
  uploadNewsCover,
  UPLOADS_DIR: PRODUCTS_UPLOADS_DIR,
  PRODUCTS_UPLOADS_DIR,
  NEWS_UPLOADS_DIR,
};
