import api from "./api";

const productService = {
  // params: { page, limit, search, category, status }
  getAll: async (params = {}) => {
    const { data } = await api.get("/products", { params });

    // Support both response shapes: [] and { data: [], pagination: {} }
    if (Array.isArray(data)) {
      return { data, pagination: null };
    }

    if (Array.isArray(data?.data)) {
      return { data: data.data, pagination: data.pagination };
    }

    return { data: [], pagination: null };
  },
  getById: async (id) => {
    const { data } = await api.get(`/products/${id}`);
    return data;
  },
  create: async (payload) => {
    const { data } = await api.post("/products", payload);
    return data;
  },
  update: async (id, payload) => {
    const { data } = await api.put(`/products/${id}`, payload);
    return data;
  },
  remove: async (id) => {
    const { data } = await api.delete(`/products/${id}`);
    return data;
  },
};

export default productService;
