import api from "./api";

const newsService = {
  getPublished: async (params = {}) => {
    const { data } = await api.get("/news", { params });
    return Array.isArray(data) ? data : [];
  },
  getAdminList: async (params = {}) => {
    const { data } = await api.get("/news/admin", { params });
    return Array.isArray(data) ? data : [];
  },
  getById: async (id) => {
    const { data } = await api.get(`/news/${id}`);
    return data;
  },
  create: async (payload) => {
    const { data } = await api.post("/news", payload);
    return data;
  },
  update: async (id, payload) => {
    const { data } = await api.put(`/news/${id}`, payload);
    return data;
  },
  remove: async (id) => {
    const { data } = await api.delete(`/news/${id}`);
    return data;
  },
};

export default newsService;
