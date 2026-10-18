/**
 * @file src/client/hooks/useAuth.tsx
 * @description React Context & Hook untuk manajemen state otentikasi dan registrasi pengguna secara reaktif.
 * @layer Client State & Hook Layer
 * 
 * Tujuan: Menyediakan konteks sesi otentikasi reaktif (login, signup, logout, current user) bagi seluruh komponen klien.
 * Caller: src/client/main.tsx, App.tsx, Navbar.tsx, BottomNav.tsx, LoginPage.tsx, CatalogPage.tsx, CirculationDesk.tsx, SuperAdminPanel.tsx.
 * Dependensi: react, src/client/services/api.ts, shared/types.
 * Main Functions: AuthProvider, useAuth.
 * Side Effects: Membaca/menulis profil pengguna ke localStorage dan memverifikasi token JWT ke server.
 */

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '../services/api.js';
import type { User, LoginInput, SelfRegisterInput } from '../../shared/types/index.js';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  signup: (input: SelfRegisterInput) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Dengarkan event token 401 Unauthorized secara reaktif dari API client
  useEffect(() => {
    const unsubscribe = api.onUnauthorized(() => {
      localStorage.removeItem('pustaka_cached_user');
      setUser(null);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const token = api.getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      // 1. Muat profil user yang di-cache di localStorage untuk offline availability
      const cached = localStorage.getItem('pustaka_cached_user');
      if (cached) {
        try {
          setUser(JSON.parse(cached));
        } catch {
          // ignore parse error
        }
      }

      // 2. Jika online, verifikasi ke server
      if (navigator.onLine) {
        try {
          const profile = await api.getCurrentUser();
          setUser(profile);
          localStorage.setItem('pustaka_cached_user', JSON.stringify(profile));
        } catch {
          // Hanya logout jika token benar-benar ditolak oleh server (401)
          if (!api.getToken()) {
            localStorage.removeItem('pustaka_cached_user');
            setUser(null);
          }
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (input: LoginInput) => {
    setIsLoading(true);
    try {
      const session = await api.login(input);
      setUser(session.user);
      localStorage.setItem('pustaka_cached_user', JSON.stringify(session.user));
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (input: SelfRegisterInput) => {
    setIsLoading(true);
    try {
      const session = await api.signup(input);
      setUser(session.user);
      localStorage.setItem('pustaka_cached_user', JSON.stringify(session.user));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.logout();
    localStorage.removeItem('pustaka_cached_user');
    setUser(null);
  };


  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        signup,
        logout,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider.');
  }
  return context;
};

