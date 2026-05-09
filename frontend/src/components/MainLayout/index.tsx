import React, { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Dropdown,
  Form,
  Input,
  Layout,
  Menu,
  Modal,
  Space,
  Tooltip,
  message,
  theme,
} from "antd";
import {
  BellOutlined,
  DashboardOutlined,
  HomeOutlined,
  LockOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ProjectOutlined,
  QuestionCircleOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Link, useLocation, useNavigate } from "react-router-dom";
import dayjs from "dayjs";

import { useAuth } from "@/contexts/AuthContext";
import { prefetchMembers } from "@/services/member";
import { prefetchProjects } from "@/services/project";
import { updateMyPassword } from "@/services/user";
import styles from "./index.module.scss";

const { Header, Sider, Content } = Layout;

// 密码强度校验正则：必须包含字母和数字
const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]+$/;

interface PasswordFormValues {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

/**
 * 全局布局组件
 * 包含侧边栏导航、顶部页眉（用户信息、修改密码、退出登录）以及主体内容区域
 */
const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false); // 侧边栏折叠状态
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false); // 修改密码弹窗状态
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false); // 修改密码提交状态
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const [passwordForm] = Form.useForm<PasswordFormValues>();
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  // 预取数据：在布局挂载时预加载常用的成员和项目数据，提升后续页面加载速度
  useEffect(() => {
    prefetchMembers({ skip: 0, limit: 200 });
    prefetchProjects({ skip: 0, limit: 10 });
    const timer = window.setTimeout(() => {
      prefetchProjects({ skip: 0, limit: 200 });
    }, 120);
    return () => window.clearTimeout(timer);
  }, []);

  /**
   * 动态生成左侧菜单项
   * 根据当前用户权限（是否为管理员）展示不同的菜单
   */
  const menuItems = useMemo(() => {
    const baseItems = [
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

    // 管理员额外可见“账号管理”
    if (currentUser?.is_superuser) {
      baseItems.push({
        key: "/users",
        icon: <SafetyCertificateOutlined />,
        label: "账号管理",
      });
    }

    return baseItems;
  }, [currentUser?.is_superuser]);

  const currentMenuKey = useMemo(
    () => menuItems.find((item) => location.pathname.startsWith(item.key))?.key,
    [location.pathname, menuItems],
  );

  const welcomeMessage = useMemo(() => {
    const hour = dayjs().hour();
    if (hour < 9) return "早安，开始处理今天的交付事项";
    if (hour < 12) return "上午好，保持当前推进节奏";
    if (hour < 14) return "午安，注意留出检查时间";
    if (hour < 18) return "下午好，继续完成关键收口";
    return "晚上好，辛苦了";
  }, []);

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
        if (location.pathname.endsWith("/edit") || location.pathname.includes("/create")) {
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
  }, [currentMenuKey, location.pathname, menuItems]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handlePasswordSubmit = async () => {
    try {
      const values = await passwordForm.validateFields();
      setIsSubmittingPassword(true);
      await updateMyPassword({
        current_password: values.current_password,
        new_password: values.new_password,
      });
      message.success("密码已更新");
      setIsPasswordModalOpen(false);
      passwordForm.resetFields();
    } catch (error) {
      const formError = error as { errorFields?: unknown[]; response?: { data?: { detail?: string } } };
      if (formError.errorFields) {
        return;
      }
      message.error(formError.response?.data?.detail || "修改密码失败");
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const username = currentUser?.username ?? "admin";
  const roleLabel = currentUser?.is_superuser ? "管理员" : "普通用户";

  return (
    <Layout className={styles.layoutContainer}>
      <Header className={styles.header} style={{ background: colorBgContainer }}>
        <div className={styles.logoArea} style={{ width: collapsed ? 80 : 220 }}>
          <div className={styles.logoIcon}>IT</div>
          {!collapsed ? <span className={styles.logoText}>IT-Project</span> : null}
        </div>

        <div className={styles.headerRight}>
          <div className={styles.headerLeftAction}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed((value) => !value)}
              style={{ fontSize: 16, width: 64, height: 64 }}
            />
            <div className={styles.welcomeContainer}>
              <span className={styles.welcomeText}>{welcomeMessage}</span>
            </div>
          </div>

          <Space size={20} className={styles.headerActions}>
            <Space size={16} className={styles.utilityIcons}>
              <Tooltip title="通知">
                <Badge dot offset={[-2, 4]} color="#ef4444">
                  <Button type="text" icon={<BellOutlined />} className={styles.actionIcon} />
                </Badge>
              </Tooltip>
              <Tooltip title="帮助文档">
                <Button type="text" icon={<QuestionCircleOutlined />} className={styles.actionIcon} />
              </Tooltip>
            </Space>

            <Dropdown
              menu={{
                items: [
                  {
                    key: "password",
                    icon: <LockOutlined />,
                    label: "修改密码",
                  },
                  {
                    key: "logout",
                    icon: <LogoutOutlined />,
                    label: "退出登录",
                  },
                ],
                onClick: ({ key }) => {
                  if (key === "password") {
                    passwordForm.resetFields();
                    setIsPasswordModalOpen(true);
                    return;
                  }
                  if (key === "logout") {
                    handleLogout();
                  }
                },
              }}
            >
              <Space className={styles.userInfo}>
                <Avatar
                  size={32}
                  icon={<UserOutlined />}
                  style={{ backgroundColor: "#1e293b", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}
                />
                <div className={styles.userMeta}>
                  <span className={styles.userName}>{username}</span>
                  <span className={styles.userRole}>{roleLabel}</span>
                </div>
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
            style={{ borderRight: 0 }}
          />
        </Sider>

        <Layout className={styles.contentWrapper}>
          <div className={styles.breadcrumbArea}>
            <Breadcrumb items={breadcrumbItems} />
          </div>
          <Content className={styles.mainContent}>
            <div className="page-transition-enter" key={location.pathname}>
              {children}
            </div>
          </Content>
        </Layout>
      </Layout>

      <Modal
        title="修改密码"
        open={isPasswordModalOpen}
        onOk={handlePasswordSubmit}
        okText="保存"
        cancelText="取消"
        confirmLoading={isSubmittingPassword}
        onCancel={() => {
          setIsPasswordModalOpen(false);
          passwordForm.resetFields();
        }}
        destroyOnClose
      >
        <Form form={passwordForm} layout="vertical" requiredMark={false}>
          <Form.Item
            label="当前密码"
            name="current_password"
            rules={[{ required: true, message: "请输入当前密码" }]}
          >
            <Input.Password placeholder="请输入当前密码" />
          </Form.Item>
          <Form.Item
            label="新密码"
            name="new_password"
            rules={[
              { required: true, message: "请输入新密码" },
              { min: 6, message: "密码至少 6 位" },
              {
                pattern: passwordPattern,
                message: "密码需包含字母和数字，且仅支持字母数字",
              },
            ]}
            extra="密码需至少 6 位，并包含字母和数字，且仅支持字母数字。"
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
          <Form.Item
            label="确认新密码"
            name="confirm_password"
            dependencies={["new_password"]}
            rules={[
              { required: true, message: "请再次输入新密码" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("new_password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("两次输入的密码不一致"));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default MainLayout;
