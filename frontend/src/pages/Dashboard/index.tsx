import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Statistic, Table, Spin, Typography, Space, Tag } from 'antd';
import {
    ProjectOutlined,
    RocketOutlined,
    ToolOutlined,
    CheckCircleOutlined,
    SyncOutlined,
    TeamOutlined,
    AppstoreOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { getProjects } from '@/services/project';
import dayjs from 'dayjs';
import styles from './index.module.scss';

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [projectList, setProjectList] = useState<any[]>([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data: any = await getProjects();
            setProjectList(data);
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // 计算统计数据
    const stats = useMemo(() => {
        const total = projectList.length;
        const online = projectList.filter(p => p.project_status === '已上线').length;
        const developing = projectList.filter(p => p.project_status === '开发中').length;
        const offline = projectList.filter(p => p.project_status === '已下线').length;

        // 类型分布
        const typeMap: Record<string, number> = {};
        projectList.forEach(p => {
            typeMap[p.project_type] = (typeMap[p.project_type] || 0) + 1;
        });
        const typeData = Object.entries(typeMap).map(([name, value]) => ({ name, value }));

        // 最近更新
        const recentProjects = [...projectList]
            .sort((a, b) => dayjs(b.update_time).unix() - dayjs(a.update_time).unix())
            .slice(0, 5);

        return { total, online, developing, offline, typeData, recentProjects };
    }, [projectList]);

    // 项目类型分布图表配置
    const typePieOption = {
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c} ({d}%)'
        },
        legend: {
            bottom: '0%',
            left: 'center',
            icon: 'circle',
            itemWidth: 10,
            itemHeight: 10,
        },
        color: ['#1677ff', '#52c41a', '#faad14', '#722ed1', '#13c2c2'],
        series: [
            {
                name: '项目类型',
                type: 'pie',
                radius: ['40%', '70%'],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 10,
                    borderColor: '#fff',
                    borderWidth: 2
                },
                label: {
                    show: false,
                    position: 'center'
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: '16',
                        fontWeight: 'bold'
                    }
                },
                labelLine: {
                    show: false
                },
                data: stats.typeData.length > 0 ? stats.typeData : [{ value: 1, name: '暂无数据' }],
            },
        ],
    };

    // 常用色彩配置
    const chartColors = ['#1677ff', '#52c41a', '#faad14', '#F5222D', '#722ed1'];

    return (
        <Spin spinning={loading}>
            <div className={styles.dashboardHeader}>
                <Title level={4}>工作台概览</Title>
                <Text type="secondary">实时掌握各研发项目进展与资源分布情况</Text>
            </div>

            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={6}>
                    <Card className={styles.statisticCard} style={{ background: 'linear-gradient(135deg, #e6f4ff 0%, #bae0ff 100%)' }}>
                        <Statistic
                            title="项目总数"
                            value={stats.total}
                            valueStyle={{ color: '#0958d9' }}
                            prefix={<ProjectOutlined />}
                        />
                        <ProjectOutlined className={styles.cardIcon} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card className={styles.statisticCard} style={{ background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)' }}>
                        <Statistic
                            title="运行中(已上线)"
                            value={stats.online}
                            valueStyle={{ color: '#389e0d' }}
                            prefix={<CheckCircleOutlined />}
                        />
                        <RocketOutlined className={styles.cardIcon} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card className={styles.statisticCard} style={{ background: 'linear-gradient(135deg, #fffbe6 0%, #fff1b8 100%)' }}>
                        <Statistic
                            title="开发中"
                            value={stats.developing}
                            valueStyle={{ color: '#d48806' }}
                            prefix={<SyncOutlined spin={stats.developing > 0} />}
                        />
                        <AppstoreOutlined className={styles.cardIcon} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card className={styles.statisticCard} style={{ background: 'linear-gradient(135deg, #efdbff 0%, #d3adf7 100%)' }}>
                        <Statistic
                            title="已下线"
                            value={stats.offline}
                            valueStyle={{ color: '#531dab' }}
                            prefix={<RocketOutlined />}
                        />
                        <ToolOutlined className={styles.cardIcon} />
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
                <Col span={10}>
                    <Card title="项目类型分布" className={styles.chartCard}>
                        <ReactECharts option={typePieOption} style={{ height: 320 }} />
                    </Card>
                </Col>
                <Col span={14}>
                    <Card title="最近活跃项目" className={styles.chartCard}>
                        <Table
                            className={styles.recentTable}
                            pagination={false}
                            dataSource={stats.recentProjects}
                            rowKey="project_id"
                            size="middle"
                            columns={[
                                {
                                    title: '项目名称',
                                    dataIndex: 'project_name',
                                    render: (text) => <Text strong>{text}</Text>
                                },
                                {
                                    title: '业务方',
                                    dataIndex: 'business_unit',
                                    render: (text) => <Tag color="blue">{text}</Tag>
                                },
                                {
                                    title: '负责人',
                                    dataIndex: 'project_leader',
                                    render: (text) => (
                                        <Space>
                                            <TeamOutlined style={{ color: '#8c8c8c' }} />
                                            <span>{text}</span>
                                        </Space>
                                    )
                                },
                                {
                                    title: '更新时间',
                                    dataIndex: 'update_time',
                                    render: (time) => dayjs(time).format('MM-DD HH:mm')
                                },
                            ]}
                        />
                    </Card>
                </Col>
            </Row>
        </Spin>
    );
};

export default Dashboard;

