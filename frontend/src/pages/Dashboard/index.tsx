import React, { useEffect, useMemo, useState } from "react";
import { Card, Col, Row, Space, Spin, Statistic, Table, Tag, Typography } from "antd";
import {
  AppstoreOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ProjectOutlined,
  RocketOutlined,
  SyncOutlined,
  TeamOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import ReactEChartsCore from "echarts-for-react/lib/core";
import { PieChart } from "echarts/charts";
import { LegendComponent, TooltipComponent } from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import dayjs from "dayjs";

import { PROJECT_STATUS_OPTIONS } from "@/constants/project";
import { getProjects } from "@/services/project";
import type { ProjectSummary } from "@/types/project";
import styles from "./index.module.scss";

echarts.use([PieChart, TooltipComponent, LegendComponent, CanvasRenderer]);

const { Title, Text } = Typography;

const formatMemberNames = (
  members: Array<{ member_name: string }> | undefined,
): string => {
  if (!members || members.length === 0) {
    return "-";
  }
  return members.map((member) => member.member_name).join("、");
};

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [projectList, setProjectList] = useState<ProjectSummary[]>([]);

  useEffect(() => {
    void fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await getProjects({ skip: 0, limit: 1000 });
      setProjectList(response.items);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = projectList.length;
    const byStatus = PROJECT_STATUS_OPTIONS.reduce<Record<string, number>>(
      (accumulator, status) => {
        accumulator[status] = projectList.filter(
          (project) => project.project_status === status,
        ).length;
        return accumulator;
      },
      {},
    );

    const typeMap: Record<string, number> = {};
    projectList.forEach((project) => {
      typeMap[project.project_type] = (typeMap[project.project_type] || 0) + 1;
    });
    const typeData = Object.entries(typeMap).map(([name, value]) => ({
      name,
      value,
    }));

    const recentProjects = [...projectList]
      .sort((left, right) => dayjs(right.update_time).unix() - dayjs(left.update_time).unix())
      .slice(0, 5);

    return { total, byStatus, typeData, recentProjects };
  }, [projectList]);

  const typePieOption = {
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c} ({d}%)",
    },
    legend: {
      bottom: "0%",
      left: "center",
      icon: "circle",
      itemWidth: 10,
      itemHeight: 10,
    },
    color: ["#1677ff", "#52c41a", "#faad14", "#722ed1", "#13c2c2"],
    series: [
      {
        name: "项目类型",
        type: "pie",
        radius: ["40%", "70%"],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: "#fff",
          borderWidth: 2,
        },
        label: {
          show: false,
          position: "center",
        },
        emphasis: {
          label: {
            show: true,
            fontSize: "16",
            fontWeight: "bold",
          },
        },
        labelLine: {
          show: false,
        },
        data: stats.typeData.length > 0 ? stats.typeData : [{ value: 1, name: "暂无数据" }],
      },
    ],
  };

  return (
    <Spin spinning={loading}>
      <div className={styles.dashboardHeader}>
        <Title level={4}>工作台概览</Title>
        <Text type="secondary">实时掌握研发项目进展、状态分布与最近活跃情况</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8} xl={4}>
          <Card
            className={styles.statisticCard}
            style={{ background: "linear-gradient(135deg, #e6f4ff 0%, #bae0ff 100%)" }}
          >
            <Statistic
              title="项目总数"
              value={stats.total}
              valueStyle={{ color: "#0958d9" }}
              prefix={<ProjectOutlined />}
            />
            <ProjectOutlined className={styles.cardIcon} />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} xl={4}>
          <Card
            className={styles.statisticCard}
            style={{ background: "linear-gradient(135deg, #f9f0ff 0%, #efdbff 100%)" }}
          >
            <Statistic
              title="待启动"
              value={stats.byStatus["待启动"] || 0}
              valueStyle={{ color: "#7a45d1" }}
              prefix={<ClockCircleOutlined />}
            />
            <ClockCircleOutlined className={styles.cardIcon} />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} xl={4}>
          <Card
            className={styles.statisticCard}
            style={{ background: "linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)" }}
          >
            <Statistic
              title="已上线"
              value={stats.byStatus["已上线"] || 0}
              valueStyle={{ color: "#389e0d" }}
              prefix={<CheckCircleOutlined />}
            />
            <RocketOutlined className={styles.cardIcon} />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} xl={4}>
          <Card
            className={styles.statisticCard}
            style={{ background: "linear-gradient(135deg, #fffbe6 0%, #fff1b8 100%)" }}
          >
            <Statistic
              title="开发中"
              value={stats.byStatus["开发中"] || 0}
              valueStyle={{ color: "#d48806" }}
              prefix={<SyncOutlined spin={(stats.byStatus["开发中"] || 0) > 0} />}
            />
            <AppstoreOutlined className={styles.cardIcon} />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} xl={4}>
          <Card
            className={styles.statisticCard}
            style={{ background: "linear-gradient(135deg, #efdbff 0%, #d3adf7 100%)" }}
          >
            <Statistic
              title="已下线"
              value={stats.byStatus["已下线"] || 0}
              valueStyle={{ color: "#531dab" }}
              prefix={<ToolOutlined />}
            />
            <ToolOutlined className={styles.cardIcon} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={10}>
          <Card title="项目类型分布" className={styles.chartCard}>
            <ReactEChartsCore echarts={echarts} option={typePieOption} style={{ height: 320 }} />
          </Card>
        </Col>
        <Col span={14}>
          <Card title="最近活跃项目" className={styles.chartCard}>
            <Table<ProjectSummary>
              className={styles.recentTable}
              pagination={false}
              dataSource={stats.recentProjects}
              rowKey="project_id"
              size="middle"
              columns={[
                {
                  title: "项目名称",
                  dataIndex: "project_name",
                  render: (text: string) => <Text strong>{text}</Text>,
                },
                {
                  title: "业务方",
                  dataIndex: "business_unit",
                  render: (text: string) => <Tag color="blue">{text}</Tag>,
                },
                {
                  title: "负责人",
                  key: "project_leaders",
                  render: (_, record) => (
                    <Space>
                      <TeamOutlined style={{ color: "#8c8c8c" }} />
                      <span>{formatMemberNames(record.project_leaders)}</span>
                    </Space>
                  ),
                },
                {
                  title: "更新时间",
                  dataIndex: "update_time",
                  render: (value: string) => dayjs(value).format("MM-DD HH:mm"),
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
