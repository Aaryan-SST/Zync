import axios from "axios";

// In production, VITE_API_BASE_URL points to the live backend (e.g. https://zync-backend.onrender.com/api)
// In local dev without env set, defaults to "/api" which is forwarded by Vite's dev server proxy
const baseURL = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, "")
  : "/api";

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Auth API helpers
export const registerUser = (data) => api.post("/auth/register", data);
export const loginUser = (data) => api.post("/auth/login", data);
export const logoutUser = () => api.post("/auth/logout");
export const getCurrentUser = () => api.get("/auth/me");

// Monitor API helpers
export const getMonitors = () => api.get("/monitors");
export const createMonitor = (data) => api.post("/monitors", data);
export const getMonitorById = (id) => api.get(`/monitors/${id}`);
export const updateMonitor = (id, data) => api.put(`/monitors/${id}`, data);
export const deleteMonitor = (id) => api.delete(`/monitors/${id}`);
export const toggleMonitor = (id) => api.patch(`/monitors/${id}/toggle`);

// Incident API helpers
export const getIncidents = (params = {}) => api.get("/incidents", { params });
export const getIncidentById = (id) => api.get(`/incidents/${id}`);

export default api;
