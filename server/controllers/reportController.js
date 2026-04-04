const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

const reportModel = require("../models/reportModel");

const formatDateOnly = (date) => date.toISOString().slice(0, 10);

const parseDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const endOfDay = (date) =>
  new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );

const resolveDateRange = (fromParam, toParam) => {
  const now = new Date();
  const fallbackFrom = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);

  let from = parseDate(fromParam) || fallbackFrom;
  let to = parseDate(toParam) || now;

  if (from > to) {
    const swap = from;
    from = to;
    to = swap;
  }

  return {
    from: startOfDay(from),
    to: endOfDay(to),
  };
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const sendPdf = (res, filename, render) => {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.pipe(res);
  render(doc);
  doc.end();
};

const sendExcel = async (res, filename, buildWorkbook) => {
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const workbook = new ExcelJS.Workbook();
  buildWorkbook(workbook);
  await workbook.xlsx.write(res);
  res.end();
};

const ALLOWED_STATUSES = [
  "pending",
  "confirmed",
  "paid",
  "shipping",
  "completed",
  "cancelled",
];

const parseStatuses = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return ["completed"];
  const items = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const filtered = items.filter((item) => ALLOWED_STATUSES.includes(item));
  return filtered.length ? filtered : ["completed"];
};

const getRevenueReport = async (req, res, next) => {
  try {
    const group = ["day", "month", "year"].includes(req.query.group)
      ? req.query.group
      : "day";
    const { from, to } = resolveDateRange(req.query.from, req.query.to);

    const statuses = parseStatuses(req.query.statuses || req.query.status);
    const series = await reportModel.getRevenueSeries({
      group,
      from,
      to,
      statuses,
    });

    const totalRevenue = series.reduce(
      (sum, row) => sum + Number(row.total_revenue || 0),
      0,
    );
    const totalOrders = series.reduce(
      (sum, row) => sum + Number(row.order_count || 0),
      0,
    );

    return res.json({
      group,
      from: formatDateOnly(from),
      to: formatDateOnly(to),
      totalRevenue,
      totalOrders,
      statuses,
      series,
    });
  } catch (error) {
    return next(error);
  }
};

const getTopProductsReport = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const { from, to } = resolveDateRange(req.query.from, req.query.to);

    const statuses = parseStatuses(req.query.statuses || req.query.status);
    const items = await reportModel.getTopProducts({
      from,
      to,
      limit,
      statuses,
    });

    return res.json({
      from: formatDateOnly(from),
      to: formatDateOnly(to),
      limit,
      statuses,
      items,
    });
  } catch (error) {
    return next(error);
  }
};

const getInventoryReport = async (req, res, next) => {
  try {
    const lowStock = Math.min(Math.max(Number(req.query.lowStock) || 5, 1), 99);

    const summary = await reportModel.getInventorySummary({ lowStock });
    const items = await reportModel.getInventoryItems();

    return res.json({
      lowStock,
      summary,
      items,
    });
  } catch (error) {
    return next(error);
  }
};

const exportRevenueReport = async (req, res, next) => {
  try {
    const format = req.query.format === "excel" ? "excel" : "pdf";
    const group = ["day", "month", "year"].includes(req.query.group)
      ? req.query.group
      : "day";
    const { from, to } = resolveDateRange(req.query.from, req.query.to);
    const fromLabel = formatDateOnly(from);
    const toLabel = formatDateOnly(to);

    const statuses = parseStatuses(req.query.statuses || req.query.status);
    const series = await reportModel.getRevenueSeries({
      group,
      from,
      to,
      statuses,
    });
    const totalRevenue = series.reduce(
      (sum, row) => sum + Number(row.total_revenue || 0),
      0,
    );

    if (format === "excel") {
      const filename = `revenue-report-${group}-${fromLabel}-${toLabel}.xlsx`;
      return sendExcel(res, filename, (workbook) => {
        const sheet = workbook.addWorksheet("Revenue");
        sheet.columns = [
          { header: "Ky", key: "period", width: 16 },
          { header: "So don", key: "order_count", width: 12 },
          { header: "Doanh thu", key: "total_revenue", width: 18 },
        ];

        series.forEach((row) => {
          sheet.addRow({
            period: row.period,
            order_count: row.order_count,
            total_revenue: row.total_revenue,
          });
        });

        sheet.addRow({});
        sheet.addRow({
          period: "Tong",
          order_count: series.reduce(
            (sum, row) => sum + Number(row.order_count || 0),
            0,
          ),
          total_revenue: totalRevenue,
        });
      });
    }

    const filename = `revenue-report-${group}-${fromLabel}-${toLabel}.pdf`;
    return sendPdf(res, filename, (doc) => {
      doc.fontSize(18).text("Bao cao doanh thu", { align: "left" });
      doc.moveDown(0.4);
      doc.fontSize(11).text(`Tu ${fromLabel} den ${toLabel}`);
      doc.fontSize(10).text(`Trang thai: ${statuses.join(", ")}`);
      doc.moveDown(0.6);
      doc.fontSize(12).text(`Tong doanh thu: ${formatCurrency(totalRevenue)}`);
      doc.moveDown(0.6);

      doc.fontSize(10).text("Ky | So don | Doanh thu");
      doc.moveDown(0.2);
      series.forEach((row) => {
        doc.text(
          `${row.period} | ${row.order_count} | ${formatCurrency(
            row.total_revenue,
          )}`,
        );
      });
    });
  } catch (error) {
    return next(error);
  }
};

const exportTopProductsReport = async (req, res, next) => {
  try {
    const format = req.query.format === "excel" ? "excel" : "pdf";
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const { from, to } = resolveDateRange(req.query.from, req.query.to);
    const fromLabel = formatDateOnly(from);
    const toLabel = formatDateOnly(to);

    const statuses = parseStatuses(req.query.statuses || req.query.status);
    const items = await reportModel.getTopProducts({
      from,
      to,
      limit,
      statuses,
    });

    if (format === "excel") {
      const filename = `top-products-${fromLabel}-${toLabel}.xlsx`;
      return sendExcel(res, filename, (workbook) => {
        const sheet = workbook.addWorksheet("TopProducts");
        sheet.columns = [
          { header: "San pham", key: "name", width: 36 },
          { header: "So luong", key: "total_quantity", width: 12 },
          { header: "Doanh thu", key: "total_revenue", width: 18 },
        ];

        items.forEach((row) => {
          sheet.addRow({
            name: row.name,
            total_quantity: row.total_quantity,
            total_revenue: row.total_revenue,
          });
        });
      });
    }

    const filename = `top-products-${fromLabel}-${toLabel}.pdf`;
    return sendPdf(res, filename, (doc) => {
      doc.fontSize(18).text("San pham ban chay", { align: "left" });
      doc.moveDown(0.4);
      doc.fontSize(11).text(`Tu ${fromLabel} den ${toLabel}`);
      doc.fontSize(10).text(`Trang thai: ${statuses.join(", ")}`);
      doc.moveDown(0.6);
      doc.fontSize(10).text("San pham | So luong | Doanh thu");
      doc.moveDown(0.2);
      items.forEach((row) => {
        doc.text(
          `${row.name} | ${row.total_quantity} | ${formatCurrency(
            row.total_revenue,
          )}`,
        );
      });
    });
  } catch (error) {
    return next(error);
  }
};

const exportInventoryReport = async (req, res, next) => {
  try {
    const format = req.query.format === "excel" ? "excel" : "pdf";
    const lowStock = Math.min(Math.max(Number(req.query.lowStock) || 5, 1), 99);

    const summary = await reportModel.getInventorySummary({ lowStock });
    const items = await reportModel.getInventoryItems();

    if (format === "excel") {
      const filename = "inventory-report.xlsx";
      return sendExcel(res, filename, (workbook) => {
        const sheet = workbook.addWorksheet("Inventory");
        sheet.columns = [
          { header: "San pham", key: "name", width: 36 },
          { header: "Ton kho", key: "stock_quantity", width: 12 },
          { header: "Gia", key: "price", width: 14 },
          { header: "Trang thai", key: "status", width: 14 },
        ];

        items.forEach((row) => {
          sheet.addRow({
            name: row.name,
            stock_quantity: row.stock_quantity,
            price: row.price,
            status: row.status,
          });
        });

        sheet.addRow({});
        sheet.addRow({
          name: "Tong",
          stock_quantity: summary.total_stock,
          price: "",
          status: "",
        });
      });
    }

    const filename = "inventory-report.pdf";
    return sendPdf(res, filename, (doc) => {
      doc.fontSize(18).text("Thong ke ton kho", { align: "left" });
      doc.moveDown(0.4);
      doc.fontSize(11).text(`Ton kho: ${summary.total_stock}`);
      doc.fontSize(11).text(`Het hang: ${summary.out_of_stock}`);
      doc.fontSize(11).text(`Sap het: ${summary.low_stock}`);
      doc.moveDown(0.6);
      doc.fontSize(10).text("San pham | Ton kho | Gia | Trang thai");
      doc.moveDown(0.2);
      items.forEach((row) => {
        doc.text(
          `${row.name} | ${row.stock_quantity} | ${formatCurrency(
            row.price,
          )} | ${row.status}`,
        );
      });
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getRevenueReport,
  getTopProductsReport,
  getInventoryReport,
  exportRevenueReport,
  exportTopProductsReport,
  exportInventoryReport,
};
