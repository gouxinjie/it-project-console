import React, { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import { ConfigProvider, Spin } from "antd";
import zhCN from "antd/locale/zh_CN";

import MainLayout from "@/components/MainLayout";
import { getCurrentUser } from "@/services/auth";
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

// 预加载核心页面，减少首次切换时的闪烁
const preloadCommonPages = () => {
  void import("@/pages/Dashboard");
  void import("@/pages/ProjectList");
  void import("@/pages/MemberList");
};

const RouteLoading = ({ fullscreen = false }: { fullscreen?: boolean }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
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

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setIsAuthenticated(false);
      setIsChecking(false);
      return;
    }

    let isMounted = true;
    getCurrentUser()
      .then(() => {
        if (!isMounted) {
          return;
        }
        setIsAuthenticated(true);
        preloadCommonPages();
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        setIsAuthenticated(false);
      })
      .finally(() => {
        if (isMounted) {
          setIsChecking(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (isChecking) {
    return <RouteLoading fullscreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

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
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  </MainLayout>
);

const App: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN}>
      <Router>
        <Routes>
          <Route
            path="/login"
            element={
              <Suspense fallback={<RouteLoading fullscreen />}>
                <Login />
              </Suspense>
            }
          />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <PrivateApp />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </ConfigProvider>
  );
};

export default App;
