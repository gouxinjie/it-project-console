import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Form,
  Input,
  Typography,
  message,
} from "antd";
import {
  BarChartOutlined,
  DeploymentUnitOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { getAuthSettings, login, register } from "@/services/auth";
import type { UserRegisterPayload } from "@/types/user";
import styles from "./index.module.scss";

const { Title, Text } = Typography;

const devAdminUsername = import.meta.env.VITE_DEV_ADMIN_USERNAME ?? "admin";
const devAdminPassword = import.meta.env.VITE_DEV_ADMIN_PASSWORD ?? "";

const loginInitialValues = {
  remember: true,
  username: devAdminUsername,
  password: devAdminPassword,
};

const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]+$/;

const capabilityCards = [
  {
    icon: <DeploymentUnitOutlined />,
    title: "项目资产一屏收口",
    description: "从项目类型、负责人到部署和资源配置，建立统一的工作台视图。",
  },
  {
    icon: <BarChartOutlined />,
    title: "状态变化更易感知",
    description: "通过清晰的结构和数据视图，快速定位当前项目阶段与责任边界。",
  },
  {
    icon: <ThunderboltOutlined />,
    title: "更适合内部协作",
    description: "适合日常维护、交接巡检和多人协同场景，比散落文档更稳定。",
  },
];

interface LoginFormValues {
  username: string;
  email?: string;
  password: string;
  confirm_password?: string;
  remember?: boolean;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { setAuthenticatedToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [allowPublicRegistration, setAllowPublicRegistration] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [form] = Form.useForm<LoginFormValues>();

  useEffect(() => {
    let active = true;

    getAuthSettings()
      .then((settings) => {
        if (!active) {
          return;
        }
        setAllowPublicRegistration(settings.allow_public_registration);
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setAllowPublicRegistration(false);
      })
      .finally(() => {
        if (active) {
          setSettingsLoaded(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!allowPublicRegistration && isRegister) {
      setIsRegister(false);
      form.setFieldsValue(loginInitialValues);
    }
  }, [allowPublicRegistration, form, isRegister]);

  const shouldWarnTransport = useMemo(() => {
    const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    return !isLocalhost && window.location.protocol !== "https:";
  }, []);

  const toggleMode = () => {
    if (!allowPublicRegistration) {
      return;
    }

    const nextMode = !isRegister;
    setIsRegister(nextMode);
    form.resetFields();

    if (nextMode) {
      form.setFieldsValue({
        remember: false,
        username: "",
        email: "",
        password: "",
        confirm_password: "",
      });
      return;
    }

    form.setFieldsValue(loginInitialValues);
  };

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);

    try {
      if (isRegister) {
        const payload: UserRegisterPayload = {
          username: values.username.trim(),
          email: values.email?.trim() ?? "",
          password: values.password,
        };
        await register(payload);
        message.success("注册成功，请使用新账号登录");
        setIsRegister(false);
        form.setFieldsValue(loginInitialValues);
        return;
      }

      const response = await login({
        username: values.username.trim(),
        password: values.password,
      });
      await setAuthenticatedToken(response.access_token);
      message.success("登录成功");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      const requestError = error as { response?: { data?: { detail?: string } } };
      message.error(requestError.response?.data?.detail || (isRegister ? "注册失败" : "登录失败"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginWrapper}>
        <section className={styles.leftSection}>
          <div className={styles.brandContent}>
            <span className={styles.eyebrow}>Enterprise Delivery Console</span>
            <h1 className={styles.brandTitle}>
              让项目管理不止于记录，而是可协同、可追踪、可交付。
            </h1>
            <p className={styles.brandLead}>
              IT-Project-Console 以更清晰的视图收口项目、资源、成员和关键外部依赖，
              适合企业内部长期沉淀和跨团队交接。
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
              {allowPublicRegistration ? (
                <div className={styles.modeSwitch}>
                  <button
                    type="button"
                    className={`${styles.modeButton} ${!isRegister ? styles.modeButtonActive : ""}`}
                    onClick={() => {
                      if (isRegister) {
                        toggleMode();
                      }
                    }}
                  >
                    登录
                  </button>
                  <button
                    type="button"
                    className={`${styles.modeButton} ${isRegister ? styles.modeButtonActive : ""}`}
                    onClick={() => {
                      if (!isRegister) {
                        toggleMode();
                      }
                    }}
                  >
                    注册
                  </button>
                </div>
              ) : null}

              <div className={styles.header}>
                <span className={styles.headerTag}>
                  {isRegister ? "Create Workspace Access" : "Workspace Sign In"}
                </span>
                <Title level={2}>
                  {isRegister ? "创建控制台账号" : "进入项目控制台"}
                </Title>
                <Text type="secondary">
                  {isRegister
                    ? "注册完成后即可登录并进入工作区。"
                    : devAdminPassword
                      ? "当前为本地开发模式，管理员账号和默认初始化密码已直接显示。"
                      : "管理员用户名 admin 已预填，请输入对应密码后登录。"}
                </Text>
              </div>

              {/* {!isRegister && devAdminPassword ? (
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                  message="当前显示的是本地开发用的默认管理员初始化密码；如果该管理员账号已存在且密码被修改，请以数据库当前密码为准。"
                />
              ) : null} */}

              {shouldWarnTransport ? (
                <Alert
                  type="warning"
                  showIcon
                  style={{ marginBottom: 16 }}
                  message="当前访问不是 HTTPS。非本地环境下请通过 HTTPS 登录、注册和修改密码。"
                />
              ) : null}

              {!allowPublicRegistration && settingsLoaded ? (
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                  message="当前环境已关闭公开注册，请联系管理员创建账号。"
                />
              ) : null}

              <Form<LoginFormValues>
                form={form}
                name="login"
                className={styles.loginForm}
                initialValues={loginInitialValues}
                onFinish={onFinish}
                layout="vertical"
                size="large"
                requiredMark={false}
              >
                <Form.Item
                  label="用户名"
                  name="username"
                  rules={[{ required: true, message: "请输入用户名" }]}
                >
                  <Input
                    prefix={<UserOutlined className={styles.inputIcon} />}
                    placeholder="请输入用户名"
                    autoComplete="username"
                  />
                </Form.Item>

                {isRegister ? (
                  <Form.Item
                    label="邮箱"
                    name="email"
                    rules={[
                      { required: true, message: "请输入邮箱" },
                      { type: "email", message: "请输入有效的邮箱地址" },
                    ]}
                  >
                    <Input
                      prefix={<SafetyCertificateOutlined className={styles.inputIcon} />}
                      placeholder="请输入邮箱地址"
                      autoComplete="email"
                    />
                  </Form.Item>
                ) : null}

                <Form.Item
                  label="密码"
                  name="password"
                  rules={[
                    { required: true, message: "请输入密码" },
                    ...(isRegister
                      ? [
                          { min: 6, message: "密码至少 6 位" },
                          {
                            pattern: passwordPattern,
                            message: "密码需包含字母和数字，且仅支持字母数字",
                          },
                        ]
                      : []),
                  ]}
                  extra={isRegister ? "密码需至少 6 位，并包含字母和数字，且仅支持字母数字。" : undefined}
                >
                  <Input.Password
                    prefix={<LockOutlined className={styles.inputIcon} />}
                    placeholder="请输入密码"
                    autoComplete={isRegister ? "new-password" : "current-password"}
                  />
                </Form.Item>

                {isRegister ? (
                  <Form.Item
                    label="确认密码"
                    name="confirm_password"
                    dependencies={["password"]}
                    rules={[
                      { required: true, message: "请再次输入密码" },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue("password") === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error("两次输入的密码不一致"));
                        },
                      }),
                    ]}
                  >
                    <Input.Password
                      prefix={<LockOutlined className={styles.inputIcon} />}
                      placeholder="请再次输入密码"
                      autoComplete="new-password"
                    />
                  </Form.Item>
                ) : null}

                <div className={styles.controlRow}>
                  {!isRegister ? (
                    <Form.Item name="remember" valuePropName="checked" noStyle>
                      <Checkbox>保持登录状态</Checkbox>
                    </Form.Item>
                  ) : (
                    <span />
                  )}

                  {allowPublicRegistration ? (
                    <button type="button" className={styles.inlineAction} onClick={toggleMode}>
                      {isRegister ? "已有账号？去登录" : "没有账号？开始注册"}
                    </button>
                  ) : null}
                </div>

                <Form.Item className={styles.submitItem}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    className={styles.submitButton}
                    loading={loading}
                    block
                    size="large"
                  >
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
