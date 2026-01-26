import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore, waitForHydration } from "../stores/auth";

const API_URL = import.meta.env.VITE_API_URL || "/api/v1";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
// Queue of failed requests to retry after refresh
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Wait for Zustand to hydrate from localStorage before making requests
    await waitForHydration();
    
    const state = useAuthStore.getState();
    
    if (state.accessToken) {
      config.headers.Authorization = `Bearer ${state.accessToken}`;
    }

    if (state.currentWorkspace) {
      config.headers["X-Workspace-ID"] = state.currentWorkspace.id;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Don't logout for login/register endpoints
      const isAuthEndpoint = originalRequest.url?.includes("/auth/login") || 
                             originalRequest.url?.includes("/auth/register") ||
                             originalRequest.url?.includes("/auth/refresh");
      
      if (isAuthEndpoint) {
        return Promise.reject(error);
      }

      // If we're already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }
      
      originalRequest._retry = true;
      
      // Try to refresh token if we have one
      const refreshToken = useAuthStore.getState().refreshToken;
      
      if (refreshToken) {
        isRefreshing = true;
        
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          
          const { access_token, refresh_token } = response.data;
          useAuthStore.getState().setTokens(access_token, refresh_token);
          
          processQueue(null, access_token);
          isRefreshing = false;
          
          // Retry the original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
          }
          return api(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          isRefreshing = false;
          // Refresh failed, logout user
          useAuthStore.getState().logout();
          // Only redirect if not already on login page
          if (!window.location.pathname.includes("/login")) {
            window.location.href = "/login";
          }
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token, logout only if we were supposed to be authenticated
        const hasHydrated = useAuthStore.getState()._hasHydrated;
        if (hasHydrated) {
          useAuthStore.getState().logout();
          if (!window.location.pathname.includes("/login")) {
            window.location.href = "/login";
          }
        }
      }
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
  logout: () => api.post("/auth/logout"),
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
  // Progress & Measurements (staff access)
  getMeasurements: (clientId: string, limit?: number) =>
    api.get(`/clients/${clientId}/measurements`, { params: { limit } }),
  getPhotos: (clientId: string, limit?: number) =>
    api.get(`/clients/${clientId}/photos`, { params: { limit } }),
  getProgressSummary: (clientId: string) =>
    api.get(`/clients/${clientId}/progress-summary`),
  // Invitations
  sendInvitation: (data: { email: string; first_name?: string; last_name?: string; message?: string }) =>
    api.post("/clients/invitations", data),
  listInvitations: (status?: string) =>
    api.get("/clients/invitations", { params: status ? { status } : {} }),
  resendInvitation: (invitationId: string) =>
    api.post(`/clients/invitations/${invitationId}/resend`),
  cancelInvitation: (invitationId: string) =>
    api.delete(`/clients/invitations/${invitationId}`),
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
  assignProgram: (programId: string, clientId: string, startDate?: string, endDate?: string, notes?: string) =>
    api.post(`/workouts/programs/${programId}/assign`, { 
      client_id: clientId,
      start_date: startDate,
      end_date: endDate,
      notes: notes
    }),

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

  // Meal Plans - backend uses /meal-plans
  plans: (params?: object) => api.get("/nutrition/meal-plans", { params }),
  getPlan: (id: string) => api.get(`/nutrition/meal-plans/${id}`),
  createPlan: (data: object) => api.post("/nutrition/meal-plans", data),
  updatePlan: (id: string, data: object) =>
    api.put(`/nutrition/meal-plans/${id}`, data),
  deletePlan: (id: string) => api.delete(`/nutrition/meal-plans/${id}`),
  assignPlan: (planId: string, clientId: string, startDate?: string, endDate?: string, notes?: string) =>
    api.post(`/nutrition/meal-plans/${planId}/assign`, { 
      client_id: clientId,
      start_date: startDate,
      end_date: endDate,
      notes: notes
    }),
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

// Messages API - moved to end of file with new structure

// Payments API
export const paymentsApi = {
  // Stripe Connect
  connectAccount: () => api.post("/payments/connect"),
  accountStatus: () => api.get("/payments/connect/status"),

  // Subscriptions
  subscriptions: (params?: object) =>
    api.get("/payments/subscriptions", { params }),
  getSubscription: (id: string) => api.get(`/payments/subscriptions/${id}`),
  createSubscription: (data: object) =>
    api.post("/payments/subscriptions", data),
  cancelSubscription: (id: string) =>
    api.post(`/payments/subscriptions/${id}/cancel`),

  // Payments
  payments: (params?: object) => api.get("/payments/payments", { params }),
  createPaymentIntent: (data: object) => api.post("/payments/intent", data),
  refund: (paymentId: string) => api.post(`/payments/payments/${paymentId}/refund`),
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

// Client Portal API - endpoints for clients to access their own data
export const clientPortalApi = {
  // Dashboard
  dashboard: () => api.get("/my/dashboard"),
  
  // Profile
  profile: () => api.get("/my/profile"),
  updateProfile: (data: object) => api.put("/my/profile", data),
  
  // Workouts
  workouts: () => api.get("/my/workouts"),
  getWorkout: (id: string) => api.get(`/my/workouts/${id}`),
  logWorkout: (data: { program_id: string; log: object }) => 
    api.post("/my/workouts/logs", data),
  workoutHistory: (limit?: number) => 
    api.get("/my/workouts/logs/history", { params: { limit } }),
  
  // Nutrition
  mealPlan: () => api.get("/my/nutrition/plan"),
  allMealPlans: () => api.get("/my/nutrition/plans"),
  logNutrition: (data: { date: string; meal_name: string; foods: object[]; notes?: string }) =>
    api.post("/my/nutrition/logs", data),
  nutritionLogs: (date?: string, limit?: number) =>
    api.get("/my/nutrition/logs", { params: { date, limit } }),
  deleteNutritionLog: (logIndex: number) =>
    api.delete(`/my/nutrition/logs/${logIndex}`),
  
  // Progress
  measurements: (limit?: number) =>
    api.get("/my/progress/measurements", { params: { limit } }),
  createMeasurement: (data: {
    measured_at: string;
    weight_kg?: number;
    body_fat_percentage?: number;
    muscle_mass_kg?: number;
    measurements?: object;
    notes?: string;
  }) => api.post("/my/progress/measurements", data),
  progressSummary: () => api.get("/my/progress/summary"),
  
  // Photos
  getPhotos: (limit?: number) =>
    api.get("/my/progress/photos", { params: { limit } }),
  uploadPhoto: (file: File, type: string, notes?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(`/my/progress/photos?photo_type=${type}${notes ? `&notes=${encodeURIComponent(notes)}` : ''}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  
  // Calendar/Bookings
  bookings: (params?: { status?: string; upcoming_only?: boolean; limit?: number }) =>
    api.get("/my/calendar/bookings", { params }),
  getBooking: (id: string) => api.get(`/my/calendar/bookings/${id}`),
  
  // Messages/Chat
  getConversation: () => api.get("/my/messages/conversation"),
  getMessages: (limit?: number, before?: string) =>
    api.get("/my/messages", { params: { limit, before } }),
  sendMessage: (content: string) =>
    api.post("/my/messages", { content, message_type: "text" }),
  markMessagesRead: () => api.post("/my/messages/mark-read"),
  getUnreadCount: () => api.get("/my/messages/unread-count"),
};

// Messages API (Staff/Trainer)
export const messagesApi = {
  getConversations: (includeArchived?: boolean) =>
    api.get("/messages/conversations", { params: { include_archived: includeArchived } }),
  getConversation: (id: string) => api.get(`/messages/conversations/${id}`),
  createConversation: (data: { client_id?: string; name?: string }) =>
    api.post("/messages/conversations", data),
  getMessages: (conversationId: string, limit?: number, before?: string) =>
    api.get(`/messages/conversations/${conversationId}/messages`, { params: { limit, before } }),
  sendMessage: (data: { conversation_id: string; content: string; send_via?: string }) =>
    api.post("/messages", { ...data, message_type: "text" }),
  markConversationRead: (conversationId: string) =>
    api.post(`/messages/conversations/${conversationId}/read`),
  getUnreadCount: () => api.get("/messages/unread-count"),
};

export default api;
