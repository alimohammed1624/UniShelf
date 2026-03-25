import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  let token: string | null = null;
  if (typeof window !== 'undefined' && window.localStorage) {
    token = window.localStorage.getItem('token');
  }
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
