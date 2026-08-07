export const appConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  appName: 'WorkNest',
  environment: import.meta.env.MODE || 'development'
};

export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  return error?.response?.data?.error?.message || error?.response?.data?.message || (error?.request ? 'Unable to reach the server. Check that the backend is running.' : fallback);
}
