import api from "./api";

const userService = {
  getAll: async () => {
    const { data } = await api.get("/users/admin");
    return Array.isArray(data) ? data : [];
  },
  createStaff: async (payload) => {
    const { data } = await api.post("/users/admin", payload);
    return data;
  },
  updateUser: async (id, payload) => {
    const { data } = await api.put(`/users/admin/${id}`, payload);
    return data;
  },
  removeUser: async (id) => {
    const { data } = await api.delete(`/users/admin/${id}`);
    return data;
  },
};

export default userService;
