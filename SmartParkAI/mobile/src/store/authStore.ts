import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: string;
  defaultVehiclePlate?: string;
  companyName?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  setAuth: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

const TOKEN_KEY = 'smartpark_auth_token';
const USER_KEY = 'smartpark_user_data';

async function setStorageItem(key: string, value: string) {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  } catch {}
}

async function getStorageItem(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    } else {
      return await SecureStore.getItemAsync(key);
    }
  } catch {
    return null;
  }
}

async function removeStorageItem(key: string) {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  } catch {}
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true,

  setAuth: async (token: string, user: User) => {
    await setStorageItem(TOKEN_KEY, token);
    await setStorageItem(USER_KEY, JSON.stringify(user));
    set({ token, user, isLoading: false });
  },

  logout: async () => {
    await removeStorageItem(TOKEN_KEY);
    await removeStorageItem(USER_KEY);
    set({ token: null, user: null, isLoading: false });
  },

  restoreSession: async () => {
    try {
      const token = await getStorageItem(TOKEN_KEY);
      const userJson = await getStorageItem(USER_KEY);
      if (token && userJson) {
        set({ token, user: JSON.parse(userJson), isLoading: false });
        return;
      }
    } catch {}
    set({ token: null, user: null, isLoading: false });
  },
}));
