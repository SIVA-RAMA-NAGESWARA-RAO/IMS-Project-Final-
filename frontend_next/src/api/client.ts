import axios, { AxiosRequestConfig } from "axios";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// ─── In-memory token store ────────────────────────────────────────────────────
// Never put the access token in localStorage — keep it in module scope so it
// survives component re-renders but is wiped on a full page reload (where
// AuthContext re-hydrates it from the httpOnly refresh cookie).
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
  withCredentials: true, // needed for the httpOnly refresh-token cookie
  headers: { "Content-Type": "application/json" },
  timeout: 15_000, // 15 s — prevents silent hangs
});

// ─── Request interceptor: attach Bearer token ─────────────────────────────────
apiClient.interceptors.request.use((config) => {
  if (_accessToken) {
    config.headers = config.headers ?? {};
    config.headers["Authorization"] = `Bearer ${_accessToken}`;
  }
  return config;
});

// ─── Response interceptor: silent token refresh on 401 ───────────────────────
let _isRefreshing = false;
let _refreshSubscribers: Array<(token: string | null) => void> = [];

function onRefreshed(token: string | null) {
  _refreshSubscribers.forEach((cb) => cb(token));
  _refreshSubscribers = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest: AxiosRequestConfig & { _retry?: boolean } =
      error.config;

    const is401 = error.response?.status === 401;
    const isRefreshEndpoint =
      originalRequest.url?.includes("/auth/refresh") ||
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/verify-login-otp");

    // If 401 on a normal request — try a silent refresh, then replay.
    if (is401 && !originalRequest._retry && !isRefreshEndpoint) {
      if (_isRefreshing) {
        // Queue behind the in-flight refresh
        return new Promise((resolve, reject) => {
          _refreshSubscribers.push((newToken) => {
            if (newToken) {
              originalRequest.headers = originalRequest.headers ?? {};
              (originalRequest.headers as Record<string, string>)[
                "Authorization"
              ] = `Bearer ${newToken}`;
              originalRequest._retry = true;
              resolve(apiClient(originalRequest));
            } else {
              reject(error);
            }
          });
        });
      }

      originalRequest._retry = true;
      _isRefreshing = true;

      try {
        const refreshRes = await apiClient.post("/auth/refresh");
        const newToken: string = refreshRes.data.accessToken;
        setAuthToken(newToken);
        onRefreshed(newToken);
        originalRequest.headers = originalRequest.headers ?? {};
        (originalRequest.headers as Record<string, string>)[
          "Authorization"
        ] = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        onRefreshed(null);
        clearAuthToken();
        // Redirect to login only in the browser
        if (
          typeof window !== "undefined" &&
          !window.location.pathname.startsWith("/login")
        ) {
          window.location.href = "/login";
        }
        return Promise.reject(refreshErr);
      } finally {
        _isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
