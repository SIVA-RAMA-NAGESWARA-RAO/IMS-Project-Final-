import axios, { AxiosRequestConfig } from "axios";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// ─── In-memory token store ────────────────────────────────────────────────────
let _accessToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  _accessToken = token;
};

export const clearAuthToken = () => {
  _accessToken = null;
};

export const getAuthToken = () => _accessToken;

// ─── Axios instance ───────────────────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
});

// ─── Request interceptor: attach Bearer token ─────────────────────────────────
apiClient.interceptors.request.use((config) => {
  // Prefer in-memory token, fall back to localStorage
  const token = _accessToken || (typeof window !== "undefined" ? localStorage.getItem("ims_token") : null);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor: handle 401 gracefully ─────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest: AxiosRequestConfig & { _retry?: boolean } =
      error.config;

    const is401 = error.response?.status === 401;
    const isAuthEndpoint =
      originalRequest.url?.includes("/auth/refresh") ||
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/verify-login-otp");

    // If 401 on a normal request — try a silent refresh, then replay.
    if (is401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        const refreshRes = await apiClient.post("/auth/refresh");
        const newToken: string = refreshRes.data.accessToken;
        setAuthToken(newToken);
        if (typeof window !== "undefined") {
          localStorage.setItem("ims_token", newToken);
          localStorage.setItem("ims_user", JSON.stringify(refreshRes.data.user));
        }
        originalRequest.headers = originalRequest.headers ?? {};
        (originalRequest.headers as Record<string, string>)[
          "Authorization"
        ] = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch {
        clearAuthToken();
        if (typeof window !== "undefined") {
          localStorage.removeItem("ims_token");
          localStorage.removeItem("ims_user");
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
