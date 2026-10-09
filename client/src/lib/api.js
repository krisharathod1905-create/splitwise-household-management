import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

const api = axios.create({
  baseURL: `${BASE_URL}/api/v1/`,
  withCredentials: true,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── Request Interceptor — attach access token ────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (err) => Promise.reject(err)
);

// ─── Response Interceptor — handle token refresh ──────────────────────────────
let isRefreshing = false;
let pendingQueue = [];

const processQueue = (error, token = null) => {
  pendingQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  pendingQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !originalRequest.url?.includes("/auth/login")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await api.post("/auth/refresh");
        const newToken = response.data.data.accessToken;
        localStorage.setItem("accessToken", newToken);
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem("accessToken");
        window.dispatchEvent(new CustomEvent("auth:logout"));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// ─── API helpers ─────────────────────────────────────────────────────────────

export const authApi = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  googleLogin: (idToken) => api.post("/auth/google", { idToken }),
  refresh: () => api.post("/auth/refresh"),
  logout: () => api.post("/auth/logout"),
  getMe: () => api.get("/auth/me"),
  updateProfile: (data) => api.patch("/auth/me", data),
};

export const officeApi = {
  list: (params) => api.get("/offices", { params }),
  getAll: (params) => api.get("/offices", { params }),
  getById: (id) => api.get(`/offices/${id}`),
  getServices: (id) => api.get(`/offices/${id}/services`),
  getLiveStatus: (id) => api.get(`/offices/${id}/live`),
  createOffice: (data) => api.post("/offices", data),
  updateOffice: (id, data) => api.patch(`/offices/${id}`, data),
  createService: (officeId, data) => api.post(`/offices/${officeId}/services`, data),
  updateService: (serviceId, data) => api.patch(`/offices/services/${serviceId}`, data),
};

export const tokenApi = {
  issue: (data) => api.post("/tokens/issue", data),
  getMyTokens: (params) => api.get("/tokens/my", { params }),
  getById: (id) => api.get(`/tokens/${id}`),
  cancel: (id) => api.post(`/tokens/${id}/cancel`),
  checkIn: (id, data) => api.post(`/tokens/${id}/checkin`, data),
  getHistory: (params) => api.get("/tokens/history", { params }),
  getLiveQueueStatus: (officeId, serviceId) =>
    api.get(`/tokens/queue/${officeId}/${serviceId}/live`),
  getPrediction: (officeId, serviceId) =>
    api.get(`/tokens/queue/${officeId}/${serviceId}/live`),
};


export const staffApi = {
  getQueue: (officeId) => api.get("/tokens/staff/queue", { params: { officeId } }),
  callNext: (counterId) => api.post(`/tokens/staff/counter/${counterId}/call-next`),
  startService: (counterId) => api.post(`/tokens/staff/counter/${counterId}/start-service`),
  completeService: (counterId) => api.post(`/tokens/staff/counter/${counterId}/complete-service`),
  markMissed: (tokenId) => api.post(`/tokens/staff/${tokenId}/mark-missed`),
  updateCounterStatus: (counterId, data) =>
    api.patch(`/tokens/staff/counter/${counterId}/status`, data),
  issueWalkIn: (data) => api.post("/tokens/staff/walkin", data),
};

export const adminApi = {
  getOverviewStats: (params) => api.get("/admin/stats/overview", { params }),
  getHourlyStats: (params) => api.get("/admin/stats/hourly", { params }),
  getCounters: (params) => api.get("/admin/counters", { params }),
  createCounter: (data) => api.post("/admin/counters", data),
  updateCounter: (id, data) => api.patch(`/admin/counters/${id}`, data),
  listStaff: (params) => api.get("/admin/staff", { params }),
  createStaff: (data) => api.post("/admin/staff", data),
  getAuditLogs: (params) => api.get("/admin/audit-logs", { params }),
  createOffice: (data) => api.post("/offices", data),
  updateOffice: (id, data) => api.patch(`/offices/${id}`, data),
};

export const notificationApi = {
  list: (params) => api.get("/notifications", { params }),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post("/notifications/read-all"),
};
