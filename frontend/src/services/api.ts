import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../stores/auth";

const API_URL = import.meta.env.VITE_API_URL || "/api/v1";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const workspace = useAuthStore.getState().currentWorkspace;
    if (workspace) {
      config.headers["X-Workspace-ID"] = workspace.id;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired, logout user
      useAuthStore.getState().logout();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    workspace_name: string;
  }) => api.post("/auth/register", data),
  me: () => api.get("/auth/me"),
  refreshToken: (refreshToken: string) =>
    api.post("/auth/refresh", { refresh_token: refreshToken }),
};

// Workspaces API
export const workspacesApi = {
  list: () => api.get("/workspaces"),
  get: (id: string) => api.get(`/workspaces/${id}`),
  create: (data: object) => api.post("/workspaces", data),
  update: (id: string, data: object) => api.put(`/workspaces/${id}`, data),
  invite: (id: string, data: { email: string; role: string }) =>
    api.post(`/workspaces/${id}/invite`, data),
};

// Clients API
export const clientsApi = {
  list: (params?: object) => api.get("/clients", { params }),
  get: (id: string) => api.get(`/clients/${id}`),
  create: (data: object) => api.post("/clients", data),
  update: (id: string, data: object) => api.put(`/clients/${id}`, data),
  delete: (id: string) => api.delete(`/clients/${id}`),
  tags: () => api.get("/clients/tags"),
  createTag: (data: { name: string; color: string }) =>
    api.post("/clients/tags", data),
  addTag: (clientId: string, tagId: string) =>
    api.post(`/clients/${clientId}/tags/${tagId}`),
  removeTag: (clientId: string, tagId: string) =>
    api.delete(`/clients/${clientId}/tags/${tagId}`),
  export: (format: "csv" | "xlsx") =>
    api.get("/clients/export", { params: { format }, responseType: "blob" }),
};

// Bookings API
export const bookingsApi = {
  list: (params?: object) => api.get("/bookings", { params }),
  get: (id: string) => api.get(`/bookings/${id}`),
  create: (data: object) => api.post("/bookings", data),
  update: (id: string, data: object) => api.put(`/bookings/${id}`, data),
  delete: (id: string) => api.delete(`/bookings/${id}`),
  cancel: (id: string) => api.post(`/bookings/${id}/cancel`),
  complete: (id: string) => api.post(`/bookings/${id}/complete`),
  noShow: (id: string) => api.post(`/bookings/${id}/no-show`),
};

// Workouts API
export const workoutsApi = {
  // Exercises
  exercises: (params?: object) => api.get("/workouts/exercises", { params }),
  getExercise: (id: string) => api.get(`/workouts/exercises/${id}`),
  createExercise: (data: object) => api.post("/workouts/exercises", data),
  updateExercise: (id: string, data: object) =>
    api.put(`/workouts/exercises/${id}`, data),
  deleteExercise: (id: string) => api.delete(`/workouts/exercises/${id}`),

  // Programs
  programs: (params?: object) => api.get("/workouts/programs", { params }),
  getProgram: (id: string) => api.get(`/workouts/programs/${id}`),
  createProgram: (data: object) => api.post("/workouts/programs", data),
  updateProgram: (id: string, data: object) =>
    api.put(`/workouts/programs/${id}`, data),
  deleteProgram: (id: string) => api.delete(`/workouts/programs/${id}`),
  assignProgram: (programId: string, clientId: string) =>
    api.post(`/workouts/programs/${programId}/assign/${clientId}`),

  // Logs
  logs: (clientId: string) => api.get(`/workouts/logs/${clientId}`),
  createLog: (data: object) => api.post("/workouts/logs", data),
};

// Nutrition API
export const nutritionApi = {
  // Foods
  foods: (params?: object) => api.get("/nutrition/foods", { params }),
  getFood: (id: string) => api.get(`/nutrition/foods/${id}`),
  createFood: (data: object) => api.post("/nutrition/foods", data),

  // Meal Plans
  plans: (params?: object) => api.get("/nutrition/plans", { params }),
  getPlan: (id: string) => api.get(`/nutrition/plans/${id}`),
  createPlan: (data: object) => api.post("/nutrition/plans", data),
  updatePlan: (id: string, data: object) =>
    api.put(`/nutrition/plans/${id}`, data),
  deletePlan: (id: string) => api.delete(`/nutrition/plans/${id}`),
  assignPlan: (planId: string, clientId: string) =>
    api.post(`/nutrition/plans/${planId}/assign/${clientId}`),
};

// Forms API
export const formsApi = {
  list: (params?: object) => api.get("/forms", { params }),
  get: (id: string) => api.get(`/forms/${id}`),
  create: (data: object) => api.post("/forms", data),
  update: (id: string, data: object) => api.put(`/forms/${id}`, data),
  delete: (id: string) => api.delete(`/forms/${id}`),

  // Submissions
  submissions: (formId: string) => api.get(`/forms/${formId}/submissions`),
  submit: (formId: string, data: object) =>
    api.post(`/forms/${formId}/submit`, data),
  sendToClient: (formId: string, clientId: string) =>
    api.post(`/forms/${formId}/send/${clientId}`),
};

// Messages API
export const messagesApi = {
  conversations: () => api.get("/messages/conversations"),
  getConversation: (id: string) => api.get(`/messages/conversations/${id}`),
  createConversation: (data: object) =>
    api.post("/messages/conversations", data),
  messages: (conversationId: string, params?: object) =>
    api.get(`/messages/conversations/${conversationId}/messages`, { params }),
  send: (conversationId: string, data: object) =>
    api.post(`/messages/conversations/${conversationId}/messages`, data),
  markRead: (conversationId: string) =>
    api.post(`/messages/conversations/${conversationId}/read`),
};

// Payments API
export const paymentsApi = {
  // Stripe Connect
  connectAccount: () => api.post("/payments/stripe/connect"),
  accountStatus: () => api.get("/payments/stripe/status"),

  // Subscriptions
  subscriptions: (params?: object) =>
    api.get("/payments/subscriptions", { params }),
  getSubscription: (id: string) => api.get(`/payments/subscriptions/${id}`),
  createSubscription: (data: object) =>
    api.post("/payments/subscriptions", data),
  cancelSubscription: (id: string) =>
    api.post(`/payments/subscriptions/${id}/cancel`),

  // Payments
  payments: (params?: object) => api.get("/payments", { params }),
  createPaymentIntent: (data: object) => api.post("/payments/intent", data),
  refund: (paymentId: string) => api.post(`/payments/${paymentId}/refund`),
};

// Automations API
export const automationsApi = {
  list: () => api.get("/automations"),
  get: (id: string) => api.get(`/automations/${id}`),
  create: (data: object) => api.post("/automations", data),
  update: (id: string, data: object) => api.put(`/automations/${id}`, data),
  delete: (id: string) => api.delete(`/automations/${id}`),
  toggle: (id: string, isActive: boolean) =>
    api.patch(`/automations/${id}`, { is_active: isActive }),
  logs: (id: string) => api.get(`/automations/${id}/logs`),
};

// Reports API
export const reportsApi = {
  kpis: () => api.get("/reports/kpis"),
  revenueChart: (months: number) =>
    api.get("/reports/revenue", { params: { months } }),
  clientsChart: (months: number) =>
    api.get("/reports/clients", { params: { months } }),
  overview: (period: string) =>
    api.get("/reports/overview", { params: { period } }),
  export: (type: string, format: string, params?: object) =>
    api.get(`/reports/export/${type}`, {
      params: { format, ...params },
      responseType: "blob",
    }),
};

// Settings API
export const settingsApi = {
  get: () => api.get("/settings"),
  update: (data: object) => api.put("/settings", data),
  updateBranding: (data: object) => api.put("/settings/branding", data),
  updateNotifications: (data: object) =>
    api.put("/settings/notifications", data),
};

export default api;
