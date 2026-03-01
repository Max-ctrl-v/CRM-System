import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Proactive token refresh — refresh 10 min before expiry
let refreshTimer = null;

function scheduleTokenRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer);
  const token = localStorage.getItem('accessToken');
  if (!token) return;

  try {
    // Decode JWT payload (base64) to read exp
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiresAt = payload.exp * 1000;
    const refreshAt = expiresAt - 10 * 60 * 1000; // 10 min before expiry
    const delay = Math.max(refreshAt - Date.now(), 30000); // at least 30s

    refreshTimer = setTimeout(async () => {
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) return;
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        scheduleTokenRefresh(); // schedule next refresh
      } catch {
        // Refresh failed — user will be prompted on next 401
      }
    }, delay);
  } catch {
    // Invalid token format — ignore
  }
}

// Start proactive refresh on load if token exists
scheduleTokenRefresh();

// Token refresh queue — prevents race condition when multiple requests
// fail with 401 simultaneously (only one refresh at a time)
let refreshPromise = null;

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) throw new Error('No refresh token');
  const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
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
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

// Re-schedule refresh when tokens are stored (called after login)
export function onTokensStored() {
  scheduleTokenRefresh();
}

export default api;
