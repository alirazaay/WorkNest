function resolveApiBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL;
  if (configured) {
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(configured);
        if (['localhost', '127.0.0.1', '::1'].includes(url.hostname) && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)) url.hostname = window.location.hostname;
        return url.toString().replace(/\/$/, '');
      } catch { return configured; }
    }
    return configured;
  }
  return typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:5000/api/v1` : 'http://localhost:5000/api/v1';
}

export const appConfig = {
  apiBaseUrl: resolveApiBaseUrl(),
  appName: 'WorkNest',
  environment: import.meta.env.MODE || 'development'
};

export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error?.response?.status === 429) {
    const retryAfter = Number(error.response.headers?.['retry-after']);
    return retryAfter ? `Too many requests. Please try again in ${retryAfter} seconds.` : 'Too many requests. Please try again later.';
  }
  const fields = error?.response?.data?.error?.fields;
  if (fields && typeof fields === 'object') {
    const message = Object.values(fields).flat().filter(Boolean).join(' ');
    if (message) return message;
  }
  return error?.response?.data?.error?.message || error?.response?.data?.message || (error?.request ? 'Unable to reach the server. Check that the backend is running.' : fallback);
}
