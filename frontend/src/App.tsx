import React, { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import { ConfigProvider, Spin } from "antd";
import zhCN from "antd/locale/zh_CN";

import MainLayout from "@/components/MainLayout";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import "@/index.css";

const Login = lazy(() => import("@/pages/Login"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const ProjectList = lazy(() => import("@/pages/ProjectList"));
const ProjectDetail = lazy(() => import("@/pages/ProjectDetail"));
const ProjectForm = lazy(() => import("@/pages/ProjectForm"));
const ProjectResourceForm = lazy(() => import("@/pages/ProjectResourceForm"));
const ProjectExternalResourceForm = lazy(
  () => import("@/pages/ProjectExternalResourceForm"),
);
const MemberList = lazy(() => import("@/pages/MemberList"));
const UserList = lazy(() => import("@/pages/UserList"));

/**
 * 预加载常用页面
 * 提升用户点击导航时的响应速度
 */
const preloadCommonPages = (isSuperuser: boolean) => {
  void import("@/pages/Dashboard");
  void import("@/pages/ProjectList");
  void import("@/pages/MemberList");
  if (isSuperuser) {
    void import("@/pages/UserList");
  }
};

/**
 * 全局加载指示器
 * 在 Suspense 懒加载过程中显示
 */
const RouteLoading = ({ fullscreen = false }: { fullscreen?: boolean }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // 延迟 300ms 显示，避免在极快加载时闪烁
    const timer = setTimeout(() => setShow(true), 300);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div
      style={{
        minHeight: fullscreen ? "100vh" : "240px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 0.3s ease-in",
      }}
    >
      <Spin size="large" />
    </div>
  );
};

/**
 * 受保护路由组件
 * 逻辑：未登录用户访问受保护路径时重定向至登录页
 */
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, isLoading } = useAuth();

  useEffect(() => {
    if (currentUser) {
      preloadCommonPages(currentUser.is_superuser);
    }
  }, [currentUser]);

  if (isLoading) {
    return <RouteLoading fullscreen />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

/**
 * 管理员专用路由组件
 * 逻辑：仅允许超级管理员访问，否则重定向至仪表盘
 */
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return <RouteLoading fullscreen />;
  }

  if (!currentUser?.is_superuser) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

/**
 * 内部业务逻辑路由
 * 包装在 MainLayout 中，通过 Suspense 进行代码分割和按需加载
 */
const PrivateApp: React.FC = () => (
  <MainLayout>
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects" element={<ProjectList />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/projects/create" element={<ProjectForm />} />
        <Route path="/projects/:id/edit" element={<ProjectForm />} />
        <Route
          path="/projects/:projectId/resource/create"
          element={<ProjectResourceForm />}
        />
        <Route
          path="/projects/:projectId/resource/:resourceId/edit"
          element={<ProjectResourceForm />}
        />
        <Route
          path="/projects/:projectId/external-resource/edit"
          element={<ProjectExternalResourceForm />}
        />
        <Route path="/members" element={<MemberList />} />
        <Route
          path="/users"
          element={(
            <AdminRoute>
              <UserList />
            </AdminRoute>
          )}
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  </MainLayout>
);

/**
 * 根路由配置
 */
const AppRoutes: React.FC = () => (
  <Router>
    <Routes>
      <Route
        path="/login"
        element={(
          <Suspense fallback={<RouteLoading fullscreen />}>
            <Login />
          </Suspense>
        )}
      />
      <Route
        path="/*"
        element={(
          <ProtectedRoute>
            <PrivateApp />
          </ProtectedRoute>
        )}
      />
    </Routes>
  </Router>
);

/**
 * 应用入口组件
 * 提供 Ant Design 配置、身份验证上下文和路由系统
 */
const App: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ConfigProvider>
  );
};

export default App;
