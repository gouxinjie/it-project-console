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
  currentUser: User | null; // 当前登录用户信息
  isLoading: boolean; // 是否正在加载用户信息
  refreshCurrentUser: () => Promise<User | null>; // 刷新用户信息
  setAuthenticatedToken: (token: string) => Promise<User>; // 设置令牌并获取用户
  logout: () => void; // 退出登录
}

// 创建身份认证上下文
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * 清除本地存储的认证信息
 */
function clearStoredAuth(): void {
  localStorage.removeItem("token");
  clearAuthRelatedCaches();
}

/**
 * 身份认证提供者组件
 * 负责全局管理用户的登录状态、令牌和个人信息
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * 刷新当前用户信息
   * 逻辑：检查 localStorage 是否有 token，有则请求后端获取最新资料
   */
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
      // 如果获取失败（如 token 过期），则清除认证状态
      clearStoredAuth();
      setCurrentUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // 初始化加载：组件挂载时尝试恢复登录状态
  useEffect(() => {
    void refreshCurrentUser();
  }, []);

  /**
   * 登录成功后的处理
   * @param token 后端返回的 JWT
   */
  const setAuthenticatedToken = async (token: string): Promise<User> => {
    localStorage.setItem("token", token);
    const user = await refreshCurrentUser();
    if (!user) {
      throw new Error("Unable to load current user");
    }
    return user;
  };

  /**
   * 退出登录处理
   */
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

/**
 * Hook: 获取身份认证上下文
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
