import axios from "axios";

import { STORAGE_KEYS } from "../constants/storage";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

let refreshPromise = null;

// Attach JWT automatically for protected API calls.
api.interceptors.request.use((config) => {
  const storedAuth = localStorage.getItem(STORAGE_KEYS.AUTH);

  if (storedAuth) {
    try {
      const parsedAuth = JSON.parse(storedAuth);

      if (parsedAuth?.accessToken) {
        config.headers.Authorization = `Bearer ${parsedAuth.accessToken}`;
      }
    } catch (_error) {
      localStorage.removeItem(STORAGE_KEYS.AUTH);
    }
  }

  return config;
});

// Handle 401 responses and refresh token if possible
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip refresh logic for auth routes to avoid infinite loops
    const isAuthRoute = originalRequest.url?.includes("/users/refresh") ||
      originalRequest.url?.includes("/users/logout");

    // If 401 and not already retrying, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true;

      // Prevent multiple refresh attempts simultaneously
      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            const storedAuth = localStorage.getItem(STORAGE_KEYS.AUTH);
            if (!storedAuth) {
              throw new Error("No auth stored");
            }

            const parsedAuth = JSON.parse(storedAuth);
            if (!parsedAuth?.refreshToken) {
              throw new Error("No refresh token");
            }

            const { data } = await axios.post(
              `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/users/refresh`,
              { refreshToken: parsedAuth.refreshToken },
            );

            const updatedAuth = {
              ...parsedAuth,
              accessToken: data.accessToken,
              refreshToken: data.refreshToken || parsedAuth.refreshToken,
            };

            localStorage.setItem(
              STORAGE_KEYS.AUTH,
              JSON.stringify(updatedAuth),
            );

            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
            return api(originalRequest);
          } catch (_error) {
            // Clear auth and redirect to login
            localStorage.removeItem(STORAGE_KEYS.AUTH);
            window.location.href = "/login";
            throw _error;
          } finally {
            refreshPromise = null;
          }
        })();
      }

      return refreshPromise;
    }

    return Promise.reject(error);
  },
);

export default api;
