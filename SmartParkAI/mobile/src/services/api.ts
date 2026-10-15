import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// In Expo, EXPO_PUBLIC_* variables are embedded automatically
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 5000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
