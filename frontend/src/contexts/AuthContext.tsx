import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { clearAuthRelatedCaches, getCurrentUser } from "@/services/auth";
import type { User } from "@/types/user";
import {
  applyRemoteTokenClear,
  clearStoredToken,
  getStoredToken,
  parseAuthSyncEvent,
  resolveAuthPersistence,
  setStoredToken,
} from "@/utils/authStorage";

interface SetAuthenticatedTokenOptions {
  remember?: boolean;
}

interface AuthContextValue {
  currentUser: User | null;
  isLoading: boolean;
  refreshCurrentUser: () => Promise<User | null>;
  setAuthenticatedToken: (
    token: string,
    options?: SetAuthenticatedTokenOptions,
  ) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function clearStoredAuth(): void {
  clearStoredToken();
  clearAuthRelatedCaches();
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshCurrentUser = useCallback(async (): Promise<User | null> => {
    const token = getStoredToken();
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
    } catch {
      clearStoredAuth();
      setCurrentUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshCurrentUser();
  }, [refreshCurrentUser]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      const payload = parseAuthSyncEvent(event);
      if (!payload) {
        return;
      }

      if (payload.action === "token-cleared") {
        applyRemoteTokenClear(payload);
      }

      clearAuthRelatedCaches();
      void refreshCurrentUser();
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [refreshCurrentUser]);

  const setAuthenticatedToken = useCallback(
    async (
      token: string,
      options?: SetAuthenticatedTokenOptions,
    ): Promise<User> => {
      setStoredToken(token, resolveAuthPersistence(options?.remember));
      clearAuthRelatedCaches();

      const user = await refreshCurrentUser();
      if (!user) {
        throw new Error("Unable to load current user");
      }

      return user;
    },
    [refreshCurrentUser],
  );

  const logout = useCallback((): void => {
    clearStoredAuth();
    setCurrentUser(null);
    setIsLoading(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      isLoading,
      refreshCurrentUser,
      setAuthenticatedToken,
      logout,
    }),
    [currentUser, isLoading, logout, refreshCurrentUser, setAuthenticatedToken],
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
