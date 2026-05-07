import React, { useEffect, useMemo, useState } from "react";
import { Avatar, Breadcrumb, Button, Dropdown, Layout, Menu, Space, theme } from "antd";
import {
  DashboardOutlined,
  HomeOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ProjectOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { clearAuthRelatedCaches } from "@/services/auth";
import { prefetchMembers } from "@/services/member";
import { prefetchProjects } from "@/services/project";
import styles from "./index.module.scss";

const { Header, Sider, Content } = Layout;

const menuItems = [
  {
    key: "/dashboard",
    icon: <DashboardOutlined />,
    label: "仪表盘",
  },
  {
    key: "/projects",
    icon: <ProjectOutlined />,
    label: "项目列表",
  },
  {
    key: "/members",
    icon: <UserOutlined />,
    label: "项目成员",
  },
];

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  useEffect(() => {
    prefetchMembers({ skip: 0, limit: 200 });
    prefetchProjects({ skip: 0, limit: 10 });
    const timer = window.setTimeout(() => {
      prefetchProjects({ skip: 0, limit: 200 });
    }, 120);
    return () => window.clearTimeout(timer);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    clearAuthRelatedCaches();
    navigate("/login");
  };

  const currentUsername = localStorage.getItem("username") || "管理员";

  const currentMenuKey = useMemo(
    () => menuItems.find((item) => location.pathname.startsWith(item.key))?.key,
    [location.pathname],
  );

  const userMenuItems = [
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "退出登录",
      onClick: handleLogout,
    },
  ];

  const breadcrumbItems = useMemo(() => {
    const items: Array<{ title: React.ReactNode }> = [
      {
        title: (
          <Link to="/dashboard">
            <HomeOutlined />
            <span>首页</span>
          </Link>
        ),
      },
    ];

    if (currentMenuKey) {
      const currentMenuItem = menuItems.find((item) => item.key === currentMenuKey);
      if (currentMenuItem) {
        items.push({
          title: (
            <Space size={4}>
              {currentMenuItem.icon}
              <span>{currentMenuItem.label}</span>
            </Space>
          ),
        });
      }
    }

    if (location.pathname.includes("/projects/")) {
      if (location.pathname.includes("/resource/")) {
        items.push({ title: "资源管理" });
        if (
          location.pathname.endsWith("/edit")
          || location.pathname.includes("/create")
        ) {
          items.push({ title: "表单配置" });
        }
      } else if (location.pathname.includes("/external-resource/")) {
        items.push({ title: "外部资源" });
        if (location.pathname.endsWith("/edit")) {
          items.push({ title: "表单配置" });
        }
      } else if (location.pathname.endsWith("/edit") || location.pathname.includes("/create")) {
        items.push({ title: "表单配置" });
      } else if (/^\/projects\/\d+$/.test(location.pathname)) {
        items.push({ title: "项目详情" });
      }
    }

    return items;
  }, [currentMenuKey, location.pathname]);

  return (
    <Layout className={styles.layoutContainer}>
      <Header className={styles.header} style={{ background: colorBgContainer }}>
        <div className={styles.logoArea} style={{ width: collapsed ? 80 : 220 }}>
          <div className={styles.logoIcon}>IT</div>
          {!collapsed && <span className={styles.logoText}>IT-Project</span>}
        </div>

        <div className={styles.headerRight}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed((value) => !value)}
            style={{ fontSize: 16, width: 64, height: 64 }}
          />

          <Space size={20}>
            <Dropdown menu={{ items: userMenuItems }}>
              <Space className={styles.userInfo}>
                <Avatar
                  size="small"
                  icon={<UserOutlined />}
                  style={{ backgroundColor: "#1677ff" }}
                />
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
            selectedKeys={currentMenuKey ? [currentMenuKey] : []}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ borderRight: 0, padding: "16px 0" }}
          />
        </Sider>
        <Layout className={styles.contentWrapper}>
          <div className={styles.breadcrumbArea}>
            <Breadcrumb items={breadcrumbItems} />
          </div>
          <Content className={styles.mainContent}>{children}</Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
