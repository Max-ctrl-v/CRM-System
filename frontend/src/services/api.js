import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// In-memory token storage (not persisted to localStorage — secure against XSS)
let accessToken = null;

export function setAccessToken(token) {
  accessToken = token;
  scheduleTokenRefresh();
}

export function getAccessToken() {
  return accessToken;
}

export function clearAccessToken() {
  accessToken = null;
  if (refreshTimer) clearTimeout(refreshTimer);
}

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Send httpOnly cookies cross-origin
});

// Request interceptor — attach in-memory access token
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Proactive token refresh — refresh 5 min before expiry
let refreshTimer = null;

function scheduleTokenRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer);
  if (!accessToken) return;

  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    const expiresAt = payload.exp * 1000;
    const refreshAt = expiresAt - 5 * 60 * 1000; // 5 min before expiry
    const delay = Math.max(refreshAt - Date.now(), 10000); // at least 10s

    refreshTimer = setTimeout(async () => {
      try {
        // Cookie is sent automatically (withCredentials)
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, {}, { withCredentials: true });
        accessToken = data.accessToken;
        scheduleTokenRefresh();
      } catch {
        // Refresh failed — user will be prompted on next 401
      }
    }, delay);
  } catch {
    // Invalid token format — ignore
  }
}

// Token refresh queue — prevents race condition when multiple requests
// fail with 401 simultaneously (only one refresh at a time)
let refreshPromise = null;

async function refreshAccessToken() {
  // Refresh token is in httpOnly cookie — sent automatically
  const { data } = await axios.post(`${API_BASE}/auth/refresh`, {}, { withCredentials: true });
  accessToken = data.accessToken;
  scheduleTokenRefresh();
  return data.accessToken;
}

// Response interceptor — handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        // Queue concurrent refreshes behind the same promise
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null; });
        }
        const newToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        accessToken = null;
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
