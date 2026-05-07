import React, { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import { ConfigProvider, Spin } from "antd";
import zhCN from "antd/locale/zh_CN";

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
const MainLayout = lazy(() => import("@/components/MainLayout"));

const RouteLoading = ({ fullscreen = false }: { fullscreen?: boolean }) => (
  <div
    style={{
      minHeight: fullscreen ? "100vh" : "240px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <Spin size="large" />
  </div>
);

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
  <Suspense fallback={<RouteLoading />}>
    <MainLayout>
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
    </MainLayout>
  </Suspense>
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
