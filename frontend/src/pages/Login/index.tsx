import React, { useState } from 'react';
import { Form, Input, Button, Checkbox, message, Typography, Space } from 'antd';
import { UserOutlined, LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import styles from './index.module.scss';

import { login, register } from '@/services/auth';

const { Title, Text } = Typography;

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
                message.success('注册成功，请登录');
                setIsRegister(false);
                form.resetFields();
            } else {
                // 登录逻辑
                const loginData = {
                    username: values.username,
                    password: values.password
                };

                const res: any = await login(loginData);
                localStorage.setItem('token', res.access_token);
                // 存储用户名，以便在布局中显示
                localStorage.setItem('username', values.username);
                message.success('登录成功，欢迎访问企业IT项目管理平台');
                navigate('/dashboard');
            }
        } catch (error: any) {
            message.error(error.response?.data?.detail || (isRegister ? '注册失败' : '登录失败，请检查用户名或密码'));
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setIsRegister(!isRegister);
        form.resetFields();
    };

    return (
        <div className={styles.loginContainer}>
            <div className={styles.leftSection}>
                <div className={styles.brandContent}>
                    <h1>IT-Project-Console</h1>
                    <p>企业IT项目管理平台</p>
                    <div style={{ marginTop: 40, opacity: 0.8 }}>
                        <Space direction="vertical" size="middle">
                            <Text style={{ color: 'white' }}>• 全链路数字化管理</Text>
                            <Text style={{ color: 'white' }}>• 资源高效协同共享</Text>
                            <Text style={{ color: 'white' }}>• 业务数据实时可视化</Text>
                        </Space>
                    </div>
                </div>
            </div>

            <div className={styles.rightSection}>
                <div className={styles.loginCard}>
                    <div className={styles.header}>
                        <Title level={2}>{isRegister ? '创建账号' : '欢迎回来'}</Title>
                        <Text type="secondary">{isRegister ? '注册一个新账号以开始使用' : '请登录您的账号以继续'}</Text>
                    </div>

                    <Form
                        form={form}
                        name="login"
                        className={styles.loginForm}
                        initialValues={{
                            remember: true,
                            username: 'admin',
                            password: 'admin123!@#'
                        }}
                        onFinish={onFinish}
                        layout="vertical"
                        size="middle"
                    >
                        <Form.Item
                            name="username"
                            rules={[{ required: true, message: '请输入用户名' }]}
                        >
                            <Input
                                prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
                                placeholder="用户名"
                            />
                        </Form.Item>

                        {isRegister && (
                            <Form.Item
                                name="email"
                                rules={[
                                    { required: true, message: '请输入邮箱' },
                                    { type: 'email', message: '请输入有效的邮箱地址' }
                                ]}
                            >
                                <Input
                                    prefix={<SafetyCertificateOutlined style={{ color: '#bfbfbf' }} />}
                                    placeholder="邮箱"
                                />
                            </Form.Item>
                        )}

                        <Form.Item
                            name="password"
                            rules={[
                                { required: true, message: '请输入密码' },
                                { min: 6, message: '密码至少6位' }
                            ]}
                        >
                            <Input.Password
                                prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                                placeholder="密码"
                            />
                        </Form.Item>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                            {!isRegister && (
                                <Form.Item name="remember" valuePropName="checked" noStyle>
                                    <Checkbox>保持登录状态</Checkbox>
                                </Form.Item>
                            )}
                            <a onClick={toggleMode} style={{ fontSize: 14, cursor: 'pointer', marginLeft: isRegister ? 'auto' : 0 }}>
                                {isRegister ? '已有账号？去登录' : '开始注册'}
                            </a>
                        </div>

                        <Form.Item>
                            <Button
                                type="primary"
                                htmlType="submit"
                                className="w-full"
                                loading={loading}
                                block
                                size="large"
                            >
                                {isRegister ? '注册' : '登录'}
                            </Button>
                        </Form.Item>
                    </Form>
                </div>
            </div>
        </div>
    );
};

export default Login;

