import api from "./api";

const preorderService = {
  create: async (payload) => {
    const { data } = await api.post("/preorders", payload);
    return data;
  },
  lookup: async ({ code, phone }) => {
    const { data } = await api.get("/preorders/lookup", {
      params: { code, phone },
    });
    return data;
  },
  getMine: async () => {
    const { data } = await api.get("/preorders/my");
    return data;
  },
  getAll: async () => {
    const { data } = await api.get("/preorders/admin");
    return data;
  },
  updateStatus: async (id, status) => {
    const { data } = await api.put(`/preorders/${id}/status`, { status });
    return data;
  },
};

export default preorderService;
