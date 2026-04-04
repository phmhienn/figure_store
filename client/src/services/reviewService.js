import api from "./api";

const reviewService = {
  getByProduct: async (productId) => {
    const { data } = await api.get(`/reviews/product/${productId}`);
    return data;
  },
  getEligibility: async (productId) => {
    const { data } = await api.get(`/reviews/eligibility/${productId}`);
    return data;
  },
  create: async (payload) => {
    const { data } = await api.post("/reviews", payload);
    return data;
  },
};

export default reviewService;
