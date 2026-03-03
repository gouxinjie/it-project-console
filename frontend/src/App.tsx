import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import ProjectList from '@/pages/ProjectList';
import ProjectForm from '@/pages/ProjectForm';
import ProjectResourceForm from '@/pages/ProjectResourceForm';
import ProjectExternalResourceForm from '@/pages/ProjectExternalResourceForm';
import MemberList from '@/pages/MemberList';
import MainLayout from '@/components/MainLayout';
import '@/index.css';

// 模拟身份验证检查
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const isAuthenticated = localStorage.getItem('token');
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
};

const App: React.FC = () => {
    return (
        <ConfigProvider locale={zhCN}>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route
                        path="/*"
                        element={
                            <ProtectedRoute>
                                <MainLayout>
                                    <Routes>
                                        <Route path="/dashboard" element={<Dashboard />} />
                                        <Route path="/projects" element={<ProjectList />} />
                                        <Route path="/projects/create" element={<ProjectForm />} />
                                        <Route path="/projects/:id/edit" element={<ProjectForm />} />
                                        <Route path="/projects/:projectId/resource/create" element={<ProjectResourceForm />} />
                                        <Route path="/projects/:projectId/resource/:resourceId/edit" element={<ProjectResourceForm />} />
                                        <Route path="/projects/:projectId/external-resource/edit" element={<ProjectExternalResourceForm />} />
                                        <Route path="/members" element={<MemberList />} />
                                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                                    </Routes>
                                </MainLayout>
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </Router>
        </ConfigProvider>
    );
};

export default App;

