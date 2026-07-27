import axios from 'axios';

export const API_URL = window.location.origin;

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('gmis_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));
