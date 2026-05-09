import React, { useEffect, useMemo, useState } from "react";
import { Button, Card, Col, Row, Space, Spin, Statistic, Table, message, Typography } from "antd";
import {
  ClockCircleOutlined,
  ProjectOutlined,
  RocketOutlined,
  SyncOutlined,
  TeamOutlined,
  ToolOutlined
} from "@ant-design/icons";
import ReactEChartsCore from "echarts-for-react/lib/core";
import { PieChart } from "echarts/charts";
import { LegendComponent, TooltipComponent } from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";

import { PROJECT_STATUS_OPTIONS } from "@/constants/project";
import { getAllProjects } from "@/services/project";
import type { ProjectSummary } from "@/types/project";
import styles from "./index.module.scss";

echarts.use([PieChart, TooltipComponent, LegendComponent, CanvasRenderer]);

const { Title, Text } = Typography;

/**
 * 格式化成员名称列表
 */
function formatMemberNames(members: Array<{ member_name: string }> | undefined): string {
  if (!members || members.length === 0) {
    return "-";
  }
  return members.map((member) => member.member_name).join("、");
}

// 仪表盘状态卡片颜色配置
const DASHBOARD_STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  [PROJECT_STATUS_OPTIONS[0]]: { color: "#8b5cf6", label: PROJECT_STATUS_OPTIONS[0] },
  [PROJECT_STATUS_OPTIONS[1]]: { color: "#f59e0b", label: PROJECT_STATUS_OPTIONS[1] },
  [PROJECT_STATUS_OPTIONS[2]]: { color: "#10b981", label: PROJECT_STATUS_OPTIONS[2] },
  [PROJECT_STATUS_OPTIONS[3]]: { color: "#64748b", label: PROJECT_STATUS_OPTIONS[3] }
};

/**
 * 仪表盘页面组件
 * 展示项目统计指标、项目类型分布图表以及最近更新的项目列表
 */
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [projectList, setProjectList] = useState<ProjectSummary[]>([]);

  // 页面挂载时拉取所有项目数据
  useEffect(() => {
    void fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const items = await getAllProjects();
      setProjectList(items);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      message.error("获取仪表盘数据失败");
    } finally {
      setLoading(false);
    }
  };

  /**
   * 聚合统计数据
   * 包含：总数、各状态计数、类型分布数据、最近更新项目
   */
  const stats = useMemo(() => {
    const total = projectList.length;
    // 按状态统计
    const byStatus = PROJECT_STATUS_OPTIONS.reduce<Record<string, number>>((accumulator, status) => {
      accumulator[status] = projectList.filter((project) => project.project_status === status).length;
      return accumulator;
    }, {});

    // 按类型统计（饼图数据）
    const typeMap: Record<string, number> = {};
    projectList.forEach((project) => {
      typeMap[project.project_type] = (typeMap[project.project_type] || 0) + 1;
    });
    const typeData = Object.entries(typeMap).map(([name, value]) => ({
      name,
      value
    }));

    // 获取最近更新的5个项目
    const recentProjects = [...projectList].sort((left, right) => dayjs(right.update_time).unix() - dayjs(left.update_time).unix()).slice(0, 5);

    return { total, byStatus, typeData, recentProjects };
  }, [projectList]);

  const typePieOption = {
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c} ({d}%)",
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      borderRadius: 12,
      padding: [12, 16],
      textStyle: {
        color: "#1e293b",
        fontSize: 13
      },
      borderWidth: 0,
      shadowColor: "rgba(0, 0, 0, 0.1)",
      shadowBlur: 10
    },
    legend: {
      bottom: "5%",
      left: "center",
      icon: "circle",
      itemWidth: 8,
      itemHeight: 8,
      textStyle: {
        color: "#64748b",
        fontSize: 12
      }
    },
    color: ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899"],
    series: [
      {
        name: "项目类型",
        type: "pie",
        radius: ["45%", "75%"],
        center: ["50%", "42%"],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: "#fff",
          borderWidth: 2
        },
        label: {
          show: false,
          position: "center"
        },
        emphasis: {
          label: {
            show: true,
            fontSize: "18",
            fontWeight: "800",
            color: "#1e293b"
          }
        },
        labelLine: {
          show: false
        },
        data: stats.typeData.length > 0 ? stats.typeData : [{ value: 1, name: "暂无数据" }]
      }
    ]
  };

  return (
    <Spin spinning={loading}>
      <div className={styles.dashboardHeader}>
        <Title level={4}>工作台概览</Title>
        <Text type="secondary">实时查看项目状态分布、类型结构和最近活跃的项目。</Text>
      </div>

      <Row gutter={[20, 20]}>
        <Col xs={24} sm={12} md={8} style={{ flex: 1, minWidth: "200px" }}>
          <Card className={`${styles.statisticCard} animate-card-in delay-1`}>
            <Statistic
              title="项目总数"
              value={stats.total}
              valueStyle={{ color: "#3b82f6", fontWeight: 800 }}
              prefix={<ProjectOutlined style={{ opacity: 0.8 }} />}
            />
            <ProjectOutlined className={styles.cardIcon} style={{ color: "#3b82f6" }} />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} style={{ flex: 1, minWidth: "200px" }}>
          <Card className={`${styles.statisticCard} animate-card-in delay-2`}>
            <Statistic
              title="待启动"
              value={stats.byStatus[PROJECT_STATUS_OPTIONS[0]] || 0}
              valueStyle={{ color: "#8b5cf6", fontWeight: 800 }}
              prefix={<ClockCircleOutlined style={{ opacity: 0.8 }} />}
            />
            <ClockCircleOutlined className={styles.cardIcon} style={{ color: "#8b5cf6" }} />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} style={{ flex: 1, minWidth: "200px" }}>
          <Card className={`${styles.statisticCard} animate-card-in delay-3`}>
            <Statistic
              title="已上线"
              value={stats.byStatus[PROJECT_STATUS_OPTIONS[2]] || 0}
              valueStyle={{ color: "#10b981", fontWeight: 800 }}
              prefix={<RocketOutlined style={{ opacity: 0.8 }} />}
            />
            <RocketOutlined className={styles.cardIcon} style={{ color: "#10b981" }} />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} style={{ flex: 1, minWidth: "200px" }}>
          <Card className={`${styles.statisticCard} animate-card-in delay-4`}>
            <Statistic
              title="开发中"
              value={stats.byStatus[PROJECT_STATUS_OPTIONS[1]] || 0}
              valueStyle={{ color: "#f59e0b", fontWeight: 800 }}
              prefix={<SyncOutlined spin={(stats.byStatus[PROJECT_STATUS_OPTIONS[1]] || 0) > 0} style={{ opacity: 0.8 }} />}
            />
            <SyncOutlined className={styles.cardIcon} style={{ color: "#f59e0b" }} />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} style={{ flex: 1, minWidth: "200px" }}>
          <Card className={`${styles.statisticCard} animate-card-in delay-5`}>
            <Statistic
              title="已下线"
              value={stats.byStatus[PROJECT_STATUS_OPTIONS[3]] || 0}
              valueStyle={{ color: "#64748b", fontWeight: 800 }}
              prefix={<ToolOutlined style={{ opacity: 0.8 }} />}
            />
            <ToolOutlined className={styles.cardIcon} style={{ color: "#64748b" }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        <Col xs={24} lg={8}>
          <Card title="项目类型分布" className={styles.chartCard}>
            <div style={{ height: 320 }}>
              <ReactEChartsCore
                echarts={echarts}
                option={typePieOption}
                style={{ height: "100%", width: "100%" }}
                notMerge={true}
                lazyUpdate={true}
              />
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card
            title="最近活跃项目"
            className={styles.chartCard}
            extra={
              <Button type="link" onClick={() => navigate("/projects")} style={{ color: "#10b981", fontWeight: 600 }}>
                查看全部
              </Button>
            }
          >
            <Table<ProjectSummary>
              className={styles.recentTable}
              columns={[
                {
                  title: "项目名称",
                  dataIndex: "project_name",
                  key: "project_name",
                  render: (text, record) => (
                    <Space>
                      <ProjectOutlined style={{ color: "#64748b" }} />
                      <Text strong style={{ color: "#1e293b" }}>
                        {text}
                      </Text>
                    </Space>
                  )
                },
                {
                  title: "状态",
                  dataIndex: "project_status",
                  key: "project_status",
                  render: (status) => {
                    const config = DASHBOARD_STATUS_CONFIG[status] || { color: "#64748b", label: status };
                    return (
                      <Space size={4}>
                        <span className={styles.statusIndicator} style={{ background: config.color }} />
                        <span style={{ fontSize: 13, color: "#475569", fontWeight: 500 }}>{config.label}</span>
                      </Space>
                    );
                  }
                },
                {
                  title: "负责人",
                  key: "project_leaders",
                  render: (_, record) => (
                    <Space size={4}>
                      <TeamOutlined style={{ color: "#94a3b8", fontSize: 12 }} />
                      <Text style={{ color: "#475569", fontSize: 13 }}>{formatMemberNames(record.project_leaders)}</Text>
                    </Space>
                  )
                },
                {
                  title: "更新时间",
                  dataIndex: "update_time",
                  key: "update_time",
                  render: (time) => (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(time).format("YYYY-MM-DD HH:mm")}
                    </Text>
                  )
                },
                {
                  title: "操作",
                  key: "action",
                  render: (_, record) => (
                    <Button
                      type="text"
                      size="small"
                      icon={<RocketOutlined />}
                      onClick={() => navigate(`/projects/${record.project_id}`)}
                      style={{ color: "#10b981" }}
                    >
                      详情
                    </Button>
                  )
                }
              ]}
              dataSource={stats.recentProjects}
              pagination={false}
              loading={loading}
              rowKey="project_id"
              size="middle"
            />
          </Card>
        </Col>
      </Row>
    </Spin>
  );
};

export default Dashboard;
