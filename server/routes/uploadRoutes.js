const express = require("express");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");
const { uploadProductImage, uploadNewsCover } = require("../config/upload");

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const productsBucket = process.env.SUPABASE_BUCKET_PRODUCTS || "products";
const newsBucket = process.env.SUPABASE_BUCKET_NEWS || "news";

const supabase =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey)
    : null;

const MIME_EXTENSION_MAP = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const ensureStorageConfigured = () => {
  if (supabase) {
    return;
  }

  const error = new Error(
    "Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
  );
  error.statusCode = 500;
  throw error;
};

const buildObjectPath = ({ file, prefix }) => {
  const ext =
    path.extname(file.originalname || "").toLowerCase() ||
    MIME_EXTENSION_MAP[file.mimetype] ||
    ".jpg";
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  return `${prefix}-${uniqueSuffix}${ext}`;
};

const uploadFileToBucket = async ({ bucket, file, prefix }) => {
  ensureStorageConfigured();

  const objectPath = buildObjectPath({ file, prefix });
  const { error } = await supabase.storage
    .from(bucket)
    .upload(objectPath, file.buffer, {
      contentType: file.mimetype,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);

  return {
    objectPath,
    imageUrl: data.publicUrl,
  };
};

const extractObjectPath = (rawInput, bucket) => {
  const decoded = decodeURIComponent(String(rawInput || "").trim());

  if (!decoded) {
    return "";
  }

  if (/^https?:\/\//i.test(decoded)) {
    try {
      const url = new URL(decoded);
      const marker = `/storage/v1/object/public/${bucket}/`;
      const markerIndex = url.pathname.indexOf(marker);

      if (markerIndex !== -1) {
        const objectPath = url.pathname.slice(markerIndex + marker.length);
        return objectPath.replace(/^\/+/, "");
      }

      const pathname = url.pathname.replace(/^\/+/, "");
      const segments = pathname.split("/");
      return segments[segments.length - 1] || "";
    } catch (_error) {
      return path.basename(decoded);
    }
  }

  return decoded.startsWith(`${bucket}/`)
    ? decoded.slice(bucket.length + 1)
    : path.basename(decoded);
};

const deleteFileFromBucket = async ({ bucket, fileRef }) => {
  ensureStorageConfigured();

  const objectPath = extractObjectPath(fileRef, bucket);

  if (!objectPath) {
    const error = new Error("File reference is required.");
    error.statusCode = 400;
    throw error;
  }

  const { error } = await supabase.storage.from(bucket).remove([objectPath]);

  if (error) {
    throw error;
  }

  return objectPath;
};

// POST /api/upload/product-image
// Admin only — accepts a single image file in field "image"
router.post(
  "/product-image",
  protect,
  authorizeRoles("admin"),
  uploadProductImage.single("image"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided." });
      }

      const { imageUrl } = await uploadFileToBucket({
        bucket: productsBucket,
        file: req.file,
        prefix: "product",
      });

      return res.status(201).json({ imageUrl });
    } catch (error) {
      return next(error);
    }
  },
);

// DELETE /api/upload/product-image/:filename
// Admin only — removes a previously uploaded file
router.delete(
  "/product-image/:filename",
  protect,
  authorizeRoles("admin"),
  async (req, res, next) => {
    try {
      await deleteFileFromBucket({
        bucket: productsBucket,
        fileRef: req.params.filename,
      });

      return res.json({ message: "File deleted." });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({ message: error.message });
      }

      return next(error);
    }
  },
);

// POST /api/upload/news-cover
// Admin only — accepts a single image file in field "image"
router.post(
  "/news-cover",
  protect,
  authorizeRoles("admin", "staff"),
  uploadNewsCover.single("image"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided." });
      }

      const { imageUrl } = await uploadFileToBucket({
        bucket: newsBucket,
        file: req.file,
        prefix: "news",
      });

      return res.status(201).json({ imageUrl });
    } catch (error) {
      return next(error);
    }
  },
);

// DELETE /api/upload/news-cover/:filename
// Admin only — removes a previously uploaded file
router.delete(
  "/news-cover/:filename",
  protect,
  authorizeRoles("admin", "staff"),
  async (req, res, next) => {
    try {
      await deleteFileFromBucket({
        bucket: newsBucket,
        fileRef: req.params.filename,
      });

      return res.json({ message: "File deleted." });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({ message: error.message });
      }

      return next(error);
    }
  },
);

module.exports = router;
