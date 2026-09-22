/**
 * @file src/client/hooks/useAuth.tsx
 * @description React Context & Hook untuk manajemen state otentikasi pengguna secara reaktif.
 * @layer Client State & Hook Layer
 */

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '../services/api.js';
import type { User, LoginInput } from '../../shared/types/index.js';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = api.getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const profile = await api.getCurrentUser();
        setUser(profile);
      } catch {
        api.logout();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (input: LoginInput) => {
    setIsLoading(true);
    try {
      const session = await api.login(input);
      setUser(session.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
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
