import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true, // required so the httpOnly refresh-token cookie is sent/received
});

// The access token lives in memory only — never localStorage — so an XSS
// payload reading localStorage can't walk away with a usable session.
// It's lost on full page reload by design; AuthContext re-acquires it via
// POST /auth/refresh (the refresh cookie survives reloads) on app mount.
let accessToken = null;
let onAuthFailure = () => {};

export const setAccessToken = (token) => {
  accessToken = token;
};
export const getAccessToken = () => accessToken;
export const setOnAuthFailure = (fn) => {
  onAuthFailure = fn;
};

client.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshPromise = null;

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error;

    // Never try to refresh in response to a failed refresh/login/register call itself.
    const isAuthEndpoint = config?.url?.includes('/auth/');

    if (response?.status === 401 && !config._retried && !isAuthEndpoint) {
      config._retried = true;
      try {
        // Multiple concurrent 401s should trigger exactly one refresh call.
        refreshPromise = refreshPromise || client.post('/auth/refresh');
        const { data } = await refreshPromise;
        refreshPromise = null;
        setAccessToken(data.accessToken);
        config.headers.Authorization = `Bearer ${data.accessToken}`;
        return client(config);
      } catch (refreshErr) {
        refreshPromise = null;
        setAccessToken(null);
        onAuthFailure();
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default client;
