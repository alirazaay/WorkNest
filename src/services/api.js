import axios from 'axios';
import { appConfig } from '../config/app.js';
import { cleanParams } from '../utils/cleanParams.js';

const api = axios.create({
  baseURL: appConfig.apiBaseUrl,
  withCredentials: true,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' }
});

let accessToken = null;
let refreshPromise = null;
let refreshBlockedUntil = 0;

export function setAccessToken(token) { accessToken = token; refreshBlockedUntil = 0; }
export function clearAccessToken() { accessToken = null; }

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  if (config.params) config.params = cleanParams(config.params);
  return config;
});

api.interceptors.response.use((response) => response, async (error) => {
  const original = error.config;
  if (error.response?.status !== 401 || original?._retry || original?.url?.includes('/auth/refresh')) throw error;
  if (Date.now() < refreshBlockedUntil) throw error;
  original._retry = true;
  refreshPromise ||= api.post('/auth/refresh').then(({ data }) => { setAccessToken(data.data.accessToken); return data.data.accessToken; }).catch((refreshError) => {
    if (!refreshError.response) refreshBlockedUntil = Date.now() + 10_000;
    throw refreshError;
  }).finally(() => { refreshPromise = null; });
  await refreshPromise;
  return api(original);
});

export default api;
