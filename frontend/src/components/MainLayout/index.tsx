import React, { useState } from 'react';
import { Layout, Menu, Button, theme, Avatar, Dropdown, Breadcrumb, Space } from 'antd';
import {
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    DashboardOutlined,
    ProjectOutlined,
    UserOutlined,
    LogoutOutlined,
    SearchOutlined,
    BellOutlined,
    GlobalOutlined,
    SkinOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './index.module.scss';

const { Header, Sider, Content } = Layout;

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const {
        token: { colorBgContainer },
    } = theme.useToken();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        navigate('/login');
    };

    // 获取当前用户名
    const currentUsername = localStorage.getItem('username') || '管理员';

    const menuItems = [
        {
            key: '/dashboard',
            icon: <DashboardOutlined />,
            label: '仪表盘',
        },
        {
            key: '/projects',
            icon: <ProjectOutlined />,
            label: '项目列表',
        },
        {
            key: '/members',
            icon: <UserOutlined />,
            label: '项目成员',
        },
    ];

    const userMenuItems = [
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: '退出登录',
            onClick: handleLogout,
        },
    ];

    const breadcrumbItems = [
        { title: '首页' },
        { title: menuItems.find(item => item.key === location.pathname)?.label || '当前页面' }
    ];

    return (
        <Layout className={styles.layoutContainer}>
            <Header className={styles.header} style={{ background: colorBgContainer }}>
                <div
                    className={styles.logoArea}
                    style={{ width: collapsed ? 80 : 220 }}
                >
                    <div className={styles.logoIcon}>IT</div>
                    {!collapsed && <span className={styles.logoText}>IT-Project</span>}
                </div>

                <div className={styles.headerRight}>
                    <Button
                        type="text"
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => setCollapsed(!collapsed)}
                        style={{ fontSize: '16px', width: 64, height: 64 }}
                    />

                    <Space size={20}>
                        {/* <Button type="text" icon={<SearchOutlined />} />
                        <Button type="text" icon={<GlobalOutlined />} />
                        <Button type="text" icon={<BellOutlined />} />
                        <Button type="text" icon={<SkinOutlined />} /> */}
                        <Dropdown menu={{ items: userMenuItems }}>
                            <Space className={styles.userInfo}>
                                <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
                                <span className={styles.userName}>{currentUsername}</span>
                            </Space>
                        </Dropdown>
                    </Space>
                </div>
            </Header>
            <Layout>
                <Sider
                    trigger={null}
                    collapsible
                    collapsed={collapsed}
                    theme="light"
                    width={220}
                    className={styles.sider}
                >
                    <Menu
                        mode="inline"
                        selectedKeys={[location.pathname]}
                        items={menuItems}
                        onClick={({ key }) => navigate(key)}
                        style={{ borderRight: 0, padding: '16px 0' }}
                    />
                </Sider>
                <Layout className={styles.contentWrapper}>
                    <div className={styles.breadcrumbArea}>
                        <Breadcrumb items={breadcrumbItems} />
                    </div>
                    <Content className={styles.mainContent}>
                        {children}
                    </Content>
                </Layout>
            </Layout>
        </Layout>
    );
};

export default MainLayout;
