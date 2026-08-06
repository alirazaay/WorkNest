import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

let accessToken = null;
let refreshPromise = null;

export function setAccessToken(token) { accessToken = token; }
export function clearAccessToken() { accessToken = null; }

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use((response) => response, async (error) => {
  const original = error.config;
  if (error.response?.status !== 401 || original?._retry || original?.url?.includes('/auth/refresh')) throw error;
  original._retry = true;
  refreshPromise ||= api.post('/auth/refresh').then(({ data }) => { setAccessToken(data.data.accessToken); return data.data.accessToken; }).finally(() => { refreshPromise = null; });
  await refreshPromise;
  return api(original);
});

export default api;
