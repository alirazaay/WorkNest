import axios from 'axios';
import { appConfig } from '../config/app.js';
import { cleanParams } from '../utils/cleanParams.js';

const api = axios.create({
  baseURL: appConfig.apiBaseUrl,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

let accessToken = null;
let refreshPromise = null;

export function setAccessToken(token) { accessToken = token; }
export function clearAccessToken() { accessToken = null; }

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  if (config.params) config.params = cleanParams(config.params);
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
