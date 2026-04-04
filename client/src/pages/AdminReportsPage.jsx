import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import reportService from "../services/reportService";
import {
  formatCurrency,
  resolveImageUrl,
  IMAGE_FALLBACK,
} from "../utils/format";

const getDateInputValue = (date) => date.toISOString().slice(0, 10);

const getDefaultRange = () => {
  const today = new Date();
  const from = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
  return {
    from: getDateInputValue(from),
    to: getDateInputValue(today),
  };
};

const getPresetRange = (days) => {
  const today = new Date();
  const from = new Date(today.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  return {
    from: getDateInputValue(from),
    to: getDateInputValue(today),
  };
};

const formatCompactNumber = (value) =>
  new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));

const formatDateTime = (value) =>
  new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const STATUS_OPTIONS = [
  { value: "completed", label: "Hoàn tất" },
  { value: "paid", label: "Đã thanh toán" },
  { value: "shipping", label: "Đang giao" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "pending", label: "Chờ xác nhận" },
  { value: "cancelled", label: "Đã hủy" },
];

const RANGE_PRESETS = [
  { value: 7, label: "7 ngày" },
  { value: 30, label: "30 ngày" },
  { value: 90, label: "90 ngày" },
];

const ORDER_STATUS_LABELS = {
  completed: "Hoàn tất",
  paid: "Đã thanh toán",
  shipping: "Đang giao",
  confirmed: "Đã xác nhận",
  pending: "Chờ xác nhận",
  cancelled: "Đã hủy",
};

const PRODUCT_STATUS_LABELS = {
  active: "Đang bán",
  inactive: "Tạm ẩn",
};

const getSafeStatuses = (statuses) =>
  statuses.length ? statuses : ["completed"];

const getInventoryLevel = (quantity, threshold) => {
  if (quantity <= 0) return { label: "Hết hàng", className: "sold-out" };
  if (quantity <= threshold) {
    return { label: "Sắp hết", className: "low-stock" };
  }
  return { label: "Ổn định", className: "healthy" };
};

function AdminReportsPage() {
  const defaultRange = getDefaultRange();
  const [revenueParams, setRevenueParams] = useState({
    group: "day",
    from: defaultRange.from,
    to: defaultRange.to,
  });
  const [topParams, setTopParams] = useState({
    limit: 8,
    from: defaultRange.from,
    to: defaultRange.to,
  });
  const [inventoryParams, setInventoryParams] = useState({ lowStock: 5 });
  const [statusFilters, setStatusFilters] = useState(["completed"]);
  const [activePreset, setActivePreset] = useState(30);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const [revenueData, setRevenueData] = useState({
    series: [],
    totalRevenue: 0,
    totalOrders: 0,
  });
  const [topData, setTopData] = useState({ items: [] });
  const [inventoryData, setInventoryData] = useState({ summary: null, items: [] });

  const [loading, setLoading] = useState({
    revenue: false,
    top: false,
    inventory: false,
    export: "",
    refreshAll: false,
  });
  const [error, setError] = useState({ revenue: "", top: "", inventory: "" });

  const fetchRevenue = async (
    nextParams = revenueParams,
    nextStatuses = statusFilters,
  ) => {
    setLoading((prev) => ({ ...prev, revenue: true }));
    setError((prev) => ({ ...prev, revenue: "" }));

    try {
      const statuses = getSafeStatuses(nextStatuses);
      const data = await reportService.getRevenue({
        ...nextParams,
        statuses: statuses.join(","),
      });
      setRevenueData(data);
      return true;
    } catch (_err) {
      setError((prev) => ({
        ...prev,
        revenue: "Không thể tải báo cáo doanh thu.",
      }));
      return false;
    } finally {
      setLoading((prev) => ({ ...prev, revenue: false }));
    }
  };

  const fetchTopProducts = async (
    nextParams = topParams,
    nextStatuses = statusFilters,
  ) => {
    setLoading((prev) => ({ ...prev, top: true }));
    setError((prev) => ({ ...prev, top: "" }));

    try {
      const statuses = getSafeStatuses(nextStatuses);
      const data = await reportService.getTopProducts({
        ...nextParams,
        statuses: statuses.join(","),
      });
      setTopData(data);
      return true;
    } catch (_err) {
      setError((prev) => ({
        ...prev,
        top: "Không thể tải thống kê sản phẩm bán chạy.",
      }));
      return false;
    } finally {
      setLoading((prev) => ({ ...prev, top: false }));
    }
  };

  const fetchInventory = async (nextParams = inventoryParams) => {
    setLoading((prev) => ({ ...prev, inventory: true }));
    setError((prev) => ({ ...prev, inventory: "" }));

    try {
      const data = await reportService.getInventory(nextParams);
      setInventoryData(data);
      return true;
    } catch (_err) {
      setError((prev) => ({
        ...prev,
        inventory: "Không thể tải thống kê tồn kho.",
      }));
      return false;
    } finally {
      setLoading((prev) => ({ ...prev, inventory: false }));
    }
  };

  const fetchAllReports = async () => {
    setLoading((prev) => ({ ...prev, refreshAll: true }));

    try {
      await Promise.all([
        fetchRevenue(revenueParams, statusFilters),
        fetchTopProducts(topParams, statusFilters),
        fetchInventory(inventoryParams),
      ]);
      setLastUpdatedAt(new Date());
    } finally {
      setLoading((prev) => ({ ...prev, refreshAll: false }));
    }
  };

  useEffect(() => {
    void fetchAllReports();
  }, []);

  const handleExportRevenue = async (format) => {
    setLoading((prev) => ({ ...prev, export: "revenue" }));
    try {
      const statuses = getSafeStatuses(statusFilters);
      const blob = await reportService.exportRevenue({
        ...revenueParams,
        format,
        statuses: statuses.join(","),
      });
      const filename = `bao-cao-doanh-thu-${revenueParams.group}-${revenueParams.from}-${revenueParams.to}.${format === "excel" ? "xlsx" : "pdf"}`;
      downloadBlob(blob, filename);
    } finally {
      setLoading((prev) => ({ ...prev, export: "" }));
    }
  };

  const handleExportTopProducts = async (format) => {
    setLoading((prev) => ({ ...prev, export: "top" }));
    try {
      const statuses = getSafeStatuses(statusFilters);
      const blob = await reportService.exportTopProducts({
        ...topParams,
        format,
        statuses: statuses.join(","),
      });
      const filename = `top-san-pham-${topParams.from}-${topParams.to}.${format === "excel" ? "xlsx" : "pdf"}`;
      downloadBlob(blob, filename);
    } finally {
      setLoading((prev) => ({ ...prev, export: "" }));
    }
  };

  const handleExportInventory = async (format) => {
    setLoading((prev) => ({ ...prev, export: "inventory" }));
    try {
      const blob = await reportService.exportInventory({
        ...inventoryParams,
        format,
      });
      const filename = `ton-kho-${inventoryParams.lowStock}.${format === "excel" ? "xlsx" : "pdf"}`;
      downloadBlob(blob, filename);
    } finally {
      setLoading((prev) => ({ ...prev, export: "" }));
    }
  };

  const toggleStatus = (value) => {
    setStatusFilters((prev) =>
      prev.includes(value)
        ? prev.filter((status) => status !== value)
        : [...prev, value],
    );
  };

  const handleRangePreset = async (days) => {
    const nextRange = getPresetRange(days);
    const nextRevenueParams = { ...revenueParams, ...nextRange };
    const nextTopParams = { ...topParams, ...nextRange };

    setActivePreset(days);
    setRevenueParams(nextRevenueParams);
    setTopParams(nextTopParams);

    await Promise.all([
      fetchRevenue(nextRevenueParams, statusFilters),
      fetchTopProducts(nextTopParams, statusFilters),
    ]);
    setLastUpdatedAt(new Date());
  };

  const revenueSeries = revenueData.series || [];
  const topItems = topData.items || [];
  const inventoryItems = inventoryData.items || [];
  const selectedStatuses = getSafeStatuses(statusFilters);
  const selectedStatusLabels = STATUS_OPTIONS.filter((option) =>
    selectedStatuses.includes(option.value),
  ).map((option) => option.label);

  const revenueMax = Math.max(1, ...revenueSeries.map((row) => Number(row.total_revenue || 0)));
  const topMax = Math.max(1, ...topItems.map((row) => Number(row.total_quantity || 0)));
  const totalUnitsSold = topItems.reduce((sum, item) => sum + Number(item.total_quantity || 0), 0);
  const averageOrderValue = revenueData.totalOrders
    ? revenueData.totalRevenue / revenueData.totalOrders
    : 0;
  const bestRevenuePeriod = revenueSeries.reduce(
    (best, row) =>
      Number(row.total_revenue || 0) > Number(best?.total_revenue || 0)
        ? row
        : best,
    revenueSeries[0] || null,
  );
  const bestProduct = topItems[0] || null;
  const inventorySummary = inventoryData.summary || {
    total_products: 0,
    total_stock: 0,
    out_of_stock: 0,
    low_stock: 0,
  };
  const inventoryHealth = inventorySummary.total_products
    ? Math.round(
        ((inventorySummary.total_products - inventorySummary.low_stock) /
          inventorySummary.total_products) *
          100,
      )
    : 0;
  const urgentInventoryItems = inventoryItems
    .filter((item) => item.stock_quantity <= inventoryParams.lowStock)
    .slice(0, 4);

  return (
    <div className="admin-layout">
      <section className="content-panel report-hero-panel">
        <div className="report-hero-top">
          <div className="report-hero-copy">
            <p className="eyebrow">Khu vực quản trị</p>
            <h1>Thống kê & báo cáo</h1>
            <p className="report-hero-description">
              Tổng hợp doanh thu, sản phẩm bán chạy và tồn kho trong cùng một
              màn hình để theo dõi vận hành nhanh hơn.
            </p>
          </div>

          <div className="report-hero-actions">
            <Link to="/admin" className="ghost-button">Bảng điều khiển</Link>
            <Link to="/admin/orders" className="ghost-button">Quản trị đơn hàng</Link>
            <Link to="/admin/products" className="ghost-button">Quản trị sản phẩm</Link>
            <button
              type="button"
              className="primary-button"
              onClick={fetchAllReports}
              disabled={loading.refreshAll}
            >
              {loading.refreshAll ? "Đang làm mới..." : "Làm mới tất cả"}
            </button>
          </div>
        </div>

        <div className="report-overview-grid">
          <article className="report-overview-card report-overview-card--revenue">
            <span className="report-overview-label">Doanh thu hiện tại</span>
            <strong className="report-overview-value">{formatCurrency(revenueData.totalRevenue)}</strong>
            <p>
              {revenueData.totalOrders} đơn {ORDER_STATUS_LABELS.completed.toLowerCase()} trong khoảng {revenueParams.from} - {revenueParams.to}
            </p>
          </article>

          <article className="report-overview-card">
            <span className="report-overview-label">Giá trị đơn trung bình</span>
            <strong className="report-overview-value">{formatCurrency(averageOrderValue)}</strong>
            <p>
              {bestRevenuePeriod ? `Kỳ tốt nhất: ${bestRevenuePeriod.period}` : "Chưa có kỳ doanh thu nổi bật"}
            </p>
          </article>

          <article className="report-overview-card">
            <span className="report-overview-label">Sản phẩm đang dẫn đầu</span>
            <strong className="report-overview-value">{bestProduct ? bestProduct.name : "Chưa có dữ liệu"}</strong>
            <p>
              {bestProduct ? `${bestProduct.total_quantity} sản phẩm đã bán` : "Cần áp dụng bộ lọc để xem kết quả"}
            </p>
          </article>

          <article className="report-overview-card report-overview-card--inventory">
            <span className="report-overview-label">Sức khỏe tồn kho</span>
            <strong className="report-overview-value">{inventoryHealth}%</strong>
            <p>
              {inventorySummary.low_stock} / {inventorySummary.total_products} sản phẩm đang cần theo dõi
            </p>
          </article>
        </div>

        <div className="report-overview-footer">
          <div className="report-preset-row">
            {RANGE_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                className={`report-preset-chip ${activePreset === preset.value ? "active" : ""}`}
                onClick={() => handleRangePreset(preset.value)}
                disabled={loading.revenue || loading.top}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="report-context-meta">
            <span>
              Trạng thái đang tính: <strong>{selectedStatusLabels.join(", ") || "Hoàn tất"}</strong>
            </span>
            <span>
              Cập nhật gần nhất: <strong>{lastUpdatedAt ? formatDateTime(lastUpdatedAt) : "Đang tải dữ liệu"}</strong>
            </span>
          </div>
        </div>
      </section>

      <section className="content-panel report-section-panel">
        <div className="report-section-head">
          <div>
            <span className="report-section-kicker">Revenue</span>
            <h2>Doanh thu theo ngày / tháng / năm</h2>
            <p className="report-table-note">
              Theo dõi biến động doanh thu theo từng chu kỳ và xuất file ngay từ bộ lọc hiện tại.
            </p>
          </div>
          <div className="report-section-stats">
            <div>
              <span className="report-mini-label">Tổng doanh thu</span>
              <strong>{formatCurrency(revenueData.totalRevenue)}</strong>
            </div>
            <div>
              <span className="report-mini-label">Đơn hoàn tất</span>
              <strong>{formatCompactNumber(revenueData.totalOrders)}</strong>
            </div>
          </div>
        </div>

        <div className="report-filter-shell">
          <div className="report-status-filters">
            <span className="report-filter-label">Trạng thái đơn được tính</span>
            <div className="report-status-grid">
              {STATUS_OPTIONS.map((option) => (
                <label key={option.value} className="report-checkbox">
                  <input
                    type="checkbox"
                    checked={statusFilters.includes(option.value)}
                    onChange={() => toggleStatus(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="report-filters">
            <label>
              Từ ngày
              <input
                type="date"
                value={revenueParams.from}
                onChange={(event) => {
                  setActivePreset(0);
                  setRevenueParams((prev) => ({ ...prev, from: event.target.value }));
                }}
              />
            </label>
            <label>
              Đến ngày
              <input
                type="date"
                value={revenueParams.to}
                onChange={(event) => {
                  setActivePreset(0);
                  setRevenueParams((prev) => ({ ...prev, to: event.target.value }));
                }}
              />
            </label>
            <label>
              Nhóm
              <select
                value={revenueParams.group}
                onChange={(event) =>
                  setRevenueParams((prev) => ({ ...prev, group: event.target.value }))
                }
              >
                <option value="day">Ngày</option>
                <option value="month">Tháng</option>
                <option value="year">Năm</option>
              </select>
            </label>
            <div className="report-actions">
              <button
                type="button"
                className="primary-button compact-button"
                onClick={async () => {
                  await fetchRevenue();
                  setLastUpdatedAt(new Date());
                }}
                disabled={loading.revenue}
              >
                {loading.revenue ? "Đang tải..." : "Áp dụng"}
              </button>
              <button
                type="button"
                className="ghost-button compact-button"
                onClick={() => handleExportRevenue("pdf")}
                disabled={loading.export === "revenue"}
              >
                Xuất PDF
              </button>
              <button
                type="button"
                className="ghost-button compact-button"
                onClick={() => handleExportRevenue("excel")}
                disabled={loading.export === "revenue"}
              >
                Xuất Excel
              </button>
            </div>
          </div>
        </div>

        {error.revenue && <p className="error-panel">{error.revenue}</p>}

        <div className="report-summary-grid">
          <div className="report-summary-card">
            <span className="report-summary-label">Tổng doanh thu</span>
            <strong className="report-summary-value">{formatCurrency(revenueData.totalRevenue)}</strong>
          </div>
          <div className="report-summary-card">
            <span className="report-summary-label">Giá trị đơn trung bình</span>
            <strong className="report-summary-value">{formatCurrency(averageOrderValue)}</strong>
          </div>
          <div className="report-summary-card">
            <span className="report-summary-label">Kỳ cao nhất</span>
            <strong className="report-summary-value">{bestRevenuePeriod?.period || "--"}</strong>
          </div>
        </div>

        <div className="report-chart-card">
          <div className="report-chart-head">
            <div>
              <span className="report-mini-label">Biểu đồ cột</span>
              <h3>Xu hướng doanh thu</h3>
            </div>
            <p>
              Hiển thị theo nhóm <strong>{revenueParams.group}</strong> trong khoảng <strong>{revenueParams.from}</strong> đến <strong>{revenueParams.to}</strong>.
            </p>
          </div>

          {revenueSeries.length ? (
            <div className="report-chart">
              <div className="report-chart-bars">
                {revenueSeries.map((row) => {
                  const height = (Number(row.total_revenue || 0) / revenueMax) * 100;
                  return (
                    <div key={row.period} className="report-chart-bar">
                      <span className="report-chart-value">{formatCompactNumber(row.total_revenue)}</span>
                      <div
                        className="report-bar"
                        style={{ height: `${Math.max(height, 8)}%` }}
                        title={`${row.period} - ${formatCurrency(row.total_revenue)}`}
                      />
                      <span className="report-chart-label">{row.period}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="report-empty-state">
              <strong>Chưa có dữ liệu doanh thu</strong>
              <p>Thử mở rộng khoảng ngày hoặc bổ sung thêm trạng thái đơn.</p>
            </div>
          )}
        </div>

        <div className="table-shell">
          <table className="admin-table report-table">
            <thead>
              <tr>
                <th>Kỳ</th>
                <th>Số đơn</th>
                <th className="numeric">Doanh thu</th>
              </tr>
            </thead>
            <tbody>
              {revenueSeries.length ? (
                revenueSeries.map((row) => (
                  <tr key={row.period}>
                    <td>{row.period}</td>
                    <td>{row.order_count}</td>
                    <td className="numeric">{formatCurrency(row.total_revenue)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3}>{loading.revenue ? "Đang tải..." : "Chưa có dữ liệu phù hợp."}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="content-panel report-section-panel">
        <div className="report-section-head">
          <div>
            <span className="report-section-kicker">Best Sellers</span>
            <h2>Sản phẩm bán chạy</h2>
            <p className="report-table-note">
              Tập trung vào nhóm sản phẩm tạo doanh thu và sản lượng tốt nhất trong khoảng đã chọn.
            </p>
          </div>
          <div className="report-section-stats">
            <div>
              <span className="report-mini-label">Tổng số lượng bán</span>
              <strong>{formatCompactNumber(totalUnitsSold)}</strong>
            </div>
            <div>
              <span className="report-mini-label">Top hiển thị</span>
              <strong>{topParams.limit}</strong>
            </div>
          </div>
        </div>

        <div className="report-filter-shell">
          <div className="report-status-filters">
            <span className="report-filter-label">Trạng thái đơn được tính</span>
            <div className="report-status-grid">
              {STATUS_OPTIONS.map((option) => (
                <label key={option.value} className="report-checkbox">
                  <input
                    type="checkbox"
                    checked={statusFilters.includes(option.value)}
                    onChange={() => toggleStatus(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="report-filters">
            <label>
              Từ ngày
              <input
                type="date"
                value={topParams.from}
                onChange={(event) => {
                  setActivePreset(0);
                  setTopParams((prev) => ({ ...prev, from: event.target.value }));
                }}
              />
            </label>
            <label>
              Đến ngày
              <input
                type="date"
                value={topParams.to}
                onChange={(event) => {
                  setActivePreset(0);
                  setTopParams((prev) => ({ ...prev, to: event.target.value }));
                }}
              />
            </label>
            <label>
              Top
              <input
                type="number"
                min="1"
                max="50"
                value={topParams.limit}
                onChange={(event) =>
                  setTopParams((prev) => ({ ...prev, limit: Number(event.target.value || 1) }))
                }
              />
            </label>
            <div className="report-actions">
              <button
                type="button"
                className="primary-button compact-button"
                onClick={async () => {
                  await fetchTopProducts();
                  setLastUpdatedAt(new Date());
                }}
                disabled={loading.top}
              >
                {loading.top ? "Đang tải..." : "Áp dụng"}
              </button>
              <button
                type="button"
                className="ghost-button compact-button"
                onClick={() => handleExportTopProducts("pdf")}
                disabled={loading.export === "top"}
              >
                Xuất PDF
              </button>
              <button
                type="button"
                className="ghost-button compact-button"
                onClick={() => handleExportTopProducts("excel")}
                disabled={loading.export === "top"}
              >
                Xuất Excel
              </button>
            </div>
          </div>
        </div>

        {error.top && <p className="error-panel">{error.top}</p>}

        {topItems.length ? (
          <div className="report-top-grid">
            {topItems.slice(0, 3).map((item, index) => (
              <article key={item.product_id} className="report-top-card">
                <span className="report-top-rank">Top {index + 1}</span>
                <div className="report-top-media">
                  <img
                    src={resolveImageUrl(item.image_url)}
                    alt={item.name}
                    onError={(event) => {
                      event.currentTarget.src = IMAGE_FALLBACK;
                      event.currentTarget.onerror = null;
                    }}
                  />
                </div>
                <div className="report-top-copy">
                  <strong>{item.name}</strong>
                  <span>{item.total_quantity} sản phẩm đã bán</span>
                  <p>{formatCurrency(item.total_revenue)}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="report-empty-state compact">
            <strong>Chưa có sản phẩm nổi bật</strong>
            <p>Không có mặt hàng nào phù hợp với bộ lọc hiện tại.</p>
          </div>
        )}

        <div className="report-bar-list">
          {topItems.map((item) => {
            const width = (Number(item.total_quantity || 0) / topMax) * 100;
            return (
              <div key={item.product_id} className="report-bar-row">
                <span className="report-bar-name">{item.name}</span>
                <div className="report-bar-track">
                  <span
                    className="report-bar-fill"
                    style={{ width: `${Math.max(width, 6)}%` }}
                  />
                </div>
                <span className="report-bar-value">{item.total_quantity}</span>
              </div>
            );
          })}
        </div>

        <div className="table-shell">
          <table className="admin-table report-table">
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Số lượng</th>
                <th className="numeric">Doanh thu</th>
              </tr>
            </thead>
            <tbody>
              {topItems.length ? (
                topItems.map((item) => (
                  <tr key={item.product_id}>
                    <td>
                      <div className="report-product-cell">
                        <img
                          src={resolveImageUrl(item.image_url)}
                          alt={item.name}
                          onError={(event) => {
                            event.currentTarget.src = IMAGE_FALLBACK;
                            event.currentTarget.onerror = null;
                          }}
                        />
                        <strong>{item.name}</strong>
                      </div>
                    </td>
                    <td>{item.total_quantity}</td>
                    <td className="numeric">{formatCurrency(item.total_revenue)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3}>{loading.top ? "Đang tải..." : "Chưa có dữ liệu phù hợp."}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="content-panel report-section-panel">
        <div className="report-section-head">
          <div>
            <span className="report-section-kicker">Inventory</span>
            <h2>Thống kê tồn kho</h2>
            <p className="report-table-note">
              Ưu tiên nhìn ra mặt hàng sắp hết, hết hàng và tình trạng danh mục đang bán.
            </p>
          </div>
          <div className="report-section-stats">
            <div>
              <span className="report-mini-label">Tổng tồn kho</span>
              <strong>{formatCompactNumber(inventorySummary.total_stock)}</strong>
            </div>
            <div>
              <span className="report-mini-label">Ngưỡng cảnh báo</span>
              <strong>{inventoryParams.lowStock}</strong>
            </div>
          </div>
        </div>

        <div className="report-filter-shell">
          <div className="report-inline-note">
            <strong>Cảnh báo tồn kho</strong>
            <p>
              Sản phẩm có số lượng nhỏ hơn hoặc bằng ngưỡng sẽ được đưa vào nhóm cần theo dõi.
            </p>
          </div>

          <div className="report-filters report-filters--inventory">
            <label>
              Ngưỡng sắp hết
              <input
                type="number"
                min="1"
                max="99"
                value={inventoryParams.lowStock}
                onChange={(event) =>
                  setInventoryParams((prev) => ({ ...prev, lowStock: Number(event.target.value || 1) }))
                }
              />
            </label>
            <div className="report-actions">
              <button
                type="button"
                className="primary-button compact-button"
                onClick={async () => {
                  await fetchInventory();
                  setLastUpdatedAt(new Date());
                }}
                disabled={loading.inventory}
              >
                {loading.inventory ? "Đang tải..." : "Áp dụng"}
              </button>
              <button
                type="button"
                className="ghost-button compact-button"
                onClick={() => handleExportInventory("pdf")}
                disabled={loading.export === "inventory"}
              >
                Xuất PDF
              </button>
              <button
                type="button"
                className="ghost-button compact-button"
                onClick={() => handleExportInventory("excel")}
                disabled={loading.export === "inventory"}
              >
                Xuất Excel
              </button>
            </div>
          </div>
        </div>

        {error.inventory && <p className="error-panel">{error.inventory}</p>}

        <div className="report-summary-grid">
          <div className="report-summary-card">
            <span className="report-summary-label">Tổng sản phẩm</span>
            <strong className="report-summary-value">{inventorySummary.total_products}</strong>
          </div>
          <div className="report-summary-card">
            <span className="report-summary-label">Tổng tồn kho</span>
            <strong className="report-summary-value">{inventorySummary.total_stock}</strong>
          </div>
          <div className="report-summary-card">
            <span className="report-summary-label">Hết hàng</span>
            <strong className="report-summary-value">{inventorySummary.out_of_stock}</strong>
          </div>
          <div className="report-summary-card">
            <span className="report-summary-label">Sắp hết</span>
            <strong className="report-summary-value">{inventorySummary.low_stock}</strong>
          </div>
        </div>

        {urgentInventoryItems.length ? (
          <div className="report-alert-grid">
            {urgentInventoryItems.map((item) => {
              const inventoryLevel = getInventoryLevel(item.stock_quantity, inventoryParams.lowStock);
              return (
                <article key={item.product_id} className="report-alert-card">
                  <div className="report-alert-head">
                    <strong>{item.name}</strong>
                    <span className={`stock-chip ${inventoryLevel.className}`}>{inventoryLevel.label}</span>
                  </div>
                  <p>{item.brand || item.category || "Chưa cập nhật nhóm hàng"}</p>
                  <span>Còn lại {item.stock_quantity} sản phẩm</span>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="report-empty-state compact">
            <strong>Tồn kho đang ổn định</strong>
            <p>Không có sản phẩm nào nằm trong ngưỡng cảnh báo hiện tại.</p>
          </div>
        )}

        <div className="table-shell">
          <table className="admin-table report-table">
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Tồn kho</th>
                <th className="numeric">Giá</th>
                <th>Mức tồn</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {inventoryItems.length ? (
                inventoryItems.map((item) => {
                  const inventoryLevel = getInventoryLevel(item.stock_quantity, inventoryParams.lowStock);
                  return (
                    <tr key={item.product_id}>
                      <td>
                        <div className="report-product-cell">
                          <img
                            src={resolveImageUrl(item.image_url)}
                            alt={item.name}
                            onError={(event) => {
                              event.currentTarget.src = IMAGE_FALLBACK;
                              event.currentTarget.onerror = null;
                            }}
                          />
                          <div>
                            <strong>{item.name}</strong>
                            <p>{item.brand || "Chưa cập nhật thương hiệu"}</p>
                          </div>
                        </div>
                      </td>
                      <td>{item.stock_quantity}</td>
                      <td className="numeric">{formatCurrency(item.price)}</td>
                      <td>
                        <span className={`stock-chip ${inventoryLevel.className}`}>{inventoryLevel.label}</span>
                      </td>
                      <td>
                        <span className={`status-chip ${item.status || ""}`}>
                          {PRODUCT_STATUS_LABELS[item.status] || item.status || "Chưa cập nhật"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5}>{loading.inventory ? "Đang tải..." : "Chưa có dữ liệu phù hợp."}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default AdminReportsPage;
