import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, clearToken, storeToken } from "@/services/api";
import type { User } from "@/types/models";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const currentUser = await api.me();
      setUser(currentUser);
    } catch {
      clearToken();
      setUser(null);
    }
  };

  useEffect(() => {
    const boot = async () => {
      const token = localStorage.getItem(api.tokenStorageKey);
      if (!token) {
        setLoading(false);
        return;
      }
      await refreshUser();
      setLoading(false);
    };
    void boot();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.login(email, password);
    storeToken(response.token);
    setUser(response.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const response = await api.register(name, email, password);
    storeToken(response.token);
    setUser(response.user);
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refreshUser }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
