import api from "./api";

const reportService = {
  getRevenue: async (params) => {
    const { data } = await api.get("/reports/revenue", { params });
    return data;
  },
  getTopProducts: async (params) => {
    const { data } = await api.get("/reports/top-products", { params });
    return data;
  },
  getInventory: async (params) => {
    const { data } = await api.get("/reports/inventory", { params });
    return data;
  },
  exportRevenue: async (params) => {
    const { data } = await api.get("/reports/revenue/export", {
      params,
      responseType: "blob",
    });
    return data;
  },
  exportTopProducts: async (params) => {
    const { data } = await api.get("/reports/top-products/export", {
      params,
      responseType: "blob",
    });
    return data;
  },
  exportInventory: async (params) => {
    const { data } = await api.get("/reports/inventory/export", {
      params,
      responseType: "blob",
    });
    return data;
  },
};

export default reportService;
