import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Card, message, Space, Spin, Row, Col } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { getProject, createProject, updateProject } from '@/services/project';
import { getMembers } from '@/services/member';

const { Option } = Select;
const { TextArea } = Input;

const ProjectForm: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [members, setMembers] = useState<any[]>([]);
    const isEdit = !!id;

    useEffect(() => {
        fetchMembers();
        if (isEdit) {
            fetchProjectData();
        }
    }, [id]);

    const fetchMembers = async () => {
        try {
            const res: any = await getMembers();
            setMembers(res);
        } catch (error) {
            console.error('获取成员列表失败', error);
        }
    };

    const fetchProjectData = async () => {
        setLoading(true);
        try {
            const data: any = await getProject(Number(id));
            // 将逗号分隔的字符串转换为数组，以适配多选Select
            if (data.project_leader && typeof data.project_leader === 'string') {
                data.project_leader = data.project_leader.split(',').map((s: string) => s.trim());
            }
            form.setFieldsValue(data);
        } catch (error) {
            message.error('获取项目信息失败');
            navigate('/projects');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (values: any) => {
        setSubmitting(true);
        try {
            // 将数组转换回逗号分隔的字符串
            const submitValues = { ...values };
            if (Array.isArray(submitValues.project_leader)) {
                submitValues.project_leader = submitValues.project_leader.join(', ');
            }

            if (isEdit) {
                await updateProject(Number(id), submitValues);
                message.success('更新成功');
            } else {
                await createProject(submitValues);
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
        <Card title={isEdit ? '编辑项目' : '创建项目'} bordered={false} extra={<Button onClick={handleCancel}>返回</Button>}>
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                autoComplete="off"
                size="middle"
            >
                <Row gutter={24}>
                    <Col span={24}>
                        <Form.Item
                            label="项目名称"
                            name="project_name"
                            rules={[
                                { required: true, message: '请输入项目名称' },
                                { max: 100, message: '项目名称不能超过100个字符' }
                            ]}
                        >
                            <Input placeholder="请输入项目名称" />
                        </Form.Item>
                    </Col>
                    
                    <Col span={12}>
                        <Form.Item
                            label="项目类型"
                            name="project_type"
                            rules={[{ required: true, message: '请选择项目类型' }]}
                        >
                            <Select placeholder="请选择项目类型">
                                <Option value="web应用">web应用</Option>
                                <Option value="钉钉微应用">钉钉微应用</Option>
                                <Option value="小程序">小程序</Option>
                                <Option value="低代码">低代码</Option>
                            </Select>
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item
                            label="项目状态"
                            name="project_status"
                            rules={[{ required: true, message: '请选择项目状态' }]}
                        >
                            <Select placeholder="请选择项目状态">
                                <Option value="开发中">开发中</Option>
                                <Option value="已上线">已上线</Option>
                                <Option value="已下线">已下线</Option>
                            </Select>
                        </Form.Item>
                    </Col>

                    <Col span={24}>
                        <Form.Item
                            label="项目描述"
                            name="project_desc"
                        >
                            <TextArea
                                rows={4}
                                placeholder="请输入项目描述"
                                maxLength={500}
                                showCount
                            />
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item
                            label="技术框架"
                            name="tech_framework"
                        >
                            <Input placeholder="例如：React + FastAPI" maxLength={200} />
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item
                            label="项目负责人"
                            name="project_leader"
                        >
                            <Select
                                mode="multiple"
                                placeholder="请选择项目负责人"
                                maxTagCount="responsive"
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

                    <Col span={8}>
                        <Form.Item
                            label="业务方"
                            name="business_unit"
                            rules={[{ required: true, message: '请选择业务方' }]}
                        >
                            <Select placeholder="请选择业务方">
                                <Option value="集团总部">集团总部</Option>
                                <Option value="董事办">董事办</Option>
                                <Option value="风控">风控</Option>
                                <Option value="投管">投管</Option>
                                <Option value="财务">财务</Option>
                                <Option value="人力资源">人力资源</Option>
                                <Option value="投融资">投融资</Option>
                            </Select>
                        </Form.Item>
                    </Col>

                    <Col span={8}>
                        <Form.Item
                            label="业务类型"
                            name="business_type"
                            rules={[{ required: true, message: '请选择业务类型' }]}
                        >
                            <Select placeholder="请选择业务类型">
                                <Option value="运维">运维</Option>
                                <Option value="运营">运营</Option>
                                <Option value="新需求">新需求</Option>
                            </Select>
                        </Form.Item>
                    </Col>

                    <Col span={8}>
                        <Form.Item
                            label="所属系统"
                            name="belong_system"
                            rules={[{ required: true, message: '请输入所属系统' }]}
                        >
                            <Input placeholder="请输入所属系统" maxLength={50} />
                        </Form.Item>
                    </Col>

                    <Col span={24}>
                        <Form.Item
                            label="备注"
                            name="remarks"
                        >
                            <TextArea
                                rows={3}
                                placeholder="请输入备注信息"
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

export default ProjectForm;
