import api, { clearAccessToken, setAccessToken } from './api.js';

export async function login(credentials) { const { data } = await api.post('/auth/login', credentials); setAccessToken(data.data.accessToken); return data.data; }
export async function registerCompany(payload) { const { data } = await api.post('/auth/register-company', payload); setAccessToken(data.data.accessToken); return data.data; }
export async function restoreSession() { const { data } = await api.post('/auth/refresh'); setAccessToken(data.data.accessToken); return data.data; }
export async function currentUser() { const { data } = await api.get('/auth/me'); return data.data.user; }
export async function logout() { try { await api.post('/auth/logout'); } finally { clearAccessToken(); } }
export async function requestPasswordReset(email) { return api.post('/auth/forgot-password', { email }); }
export async function resetPassword(payload) { return api.post('/auth/reset-password', payload); }
export async function acceptInvitation(payload) { return api.post('/auth/set-password', payload); }

export { api };
