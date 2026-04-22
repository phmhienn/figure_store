import api from "./api";

const authService = {
  register: async (payload) => {
    const { data } = await api.post("/users/register", payload);
    return data;
  },
  login: async (payload) => {
    const { data } = await api.post("/users/login", payload);
    return data;
  },
  requestPasswordReset: async (email) => {
    const { data } = await api.post("/users/forgot-password", { email });
    return data;
  },
  verifyPasswordOtp: async ({ email, otp }) => {
    const { data } = await api.post("/users/verify-otp", { email, otp });
    return data;
  },
  resetPassword: async ({ token, password }) => {
    const { data } = await api.post("/users/reset-password", {
      token,
      password,
    });
    return data;
  },
  updateProfile: async (payload) => {
    const { data } = await api.put("/users/me", payload);
    return data;
  },
  changePassword: async ({ currentPassword, newPassword, confirmPassword }) => {
    const { data } = await api.put("/users/me/password", {
      currentPassword,
      newPassword,
      confirmPassword,
    });
    return data;
  },
  getCurrentUser: async () => {
    const { data } = await api.get("/users/me");
    return data;
  },
  getDefaultAddress: async () => {
    const { data } = await api.get("/users/me/address");
    return data;
  },
  refreshAccessToken: async (refreshToken) => {
    const { data } = await api.post("/users/refresh", { refreshToken });
    return data;
  },
  logout: async (refreshToken) => {
    // Best-effort: revoke the refresh token server-side.
    // If this fails (e.g. network error), local auth is still cleared.
    try {
      await api.post("/users/logout", { refreshToken });
    } catch (_error) {
      // silent — local state will still be cleared by AuthContext
    }
  },
};

export default authService;
