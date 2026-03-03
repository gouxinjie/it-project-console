import React, { useState, useEffect } from 'react';
import { Table, Tag, Space, Button, Input, Select, DatePicker, Card, message, Modal, Row, Col, Descriptions, Typography, Spin } from 'antd';
import { PlusOutlined, SearchOutlined, ExclamationCircleOutlined, GithubOutlined, GlobalOutlined, PartitionOutlined, CloudOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getProjects, getProjectResources, deleteProject, deleteProjectResource, deleteProjectExternalResources } from '@/services/project';
import { getMembers } from '@/services/member';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { confirm } = Modal;
const { Text } = Typography;

const ProjectList: React.FC = () => {
    const navigate = useNavigate();
    const [expandedRowKeys, setExpandedRowKeys] = useState<readonly React.Key[]>([]);
    const [loading, setLoading] = useState(false);
    const [dataSource, setDataSource] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);

    // 筛选条件状态
    const [queryParams, setQueryParams] = useState<any>({
        project_type: undefined,
        project_status: undefined,
        business_unit: '',
        business_type: undefined,
        belong_system: '',
        project_leader: '',
        timeRange: null
    });

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const params: any = { ...queryParams };
            
            // 处理时间范围
            if (params.timeRange) {
                params.start_time = params.timeRange[0].startOf('day').toISOString();
                params.end_time = params.timeRange[1].endOf('day').toISOString();
                delete params.timeRange;
            }

            // 移除空值
            Object.keys(params).forEach(key => {
                if (params[key] === '' || params[key] === undefined || params[key] === null) {
                    delete params[key];
                }
            });

            const data: any = await getProjects(params);
            setDataSource(data.map((item: any) => ({
                ...item,
                key: item.project_id,
                update_time: dayjs(item.update_time).format('YYYY-MM-DD HH:mm'),
                resources: [],
                external_resources: [],
                hasLoadedResources: false,
                resourceLoading: false
            })));
        } catch (error) {
            message.error('获取项目列表失败');
        } finally {
            setLoading(false);
        }
    };

    // 重置筛选
    const handleReset = () => {
        setQueryParams({
            project_type: undefined,
            project_status: undefined,
            business_unit: '',
            business_type: undefined,
            belong_system: '',
            project_leader: '',
            timeRange: null
        });
        fetchProjects();
    };

    const handleExpand = async (expanded: boolean, record: any) => {
        if (expanded && !record.hasLoadedResources) {
            // 更新当前行的 loading 状态
            setDataSource(prev => prev.map(item =>
                item.project_id === record.project_id ? { ...item, resourceLoading: true } : item
            ));

            try {
                const res: any = await getProjectResources(record.project_id);
                setDataSource(prev => prev.map(item =>
                    item.project_id === record.project_id
                        ? {
                            ...item,
                            resources: res.resources,
                            external_resources: res.external_resources,
                            hasLoadedResources: true,
                            resourceLoading: false
                        }
                        : item
                ));
            } catch (error) {
                message.error('加载项目资源失败');
                setDataSource(prev => prev.map(item =>
                    item.project_id === record.project_id ? { ...item, resourceLoading: false } : item
                ));
            }
        }
    };

    // 删除项目
    const handleDeleteProject = (record: any) => {
        // 检查是否有子资源
        const hasResources = record.resources?.length > 0 || record.external_resources?.length > 0;

        if (hasResources) {
            Modal.warning({
                title: '无法删除',
                content: '该项目下存在子资源，请先删除所有子资源后再删除项目。',
                okText: '知道了'
            });
            return;
        }

        confirm({
            title: '确认删除',
            icon: <ExclamationCircleOutlined />,
            content: `确定要删除项目"${record.project_name}"吗？此操作不可恢复。`,
            okText: '确认删除',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
                try {
                    await deleteProject(record.project_id);
                    message.success('删除成功');
                    fetchProjects();
                } catch (error) {
                    message.error('删除失败');
                }
            }
        });
    };

    // 删除子资源
    const handleDeleteResource = (projectId: number, resourceId: number, resourceName: string) => {
        confirm({
            title: '确认删除',
            icon: <ExclamationCircleOutlined />,
            content: `确定要删除资源"${resourceName}"吗？此操作不可恢复。`,
            okText: '确认删除',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
                try {
                    await deleteProjectResource(resourceId);
                    message.success('删除成功');
                    // 重新加载该项目的资源
                    const res: any = await getProjectResources(projectId);
                    setDataSource(prev => prev.map(item =>
                        item.project_id === projectId
                            ? {
                                ...item,
                                resources: res.resources,
                                external_resources: res.external_resources
                            }
                            : item
                    ));
                } catch (error) {
                    message.error('删除失败');
                }
            }
        });
    };

    // 删除外部资源（整块删除）
    const handleDeleteExternalResources = (projectId: number) => {
        confirm({
            title: '确认删除',
            icon: <ExclamationCircleOutlined />,
            content: `确定要删除该项目的所有外部资源配置吗？此操作不可恢复。`,
            okText: '确认删除',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
                try {
                    await deleteProjectExternalResources(projectId);
                    message.success('删除成功');
                    // 重新加载该项目的资源
                    const res: any = await getProjectResources(projectId);
                    setDataSource(prev => prev.map(item =>
                        item.project_id === projectId
                            ? {
                                ...item,
                                resources: res.resources,
                                external_resources: res.external_resources,
                                has_external_resources: false
                            }
                            : item
                    ));
                    // 刷新列表以更新主表格的“外部资源”按钮状态
                    fetchProjects();
                } catch (error) {
                    message.error('删除失败');
                }
            }
        });
    };

    useEffect(() => {
        fetchProjects();
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        try {
            const res: any = await getMembers();
            setMembers(res);
        } catch (error) {
            console.error('获取成员列表失败', error);
        }
    };

    // 父表格列定义
    const columns = [
        {
            title: '项目名称',
            dataIndex: 'project_name',
            key: 'project_name',
            width: 200,
            ellipsis: true,
            fixed: 'left' as const
        },
        { title: '项目类型', dataIndex: 'project_type', key: 'project_type', width: 120 },
        {
            title: '项目状态',
            dataIndex: 'project_status',
            key: 'project_status',
            width: 120,
            render: (status: string) => {
                let color = 'blue';
                if (status === '已上线') color = 'green';
                if (status === '开发中') color = 'orange';
                if (status === '已下线') color = 'gray';
                return <Tag color={color}>{status}</Tag>;
            }
        },
        {
            title: '项目描述',
            dataIndex: 'project_desc',
            key: 'project_desc',
            width: 200,
            ellipsis: true
        },
        {
            title: '技术框架',
            dataIndex: 'tech_framework',
            key: 'tech_framework',
            width: 200,
            ellipsis: true
        },
        { title: '业务方', dataIndex: 'business_unit', key: 'business_unit', width: 150, ellipsis: true },
        { title: '业务类型', dataIndex: 'business_type', key: 'business_type', width: 120 },
        { title: '所属系统', dataIndex: 'belong_system', key: 'belong_system', width: 120 },
        { title: '项目负责人', dataIndex: 'project_leader', key: 'project_leader', width: 120 },
        { title: '更新时间', dataIndex: 'update_time', key: 'update_time', width: 180 },
        { title: '备注', dataIndex: 'remarks', key: 'remarks', width: 120, ellipsis: true },
        {
            title: '操作',
            key: 'action',
            width: 300,
            fixed: 'right' as const,
            render: (_: any, record: any) => {
                // 检查子项目状态
                const resources = record.resources || [];
                const hasFrontend = resources.some((r: any) => r.resource_type === '前端');
                const hasBackend = resources.some((r: any) => r.resource_type === '后端');
                const isFull = hasFrontend && hasBackend;
                const hasExternal = record.has_external_resources;

                return (
                    <Space size="small">
                        <Button
                            type="link"
                            size="small"
                            icon={<PlusOutlined />}
                            disabled={isFull}
                            onClick={() => {
                                let targetType = '';
                                if (hasFrontend && !hasBackend) targetType = '后端';
                                else if (!hasFrontend && hasBackend) targetType = '前端';
                                
                                navigate(`/projects/${record.project_id}/resource/create${targetType ? `?type=${targetType}` : ''}`);
                            }}
                        >
                            添加子项目
                        </Button>
                        <Button
                            type="link"
                            size="small"
                            disabled={hasExternal}
                            onClick={() => navigate(`/projects/${record.project_id}/external-resource/edit`)}
                        >
                            添加外部资源
                        </Button>
                        <Button
                            type="link"
                            size="small"
                            onClick={() => navigate(`/projects/${record.project_id}/edit`)}
                        >
                            编辑
                        </Button>
                        <Button
                            type="link"
                            size="small"
                            danger
                            onClick={() => handleDeleteProject(record)}
                        >
                            删除
                        </Button>
                    </Space>
                );
            },
        },
    ];

    // 子资源渲染：卡片式布局
    const expandedRowRender = (record: any) => {
        if (record.resourceLoading) {
            return (
                <div style={{ padding: '24px', textAlign: 'center', background: '#f8faff' }}>
                    <Spin tip="加载资源中..." />
                </div>
            );
        }

        // 构建外部资源卡片数据
        let externalResourceCard = null;
        if (record.external_resources) {
            const ext = record.external_resources;
            // 只要有任何一个配置项有值，就显示卡片
            const hasExternalConfig = ext.aliyun_oss || ext.database_config || ext.redis_config || ext.middleware_config || ext.other_config;
            
            if (hasExternalConfig) {
                externalResourceCard = {
                    resource_id: 'external-resources-summary',
                    resource_type: '外部资源',
                    name: '外部资源汇总',
                    isExternal: true,
                    data: ext
                };
            }
        }

        const subDataSource = [
            ...(record.resources || []),
            ...(externalResourceCard ? [externalResourceCard] : [])
        ];

        if (subDataSource.length === 0) {
            return (
                <div style={{ padding: '24px', textAlign: 'center', background: '#f8faff', color: '#86909c' }}>
                    暂无子资源信息
                </div>
            );
        }

        return (
            <div style={{ background: '#f8faff' }}>
                <Row gutter={[16, 16]}>
                    {subDataSource.map((item: any) => (
                        <Col span={8} key={item.isExternal ? item.resource_id : `res-${item.resource_id}`}>
                            <Card
                                size="small"
                                bordered={false}
                                title={
                                    <Space>
                                        <Tag color={item.isExternal ? 'orange' : (item.resource_type === '前端' ? 'blue' : 'green')}>
                                            {item.resource_type}
                                        </Tag>
                                        <Text strong>{item.isExternal ? item.name : item.tech_framework}</Text>
                                    </Space>
                                }
                                actions={[
                                    <Button type="link" size="small" key="view" onClick={() => navigate(item.isExternal ? `/projects/${record.project_id}/external-resource/edit` : `/projects/${record.project_id}/resource/${item.resource_id}/edit`)}>查看</Button>,
                                    <Button
                                        type="link"
                                        size="small"
                                        key="edit"
                                        onClick={() => navigate(item.isExternal ? `/projects/${record.project_id}/external-resource/edit` : `/projects/${record.project_id}/resource/${item.resource_id}/edit`)}
                                    >
                                        编辑
                                    </Button>,
                                    (item.isExternal || !item.isExternal) && (
                                        <Button
                                            type="link"
                                            size="small"
                                            danger
                                            key="delete"
                                            onClick={() => {
                                                if (item.isExternal) {
                                                    handleDeleteExternalResources(record.project_id);
                                                } else {
                                                    handleDeleteResource(record.project_id, item.resource_id, item.resource_type);
                                                }
                                            }}
                                        >
                                            删除
                                        </Button>
                                    )
                                ].filter(Boolean) as React.ReactNode[]}
                                styles={{ body: { padding: '12px' } }}
                            >
                                <Descriptions column={1} size="small" labelStyle={{ color: '#86909c' }}>
                                    {!item.isExternal ? (
                                        <>
                                            <Descriptions.Item label={<span><GithubOutlined /> Git仓库</span>}>
                                                <Text ellipsis={{ tooltip: item.git_repo }} style={{ maxWidth: 200 }}>
                                                    {item.git_repo || '-'}
                                                </Text>
                                            </Descriptions.Item>
                                            <Descriptions.Item label={<span><PartitionOutlined /> 发布分支</span>}>
                                                {item.deploy_branch || '-'}
                                            </Descriptions.Item>
                                            <Descriptions.Item label={<span><GlobalOutlined /> 生产域名</span>}>
                                                <Text ellipsis={{ tooltip: item.prod_domain }} style={{ maxWidth: 200 }}>
                                                    {item.prod_domain || '-'}
                                                </Text>
                                            </Descriptions.Item>
                                        </>
                                    ) : (
                                        <>
                                            <Descriptions.Item label={<span><CloudOutlined /> 配置概览</span>}>
                                                <div style={{ fontSize: '12px', color: '#4e5969' }}>
                                                    {item.data.aliyun_oss && <div style={{ marginBottom: 4 }}>• 阿里云OSS: 已配置</div>}
                                                    {item.data.database_config && <div style={{ marginBottom: 4 }}>• 数据库: 已配置</div>}
                                                    {item.data.redis_config && <div style={{ marginBottom: 4 }}>• Redis: 已配置</div>}
                                                    {item.data.middleware_config && <div style={{ marginBottom: 4 }}>• 中间件: 已配置</div>}
                                                    {item.data.other_config && <div>• 其他: 已配置</div>}
                                                </div>
                                            </Descriptions.Item>
                                        </>
                                    )}
                                </Descriptions>
                            </Card>
                        </Col>
                    ))}
                </Row>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <Card>
                <Row gutter={[24, 16]} align="middle" className="mb-6">
                    <Col xs={24} sm={12} md={8} lg={6}>
                        <div className="flex items-center gap-2">
                            <span style={{ whiteSpace: 'nowrap' }}>项目类型:</span>
                            <Select
                                placeholder="请选择"
                                style={{ width: '100%' }}
                                allowClear
                                value={queryParams.project_type}
                                onChange={(val) => setQueryParams({ ...queryParams, project_type: val })}
                            >
                                <Option value="web应用">web应用</Option>
                                <Option value="钉钉微应用">钉钉微应用</Option>
                                <Option value="小程序">小程序</Option>
                                <Option value="低代码">低代码</Option>
                            </Select>
                        </div>
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={6}>
                        <div className="flex items-center gap-2">
                            <span style={{ whiteSpace: 'nowrap' }}>项目状态:</span>
                            <Select
                                placeholder="请选择"
                                style={{ width: '100%' }}
                                allowClear
                                value={queryParams.project_status}
                                onChange={(val) => setQueryParams({ ...queryParams, project_status: val })}
                            >
                                <Option value="开发中">开发中</Option>
                                <Option value="已上线">已上线</Option>
                                <Option value="已下线">已下线</Option>
                            </Select>
                        </div>
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={6}>
                        <div className="flex items-center gap-2">
                            <span style={{ whiteSpace: 'nowrap' }}>业务方:</span>
                            <Select
                                placeholder="请选择"
                                style={{ width: '100%' }}
                                allowClear
                                value={queryParams.business_unit}
                                onChange={(val) => setQueryParams({ ...queryParams, business_unit: val })}
                            >
                                <Option value="集团总部">集团总部</Option>
                                <Option value="董事办">董事办</Option>
                                <Option value="风控">风控</Option>
                                <Option value="投管">投管</Option>
                                <Option value="财务">财务</Option>
                                <Option value="人力资源">人力资源</Option>
                                <Option value="投融资">投融资</Option>
                            </Select>
                        </div>
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={6}>
                        <div className="flex items-center gap-2">
                            <span style={{ whiteSpace: 'nowrap' }}>业务类型:</span>
                            <Select
                                placeholder="请选择"
                                style={{ width: '100%' }}
                                allowClear
                                value={queryParams.business_type}
                                onChange={(val) => setQueryParams({ ...queryParams, business_type: val })}
                            >
                                <Option value="运维">运维</Option>
                                <Option value="运营">运营</Option>
                                <Option value="新需求">新需求</Option>
                            </Select>
                        </div>
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={6}>
                        <div className="flex items-center gap-2">
                            <span style={{ whiteSpace: 'nowrap' }}>项目负责人:</span>
                            <Select
                                placeholder="请选择"
                                style={{ width: '100%' }}
                                allowClear
                                value={queryParams.project_leader}
                                onChange={(val) => setQueryParams({ ...queryParams, project_leader: val })}
                                showSearch
                                optionFilterProp="children"
                            >
                                {members.map(member => (
                                    <Option key={member.member_id} value={member.member_name}>{member.member_name}</Option>
                                ))}
                            </Select>
                        </div>
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={6}>
                        <div className="flex items-center gap-2">
                            <span style={{ whiteSpace: 'nowrap' }}>所属系统:</span>
                            <Input
                                placeholder="请输入系统名称"
                                value={queryParams.belong_system}
                                onChange={(e) => setQueryParams({ ...queryParams, belong_system: e.target.value })}
                            />
                        </div>
                    </Col>
                    <Col xs={24} sm={12} md={12} lg={8}>
                        <div className="flex items-center gap-2">
                            <span style={{ whiteSpace: 'nowrap' }}>更新时间:</span>
                            <RangePicker
                                style={{ width: '100%' }}
                                value={queryParams.timeRange}
                                onChange={(dates) => setQueryParams({ ...queryParams, timeRange: dates })}
                            />
                        </div>
                    </Col>
                </Row>
                <div className="flex justify-center border-t pt-4">
                    <Space size="middle">
                        <Button type="primary" icon={<SearchOutlined />} onClick={fetchProjects}>查询</Button>
                        <Button onClick={handleReset}>重置</Button>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => navigate('/projects/create')}
                        >
                            创建项目
                        </Button>
                    </Space>
                </div>
            </Card>

            <Card>
                <Table
                    columns={columns}
                    expandable={{
                        expandedRowRender,
                        expandedRowKeys,
                        onExpandedRowsChange: (keys) => setExpandedRowKeys(keys),
                        onExpand: handleExpand
                    }}
                    dataSource={dataSource}
                    loading={loading}
                    tableLayout="fixed"
                    scroll={{ x: 1870 }}
                />
            </Card>
        </div>
    );
};

export default ProjectList;
