import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { clearAuthRelatedCaches, getCurrentUser } from "@/services/auth";
import type { User } from "@/types/user";

interface AuthContextValue {
  currentUser: User | null;
  isLoading: boolean;
  refreshCurrentUser: () => Promise<User | null>;
  setAuthenticatedToken: (token: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function clearStoredAuth(): void {
  localStorage.removeItem("token");
  clearAuthRelatedCaches();
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshCurrentUser = async (): Promise<User | null> => {
    const token = localStorage.getItem("token");
    if (!token) {
      setCurrentUser(null);
      setIsLoading(false);
      return null;
    }

    setIsLoading(true);
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      return user;
    } catch (error) {
      clearStoredAuth();
      setCurrentUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshCurrentUser();
  }, []);

  const setAuthenticatedToken = async (token: string): Promise<User> => {
    localStorage.setItem("token", token);
    const user = await refreshCurrentUser();
    if (!user) {
      throw new Error("Unable to load current user");
    }
    return user;
  };

  const logout = (): void => {
    clearStoredAuth();
    setCurrentUser(null);
    setIsLoading(false);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      isLoading,
      refreshCurrentUser,
      setAuthenticatedToken,
      logout,
    }),
    [currentUser, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
