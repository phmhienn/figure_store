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
  getCurrentUser: async () => {
    const { data } = await api.get("/users/me");
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
