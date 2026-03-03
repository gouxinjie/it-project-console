import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Card, message, Space, Spin, Row, Col, Divider } from 'antd';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getProjectResource, createProjectResource, updateProjectResource, getProjectResources } from '@/services/project';
import { getMembers } from '@/services/member';

const { Option } = Select;
const { TextArea } = Input;

const ProjectResourceForm: React.FC = () => {
    const navigate = useNavigate();
    const { projectId, resourceId } = useParams<{ projectId: string; resourceId: string }>();
    const [searchParams] = useSearchParams();
    const forcedType = searchParams.get('type'); // 获取 URL 参数中的 type
    
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [existingTypes, setExistingTypes] = useState<string[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const isEdit = !!resourceId;

    useEffect(() => {
        fetchMembers();
        if (isEdit) {
            fetchResourceData();
        } else {
            // 如果是新建，先获取已有的资源类型
            fetchExistingResources();
            if (forcedType) {
                form.setFieldsValue({ resource_type: forcedType });
            }
        }
    }, [resourceId, forcedType]);

    const fetchMembers = async () => {
        try {
            const res: any = await getMembers();
            setMembers(res);
        } catch (error) {
            console.error('获取成员列表失败', error);
        }
    };

    const fetchExistingResources = async () => {
        if (!projectId) return;
        try {
            const res: any = await getProjectResources(Number(projectId));
            const types = res.resources.map((r: any) => r.resource_type);
            setExistingTypes(types);
        } catch (error) {
            console.error('获取项目资源失败', error);
        }
    };

    const fetchResourceData = async () => {
        setLoading(true);
        try {
            const data: any = await getProjectResource(Number(projectId), Number(resourceId));
            if (data.developer && typeof data.developer === 'string') {
                data.developer = data.developer.split(',').map((s: string) => s.trim());
            }
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
            const submitValues = { ...values };
            if (Array.isArray(submitValues.developer)) {
                submitValues.developer = submitValues.developer.join(', ');
            }
            
            if (isEdit) {
                await updateProjectResource(Number(projectId), Number(resourceId), submitValues);
                message.success('更新成功');
            } else {
                // 再次检查是否已存在该类型的资源
                if (existingTypes.includes(submitValues.resource_type)) {
                    message.error(`该项目已存在${submitValues.resource_type}资源，无法重复添加`);
                    setSubmitting(false);
                    return;
                }
                await createProjectResource(Number(projectId), submitValues);
                message.success('创建成功');
            }
            navigate('/projects');
        } catch (error) {
            message.error(isEdit ? '更新失败' : '创建失败');
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
        <Card title={isEdit ? '编辑子项目' : '添加子项目'} bordered={false} extra={<Button onClick={handleCancel}>返回</Button>}>
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                autoComplete="off"
                size="middle"
            >
                <Divider orientation="left">基本信息</Divider>
                <Row gutter={24}>
                    <Col span={12}>
                        <Form.Item
                            label="子项目类型"
                            name="resource_type"
                            rules={[{ required: true, message: '请选择子项目类型' }]}
                        >
                            <Select placeholder="请选择子项目类型" disabled={!!forcedType && !isEdit}>
                                <Option value="前端" disabled={!isEdit && existingTypes.includes('前端')}>前端</Option>
                                <Option value="后端" disabled={!isEdit && existingTypes.includes('后端')}>后端</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            label="Git仓库"
                            name="git_repo"
                            rules={[{ required: true, message: '请输入Git仓库地址' }]}
                        >
                            <Input placeholder="请输入Git仓库地址" maxLength={200} />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            label="技术框架"
                            name="tech_framework"
                            rules={[{ required: true, message: '请输入技术框架' }]}
                        >
                            <Input placeholder="例如：React 18 + TypeScript" maxLength={200} />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            label="开发人员"
                            name="developer"
                            rules={[{ required: true, message: '请选择开发人员' }]}
                        >
                            <Select
                                placeholder="请选择开发人员"
                                mode="multiple"
                                allowClear
                                showSearch
                                optionFilterProp="children"
                            >
                                {members.map(member => (
                                    <Option key={member.member_id} value={member.member_name}>{member.member_name}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>

                <Divider orientation="left">部署信息</Divider>
                <Row gutter={24}>
                    <Col span={8}>
                        <Form.Item
                            label="部署方式"
                            name="deploy_method"
                        >
                            <Select placeholder="请选择部署方式" allowClear>
                                <Option value="Docker">Docker</Option>
                                <Option value="K8s">K8s</Option>
                                <Option value="Jenkins">Jenkins</Option>
                                <Option value="云托管">云托管</Option>
                                <Option value="手动部署">手动部署</Option>
                                <Option value="其他">其他</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item
                            label="发布分支"
                            name="deploy_branch"
                        >
                            <Input placeholder="例如：main, develop, production" maxLength={50} />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item
                            label="部署地址/堡垒机IP"
                            name="deploy_addr"
                        >
                            <Input placeholder="请输入部署地址或堡垒机IP" maxLength={100} />
                        </Form.Item>
                    </Col>
                    <Col span={24}>
                        <Form.Item
                            label="部署步骤"
                            name="deploy_steps"
                        >
                            <TextArea
                                rows={4}
                                placeholder="请输入部署步骤，每行一个步骤"
                                maxLength={1000}
                                showCount
                            />
                        </Form.Item>
                    </Col>
                </Row>

                <Divider orientation="left">环境信息</Divider>
                <Row gutter={24}>
                    <Col span={12}>
                        <Form.Item
                            label="生产域名"
                            name="prod_domain"
                        >
                            <Input placeholder="请输入生产环境域名" maxLength={100} />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            label="UAT域名"
                            name="uat_domain"
                        >
                            <Input placeholder="请输入UAT环境域名" maxLength={100} />
                        </Form.Item>
                    </Col>
                </Row>

                <Divider orientation="left">其他信息</Divider>
                <Row gutter={24}>
                    <Col span={12}>
                        <Form.Item
                            label="项目备注"
                            name="resource_remarks"
                        >
                            <TextArea
                                rows={3}
                                placeholder="请输入备注信息"
                                maxLength={500}
                                showCount
                            />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            label="特别说明"
                            name="special_note"
                        >
                            <TextArea
                                rows={3}
                                placeholder="请输入特别说明"
                                maxLength={500}
                                showCount
                            />
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item style={{ marginTop: 16 }}>
                    <Space size="large">
                        <Button type="primary" htmlType="submit" loading={submitting} style={{ width: 120 }}>
                            {isEdit ? '更新' : '创建'}
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

export default ProjectResourceForm;
