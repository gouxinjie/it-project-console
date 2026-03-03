import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Space, Spin, Divider } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { getProjectExternalResources, updateProjectExternalResources } from '@/services/project';

const { TextArea } = Input;

const ProjectExternalResourceForm: React.FC = () => {
    const navigate = useNavigate();
    const { projectId } = useParams<{ projectId: string }>();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchResourceData();
    }, [projectId]);

    const fetchResourceData = async () => {
        setLoading(true);
        try {
            const data: any = await getProjectExternalResources(Number(projectId));
            form.setFieldsValue(data);
        } catch (error) {
            message.error('获取资源信息失败');
            navigate('/projects');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (values: any) => {
        setSubmitting(true);
        try {
            await updateProjectExternalResources(Number(projectId), values);
            message.success('配置更新成功');
            navigate('/projects');
        } catch (error) {
            message.error('更新失败');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        navigate('/projects');
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <Card title="外部资源" bordered={false} extra={<Button onClick={handleCancel}>返回</Button>}>
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                autoComplete="off"
                size="middle"
            >
                <Divider orientation="left">阿里云OSS</Divider>
                <Form.Item
                    label="阿里云OSS"
                    name="aliyun_oss"
                >
                    <TextArea
                        rows={4}
                        placeholder="请输入Bucket名称、Endpoint、AccessKey等信息"
                        showCount
                    />
                </Form.Item>

                <Divider orientation="left">数据库</Divider>
                <Form.Item
                    label="数据库"
                    name="database_config"
                >
                    <TextArea
                        rows={4}
                        placeholder="请输入数据库类型、连接地址、账号等信息"
                        showCount
                    />
                </Form.Item>

                <Divider orientation="left">Redis</Divider>
                <Form.Item
                    label="Redis"
                    name="redis_config"
                >
                    <TextArea
                        rows={4}
                        placeholder="请输入Redis连接地址、端口、密码等信息"
                        showCount
                    />
                </Form.Item>

                <Divider orientation="left">中间件</Divider>
                <Form.Item
                    label="其他中间件"
                    name="middleware_config"
                >
                    <TextArea
                        rows={4}
                        placeholder="请输入消息队列、配置中心等其他中间件配置"
                        showCount
                    />
                </Form.Item>

                <Divider orientation="left">其他</Divider>
                <Form.Item
                    label="其他"
                    name="other_config"
                >
                    <TextArea
                        rows={4}
                        placeholder="其他未归类的资源配置信息"
                        showCount
                    />
                </Form.Item>

                <Form.Item style={{ marginTop: 16 }}>
                    <Space size="large">
                        <Button type="primary" htmlType="submit" loading={submitting} style={{ width: 120 }}>
                            保存
                        </Button>
                        <Button onClick={handleCancel} style={{ width: 120 }}>
                            取消
                        </Button>
                    </Space>
                </Form.Item>
            </Form>
        </Card>
    );
};

export default ProjectExternalResourceForm;
