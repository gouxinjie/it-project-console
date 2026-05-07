import React, { useState } from "react";
import { Form, Input, Button, Checkbox, message, Typography } from "antd";
import {
  BarChartOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  UserOutlined,
  DeploymentUnitOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import styles from "./index.module.scss";

import { login, register } from "@/services/auth";

const { Title, Text } = Typography;

const loginInitialValues = {
  remember: true,
  username: "admin",
  password: "admin123!@#"
};

const workspaceSignals = [
  { value: "01", label: "项目基础信息闭环沉淀" },
  { value: "02", label: "代码与外部资源统一归档" },
  { value: "03", label: "成员协同与交接更清晰" }
];

const capabilityCards = [
  {
    icon: <DeploymentUnitOutlined />,
    title: "项目资产一屏收口",
    description: "从项目类型、负责人到部署与资源配置，建立统一的工作台视图。"
  },
  {
    icon: <BarChartOutlined />,
    title: "状态变化更易感知",
    description: "通过清晰的结构与数据视图，快速定位当前项目所处阶段和责任边界。"
  },
  {
    icon: <ThunderboltOutlined />,
    title: "更适合内部协作",
    description: "用于日常维护、交接巡检和多人协同场景，比散落文档更稳定。"
  }
];

const supportTags = ["Projects", "Resources", "Members"];

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [form] = Form.useForm();

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      if (isRegister) {
        // 注册逻辑
        await register(values);
        message.success("注册成功，请登录");
        setIsRegister(false);
        form.resetFields();
      } else {
        // 登录逻辑
        const loginData = {
          username: values.username,
          password: values.password
        };

        const res: any = await login(loginData);
        localStorage.setItem("token", res.access_token);
        // 存储用户名，以便在布局中显示
        localStorage.setItem("username", values.username);
        message.success("登录成功，欢迎访问企业IT项目管理平台");
        navigate("/dashboard");
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || (isRegister ? "注册失败" : "登录失败，请检查用户名或密码"));
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    const nextMode = !isRegister;
    setIsRegister(nextMode);
    form.resetFields();

    if (nextMode) {
      form.setFieldsValue({
        remember: false,
        username: undefined,
        email: undefined,
        password: undefined
      });
      return;
    }

    form.setFieldsValue(loginInitialValues);
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginWrapper}>
        <section className={styles.leftSection}>
          <div className={styles.brandContent}>
            <span className={styles.eyebrow}>Enterprise Delivery Console</span>
            <h1 className={styles.brandTitle}>让项目管理不止于记录，而是可协同、可追踪、可交付。</h1>
            <p className={styles.brandLead}>
              IT-Project-Console 以更清晰的视图收口项目、资源、成员和关键外部依赖， 适合企业内部长期沉淀和跨团队交接。
            </p>

            <div className={styles.featureRail}>
              {capabilityCards.map((item) => (
                <article key={item.title} className={styles.featureCard}>
                  <div className={styles.featureIcon}>{item.icon}</div>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.rightSection}>
          <div className={styles.authShell}>
            <div className={styles.loginCard}>
              <div className={styles.modeSwitch}>
                <button
                  type="button"
                  className={`${styles.modeButton} ${!isRegister ? styles.modeButtonActive : ""}`}
                  onClick={() => isRegister && toggleMode()}
                >
                  登录
                </button>
                <button
                  type="button"
                  className={`${styles.modeButton} ${isRegister ? styles.modeButtonActive : ""}`}
                  onClick={() => !isRegister && toggleMode()}
                >
                  注册
                </button>
              </div>

              <div className={styles.header}>
                <span className={styles.headerTag}>{isRegister ? "Create Workspace Access" : "Workspace Sign In"}</span>
                <Title level={2}>{isRegister ? "创建控制台账号" : "进入项目控制台"}</Title>
                <Text type="secondary">
                  {isRegister ? "完成注册后即可开始维护项目、资源与成员信息。" : "使用企业账号进入工作区，统一查看项目状态与交付信息。"}
                </Text>
              </div>

              <div className={styles.securityBanner}>
                <SafetyCertificateOutlined />
                <span>
                  {isRegister ? "注册采用普通用户默认权限，适合先快速进入系统。" : "当前调试环境已预填管理员账号，登录后可直接进入项目与成员管理。"}
                </span>
              </div>

              <Form
                form={form}
                name="login"
                className={styles.loginForm}
                initialValues={loginInitialValues}
                onFinish={onFinish}
                layout="vertical"
                size="large"
                requiredMark={false}
              >
                <Form.Item label="用户名" name="username" rules={[{ required: true, message: "请输入用户名" }]}>
                  <Input prefix={<UserOutlined className={styles.inputIcon} />} placeholder="请输入用户名" />
                </Form.Item>

                {isRegister && (
                  <Form.Item
                    label="邮箱"
                    name="email"
                    rules={[
                      { required: true, message: "请输入邮箱" },
                      { type: "email", message: "请输入有效的邮箱地址" }
                    ]}
                  >
                    <Input prefix={<SafetyCertificateOutlined className={styles.inputIcon} />} placeholder="请输入邮箱地址" />
                  </Form.Item>
                )}

                <Form.Item
                  label="密码"
                  name="password"
                  rules={[
                    { required: true, message: "请输入密码" },
                    { min: 6, message: "密码至少6位" }
                  ]}
                >
                  <Input.Password prefix={<LockOutlined className={styles.inputIcon} />} placeholder="请输入密码" />
                </Form.Item>

                <div className={styles.controlRow}>
                  {!isRegister && (
                    <Form.Item name="remember" valuePropName="checked" noStyle>
                      <Checkbox>保持登录状态</Checkbox>
                    </Form.Item>
                  )}
                  <button type="button" className={styles.inlineAction} onClick={toggleMode}>
                    {isRegister ? "已有账号？去登录" : "没有账号？开始注册"}
                  </button>
                </div>

                <Form.Item className={styles.submitItem}>
                  <Button type="primary" htmlType="submit" className={styles.submitButton} loading={loading} block size="large">
                    {isRegister ? "注册" : "登录"}
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Login;
