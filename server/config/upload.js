const multer = require("multer");

// Accept only images, max 5 MB
const fileFilter = (_req, file, cb) => {
  if (/^image\/(jpeg|jpg|png|webp|gif)$/i.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed (jpg, png, webp, gif)."), false);
  }
};

const buildUploader = () =>
  multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  });

const uploadProductImage = buildUploader();
const uploadNewsCover = buildUploader();

const upload = uploadProductImage;

module.exports = {
  upload,
  uploadProductImage,
  uploadNewsCover,
};
