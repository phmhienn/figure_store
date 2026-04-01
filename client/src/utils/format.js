export const formatCurrency = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const formatDate = (value) =>
  new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const orderStatusLabels = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  paid: "Đã thanh toán",
  shipping: "Đang giao",
  completed: "Giao thành công",
  cancelled: "Đã hủy",
};

const productStatusLabels = {
  active: "Đang bán",
  inactive: "Tạm ẩn",
};

const roleLabels = {
  admin: "Quản trị viên",
  staff: "Nhân viên",
  customer: "Thành viên",
  user: "Thành viên",
};

const categoryLabels = {
  "Scale Figure": "Figure tỉ lệ",
  "Premium Figure": "Figure cao cấp",
  Nendoroid: "Nendoroid",
  "Bunny Figure": "Figure thỏ",
  Statue: "Tượng trưng bày",
  "Action Figure": "Figure hành động",
  "Collector Figure": "Figure sưu tầm",
};

export const formatOrderStatus = (value) =>
  orderStatusLabels[value] || value || "Chưa cập nhật";

export const formatProductStatus = (value) =>
  productStatusLabels[value] || value || "Chưa cập nhật";

export const formatRole = (value) => roleLabels[value] || value || "Khách";

export const formatCategory = (value) =>
  categoryLabels[value] || value || "Figure anime";

// Inline SVG placeholder — works offline, never 404, no external request
export const IMAGE_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='640' viewBox='0 0 640 640'%3E%3Crect width='640' height='640' fill='%23f6dce0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='28' fill='%23c4697a'%3EFigure Image%3C/text%3E%3C/svg%3E";

export const resolveImageUrl = (value) => {
  const rawValue = String(value || "").trim();

  if (!rawValue) return IMAGE_FALLBACK;

  if (
    /^(https?:)?\/\//i.test(rawValue) ||
    rawValue.startsWith("data:") ||
    rawValue.startsWith("blob:")
  ) {
    return rawValue;
  }

  const normalizedPath = rawValue
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "")
    .replace(/^public\//i, "");

  return normalizedPath ? `/${normalizedPath}` : IMAGE_FALLBACK;
};
