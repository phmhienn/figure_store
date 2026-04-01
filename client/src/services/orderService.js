import api from "./api";

const orderService = {
  createOrder: async (payload) => {
    const { data } = await api.post("/orders", payload);
    return data;
  },
  getMyOrders: async () => {
    const { data } = await api.get("/orders/my-orders");
    return data;
  },
  getAllOrders: async () => {
    const { data } = await api.get("/orders/admin");
    return data;
  },
  cancelOrder: async (orderId) => {
    const { data } = await api.put(`/orders/${orderId}/cancel`);
    return data;
  },
  updateStatus: async (orderId, status) => {
    const { data } = await api.put(`/orders/${orderId}/status`, { status });
    return data;
  },
  getOrdersByUser: async (userId) => {
    const { data } = await api.get(`/orders/user/${userId}`);
    return data;
  },
};

export default orderService;
