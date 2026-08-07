import api from './api.js';
import { cleanParams } from '../utils/cleanParams.js';

export const dashboardService = {
  summary: () => api.get('/dashboard/summary').then(({ data }) => data.data),
  attendanceTrend: (months = 6) => api.get('/dashboard/attendance-trend', { params: cleanParams({ months }) }).then(({ data }) => data.data),
  headcount: () => api.get('/dashboard/headcount').then(({ data }) => data.data),
  payrollTrend: (months = 6) => api.get('/dashboard/payroll-trend', { params: cleanParams({ months }) }).then(({ data }) => data.data),
  activity: (limit = 20) => api.get('/dashboard/activity', { params: cleanParams({ limit }) }).then(({ data }) => data.data)
};
