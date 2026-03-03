import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, Card, Modal, Descriptions, message, Form } from 'antd';
import { PlusOutlined, SearchOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { getMembers, createMember, updateMember, deleteMember } from '@/services/member';

const { confirm } = Modal;
const { TextArea } = Input;

const MemberList: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [dataSource, setDataSource] = useState<any[]>([]);
    const [searchText, setSearchText] = useState('');
    const [form] = Form.useForm();
    const [editingMember, setEditingMember] = useState<any>(null);

    const fetchMembers = async () => {
        setLoading(true);
        try {
            const params = searchText ? { search: searchText } : {};
            const data: any = await getMembers(params);
            setDataSource(data.map((item: any) => ({
                ...item,
                key: item.member_id,
            })));
        } catch (error) {
            message.error('获取人员列表失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, []);

    const handleDelete = (member: any) => {
        confirm({
            title: '确认删除',
            icon: <ExclamationCircleOutlined />,
            content: `确定要删除成员"${member.member_name}"吗？`,
            okText: '确认',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
                try {
                    await deleteMember(member.member_id);
                    message.success('删除成功');
                    fetchMembers();
                } catch (error) {
                    message.error('删除失败');
                }
            }
        });
    };

    const handleEdit = (member: any) => {
        setEditingMember(member);
        form.setFieldsValue(member);
        setIsEditModalOpen(true);
    };

    const handleAdd = () => {
        setEditingMember(null);
        form.resetFields();
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = async () => {
        try {
            const values = await form.validateFields();
            if (editingMember) {
                await updateMember(editingMember.member_id, values);
                message.success('更新成功');
            } else {
                await createMember(values);
                message.success('创建成功');
            }
            setIsEditModalOpen(false);
            fetchMembers();
        } catch (error) {
            message.error('操作失败');
        }
    };

    const columns = [
        {
            title: '姓名',
            dataIndex: 'member_name',
            key: 'member_name',
            render: (text: string, record: any) => (
                <Button type="link" onClick={() => { setSelectedMember(record); setIsModalOpen(true); }}>
                    {text}
                </Button>
            )
        },
        { title: '岗位', dataIndex: 'position', key: 'position' },
        { title: '技术栈', dataIndex: 'tech_stack', key: 'tech_stack', ellipsis: true },
        { title: '联系电话', dataIndex: 'phone', key: 'phone' },
        { title: '邮箱', dataIndex: 'email', key: 'email' },
        {
            title: '操作',
            key: 'action',
            render: (_: any, record: any) => (
                <Space size="middle">
                    <Button type="link" onClick={() => handleEdit(record)}>编辑</Button>
                    <Button type="link" danger onClick={() => handleDelete(record)}>删除</Button>
                </Space>
            ),
        },
    ];

    return (
        <div className="space-y-4">
            <Card>
                <div className="flex gap-4">
                    <Input 
                        prefix={<SearchOutlined />} 
                        placeholder="搜索姓名" 
                        className="w-64" 
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        onPressEnter={fetchMembers}
                    />
                    <Button type="primary" onClick={fetchMembers}>搜索</Button>
                    <Button icon={<PlusOutlined />} onClick={handleAdd}>新增成员</Button>
                </div>
            </Card>

            <Card>
                <Table columns={columns} dataSource={dataSource} loading={loading} />
            </Card>

            <Modal
                title="成员详情"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                width={700}
            >
                {selectedMember && (
                    <Descriptions bordered column={1}>
                        <Descriptions.Item label="姓名">{selectedMember.member_name}</Descriptions.Item>
                        <Descriptions.Item label="岗位">{selectedMember.position}</Descriptions.Item>
                        <Descriptions.Item label="联系电话">{selectedMember.phone}</Descriptions.Item>
                        <Descriptions.Item label="邮箱">{selectedMember.email}</Descriptions.Item>
                        <Descriptions.Item label="技术栈">
                            <div className="bg-gray-50 p-2 rounded">
                                {selectedMember.tech_stack}
                            </div>
                        </Descriptions.Item>
                    </Descriptions>
                )}
            </Modal>

            <Modal
                title={editingMember ? "编辑成员" : "新增成员"}
                open={isEditModalOpen}
                onOk={handleEditSubmit}
                onCancel={() => setIsEditModalOpen(false)}
                width={600}
            >
                <Form
                    form={form}
                    layout="vertical"
                >
                    <Form.Item
                        label="姓名"
                        name="member_name"
                        rules={[{ required: true, message: '请输入姓名' }]}
                    >
                        <Input placeholder="请输入姓名" maxLength={50} />
                    </Form.Item>
                    <Form.Item
                        label="岗位"
                        name="position"
                        rules={[{ required: true, message: '请输入岗位' }]}
                    >
                        <Input placeholder="请输入岗位" maxLength={100} />
                    </Form.Item>
                    <Form.Item
                        label="联系电话"
                        name="phone"
                    >
                        <Input placeholder="请输入联系电话" maxLength={20} />
                    </Form.Item>
                    <Form.Item
                        label="邮箱"
                        name="email"
                        rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}
                    >
                        <Input placeholder="请输入邮箱" maxLength={100} />
                    </Form.Item>
                    <Form.Item
                        label="技术栈"
                        name="tech_stack"
                    >
                        <TextArea rows={4} placeholder="请输入技术栈" maxLength={500} showCount />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default MemberList;
