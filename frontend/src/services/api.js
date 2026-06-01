import axios from "axios";

// Use Vite proxy during development by default (set VITE_API_URL to override)
const API_BASE = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: (credentials) => api.post("/auth/login", credentials),
  getCurrentUser: () => api.get("/auth/me"),
  changePassword: (data) => api.post("/auth/change-password", data),
  getActivity: () => api.get("/auth/activity"),
};

export const productService = {
  getAll: (params) => api.get("/products", { params }),
  getById: (id) => api.get(`/products/${id}`),
  getByBarcode: (barcode) => api.get(`/products/barcode/${barcode}`),
  create: (data) => api.post("/products", data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  getLowStock: () => api.get("/products/low-stock"),
  getExpiring: () => api.get("/products/expiring"),
  getStats: () => api.get("/products/stats"),
  generateBarcode: () => api.post("/products/generate-barcode"),
  bulkImport: (data) => api.post("/products/bulk-import", data),
  getVariants: (id) => api.get(`/products/${id}/variants`),
  createVariant: (id, data) => api.post(`/products/${id}/variants`, data),
  updateVariant: (variantId, data) =>
    api.put(`/products/variants/${variantId}`, data),
  deleteVariant: (variantId) => api.delete(`/products/variants/${variantId}`),
};

export const categoryService = {
  getAll: () => api.get("/categories"),
  getById: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post("/categories", data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

export const orderService = {
  getAll: (params) => api.get("/orders", { params }),
  getById: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post("/orders", data),
  updateStatus: (id, status) => api.put(`/orders/${id}/status`, { status }),
  getToday: () => api.get("/orders/today"),
};

export const customerService = {
  getAll: (params) => api.get("/customers", { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post("/customers", data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
};

export const inventoryService = {
  getProducts: (params) => api.get("/inventory/products", { params }),
  adjust: (data) => api.post("/inventory/adjust", data),
  getLogs: (params) => api.get("/inventory/logs", { params }),
  getAlerts: () => api.get("/inventory/alerts"),
};

export const expenseService = {
  getAll: (params) => api.get("/expenses", { params }),
  create: (data) => api.post("/expenses", data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
  getSummary: () => api.get("/expenses/summary"),
};

export const userService = {
  getAll: () => api.get("/users"),
  create: (data) => api.post("/users", data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

export const syncService = {
  getQueue: () => api.get("/sync/queue"),
  getStatus: () => api.get("/sync/status"),
  enqueue: (data) => api.post("/sync/enqueue", data),
  process: () => api.post("/sync/process"),
  retryFailed: () => api.post("/sync/retry-failed"),
};

export const reportService = {
  getDashboard: () => api.get("/reports/dashboard"),
  getSales: (params) => api.get("/reports/sales", { params }),
  getProfitLoss: (params) => api.get("/reports/profit-loss", { params }),
  getStaffPerformance: (params) =>
    api.get("/reports/staff-performance", { params }),
  getCashFlow: (params) => api.get("/reports/cash-flow", { params }),
  getInventoryReport: () => api.get("/reports/inventory-report"),
  getExportUrl: (params) => {
    const query = Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");
    return `${API_BASE}/reports/export?${query}`;
  },
};

export const supplierService = {
  getAll: () => api.get("/suppliers"),
  getById: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post("/suppliers", data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),
};

export const purchaseOrderService = {
  getAll: (params) => api.get("/purchase-orders", { params }),
  getById: (id) => api.get(`/purchase-orders/${id}`),
  create: (data) => api.post("/purchase-orders", data),
  update: (id, data) => api.put(`/purchase-orders/${id}`, data),
  receive: (id) => api.put(`/purchase-orders/${id}/receive`),
  delete: (id) => api.delete(`/purchase-orders/${id}`),
};

export const salaryService = {
  getAll: (params) => api.get("/salaries", { params }),
  getSummary: (params) => api.get("/salaries/summary", { params }),
  getEmployees: () => api.get("/salaries/employees"),
  create: (data) => api.post("/salaries", data),
  update: (id, data) => api.put(`/salaries/${id}`, data),
  delete: (id) => api.delete(`/salaries/${id}`),
};

export const backupService = {
  getAll: () => api.get("/backup"),
  create: () => api.post("/backup/create"),
  createAuto: () => api.post("/backup/auto"),
  delete: (id) => api.delete(`/backup/${id}`),
  restore: (id) => api.post(`/backup/restore/${id}`),
};

export const settingsService = {
  getAll: () => api.get("/settings"),
  update: (data) => api.put("/settings", data),
};

export const uploadService = {
  upload: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const notificationService = {
  getAll: (params) => api.get("/notifications", { params }),
  create: (data) => api.post("/notifications", data),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put("/notifications/read-all"),
  delete: (id) => api.delete(`/notifications/${id}`),
  generate: () => api.post("/notifications/generate"),
  dailySummary: () => api.post("/notifications/daily-summary"),
};

export default api;
