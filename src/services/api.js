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
  if (import.meta.env.DEV && config.url?.includes('/performance/')) config.metadata = { startedAt: performance.now() };
  return config;
});

api.interceptors.response.use((response) => {
  if (import.meta.env.DEV && response.config.metadata?.startedAt != null) console.debug(`[FairRank API] ${response.config.method?.toUpperCase()} ${response.config.url} ${(performance.now() - response.config.metadata.startedAt).toFixed(0)}ms`);
  return response;
}, async (error) => {
  const original = error.config;
  if (import.meta.env.DEV && original?.metadata?.startedAt != null) console.debug(`[FairRank API] ${original.method?.toUpperCase()} ${original.url} ${(performance.now() - original.metadata.startedAt).toFixed(0)}ms${error.response ? ` (${error.response.status})` : ' (network error)'}`);
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
