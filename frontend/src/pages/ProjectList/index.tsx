import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
  type TableColumnsType,
} from "antd";
import {
  CloudOutlined,
  EyeOutlined,
  ExclamationCircleOutlined,
  GithubOutlined,
  GlobalOutlined,
  PartitionOutlined,
  PlusOutlined,
  SearchOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs, { type Dayjs } from "dayjs";

import styles from "./index.module.scss";

import {
  BUSINESS_TYPE_OPTIONS,
  BUSINESS_UNIT_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  PROJECT_TYPE_OPTIONS,
} from "@/constants/project";
import { getAllMembers } from "@/services/member";
import {
  deleteProject,
  deleteProjectExternalResources,
  deleteProjectResource,
  getProjectResources,
  getProjects,
} from "@/services/project";
import type { Member } from "@/types/member";
import type {
  ProjectExternalResource,
  ProjectQueryParams,
  ProjectResource,
  ProjectSummary,
} from "@/types/project";

const { RangePicker } = DatePicker;
const { confirm } = Modal;
const { Text } = Typography;

interface ProjectFilters {
  project_type?: string;
  project_status?: string;
  business_unit?: string;
  business_type?: string;
  belong_system?: string;
  project_leader_id?: number;
  timeRange: [Dayjs, Dayjs] | null;
}

interface TablePaginationState {
  current: number;
  pageSize: number;
  total: number;
}

interface ProjectTableRecord extends ProjectSummary {
  key: number;
  resources: ProjectResource[];
  external_resources: ProjectExternalResource | null;
  hasLoadedResources: boolean;
  resourceLoading: boolean;
}

const defaultFilters: ProjectFilters = {
  timeRange: null,
};

const formatMemberNames = (
  members: Array<{ member_name: string }> | undefined,
): string => {
  if (!members || members.length === 0) {
    return "-";
  }
  return members.map((member) => member.member_name).join("、");
};

const PROJECT_STATUS_DISPLAY_CONFIG: Record<string, string> = {
  [PROJECT_STATUS_OPTIONS[0]]: "#8b5cf6",
  [PROJECT_STATUS_OPTIONS[1]]: "#f59e0b",
  [PROJECT_STATUS_OPTIONS[2]]: "#10b981",
  [PROJECT_STATUS_OPTIONS[3]]: "#64748b",
};

const ProjectList: React.FC = () => {
  const navigate = useNavigate();
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<ProjectTableRecord[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [filters, setFilters] = useState<ProjectFilters>(defaultFilters);
  const [pagination, setPagination] = useState<TablePaginationState>({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  useEffect(() => {
    void fetchProjects(defaultFilters, { current: 1, pageSize: 10, total: 0 });
    void fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const items = await getAllMembers();
      setMembers(items);
    } catch (error) {
      console.error("Failed to fetch members:", error);
      message.error("获取成员列表失败");
    }
  };

  const fetchProjects = async (
    nextFilters: ProjectFilters = filters,
    nextPagination: TablePaginationState = pagination,
  ) => {
    setLoading(true);
    try {
      const params: ProjectQueryParams = {
        skip: (nextPagination.current - 1) * nextPagination.pageSize,
        limit: nextPagination.pageSize,
      };

      if (nextFilters.project_type) {
        params.project_type = nextFilters.project_type;
      }
      if (nextFilters.project_status) {
        params.project_status = nextFilters.project_status;
      }
      if (nextFilters.business_unit) {
        params.business_unit = nextFilters.business_unit;
      }
      if (nextFilters.business_type) {
        params.business_type = nextFilters.business_type;
      }
      if (nextFilters.belong_system) {
        params.belong_system = nextFilters.belong_system;
      }
      if (nextFilters.project_leader_id !== undefined) {
        params.project_leader_id = nextFilters.project_leader_id;
      }
      if (nextFilters.timeRange) {
        params.start_time = nextFilters.timeRange[0].startOf("day").toISOString();
        params.end_time = nextFilters.timeRange[1].endOf("day").toISOString();
      }

      const response = await getProjects(params);
      setDataSource(
        response.items.map((item) => ({
          ...item,
          key: item.project_id,
          resources: [],
          external_resources: null,
          hasLoadedResources: false,
          resourceLoading: false,
        })),
      );
      setFilters(nextFilters);
      setExpandedRowKeys([]);
      setPagination({
        current: nextPagination.current,
        pageSize: nextPagination.pageSize,
        total: response.total,
      });
    } catch (error) {
      message.error("获取项目列表失败");
    } finally {
      setLoading(false);
    }
  };

  const refreshProjectResources = async (projectId: number) => {
    const response = await getProjectResources(projectId);
    setDataSource((previous) =>
      previous.map((item) =>
        item.project_id === projectId
          ? {
              ...item,
              resources: response.resources,
              external_resources: response.external_resources,
              has_external_resources: Boolean(response.external_resources),
              hasLoadedResources: true,
              resourceLoading: false,
            }
          : item,
      ),
    );
  };

  const handleSearch = () => {
    void fetchProjects(filters, { ...pagination, current: 1 });
  };

  const handleReset = () => {
    void fetchProjects(defaultFilters, { ...pagination, current: 1 });
  };

  const handleExpand = async (expanded: boolean, record: ProjectTableRecord) => {
    if (!expanded || record.hasLoadedResources) {
      return;
    }

    setDataSource((previous) =>
      previous.map((item) =>
        item.project_id === record.project_id
          ? { ...item, resourceLoading: true }
          : item,
      ),
    );

    try {
      await refreshProjectResources(record.project_id);
    } catch (error) {
      message.error("加载项目资源失败");
      setDataSource((previous) =>
        previous.map((item) =>
          item.project_id === record.project_id
            ? { ...item, resourceLoading: false }
            : item,
        ),
      );
    }
  };

  const handleDeleteProject = async (record: ProjectTableRecord) => {
    try {
      const resourceSummary = await getProjectResources(record.project_id);
      const hasResources =
        resourceSummary.resources.length > 0 ||
        Boolean(resourceSummary.external_resources);

      if (hasResources) {
        Modal.warning({
          title: "无法删除项目",
          content: "当前项目下仍有资源，请先清理所有资源后再删除项目。",
          okText: "知道了",
        });
        return;
      }
    } catch (error) {
      message.error("校验项目资源失败，请稍后重试");
      return;
    }

    confirm({
      title: "确认删除项目",
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除项目「${record.project_name}」吗？此操作不可恢复。`,
      okText: "确认删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          await deleteProject(record.project_id);
          message.success("项目已删除");
          void fetchProjects(filters, pagination);
        } catch (error) {
          message.error("删除项目失败");
        }
      },
    });
  };

  const handleDeleteResource = (
    projectId: number,
    resourceId: number,
    resourceName: string,
  ) => {
    confirm({
      title: "确认删除资源",
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除资源「${resourceName}」吗？此操作不可恢复。`,
      okText: "确认删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          await deleteProjectResource(resourceId);
          await refreshProjectResources(projectId);
          message.success("资源已删除");
          void fetchProjects(filters, pagination);
        } catch (error) {
          message.error("删除资源失败");
        }
      },
    });
  };

  const handleDeleteExternalResources = (projectId: number) => {
    confirm({
      title: "确认删除外部资源",
      icon: <ExclamationCircleOutlined />,
      content: "确定要删除当前项目的整组外部资源配置吗？此操作不可恢复。",
      okText: "确认删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          await deleteProjectExternalResources(projectId);
          await refreshProjectResources(projectId);
          message.success("外部资源已删除");
          void fetchProjects(filters, pagination);
        } catch (error) {
          message.error("删除外部资源失败");
        }
      },
    });
  };

  const columns: TableColumnsType<ProjectTableRecord> = [
    {
      title: "项目名称",
      dataIndex: "project_name",
      key: "project_name",
      width: 200,
      ellipsis: true,
      fixed: "left",
      render: (text: string, record) => (
        <Button 
          type="link" 
          onClick={() => navigate(`/projects/${record.project_id}`)}
          style={{ padding: 0, fontWeight: 700, color: "#1e293b" }}
        >
          {text}
        </Button>
      ),
    },
    {
      title: "项目类型",
      dataIndex: "project_type",
      key: "project_type",
      width: 120,
      render: (text: string) => (
        <Tag color="default" style={{ borderRadius: 6, fontWeight: 500, border: "1px solid #e2e8f0" }}>
          {text}
        </Tag>
      ),
    },
    {
      title: "项目状态",
      dataIndex: "project_status",
      key: "project_status",
      width: 120,
      render: (status: string) => {
        const color = PROJECT_STATUS_DISPLAY_CONFIG[status] || "#64748b";
        return (
          <Space size={4}>
            <span
              className={styles.statusIndicator}
              style={{ color, backgroundColor: color }}
            />
            <span style={{ fontSize: 13, color: "#475569", fontWeight: 500 }}>{status}</span>
          </Space>
        );
      },
    },
    {
      title: "项目描述",
      dataIndex: "project_desc",
      key: "project_desc",
      width: 220,
      ellipsis: true,
      render: (value: string | null) => value || "-",
    },
    {
      title: "技术栈",
      dataIndex: "tech_framework",
      key: "tech_framework",
      width: 220,
      ellipsis: true,
      render: (value: string | null) => value || "-",
    },
    {
      title: "业务方",
      dataIndex: "business_unit",
      key: "business_unit",
      width: 140,
      ellipsis: true,
    },
    {
      title: "业务类型",
      dataIndex: "business_type",
      key: "business_type",
      width: 120,
    },
    {
      title: "所属系统",
      dataIndex: "belong_system",
      key: "belong_system",
      width: 140,
      ellipsis: true,
    },
    {
      title: "项目负责人",
      key: "project_leaders",
      width: 160,
      render: (_, record) => formatMemberNames(record.project_leaders),
    },
    {
      title: "更新时间",
      dataIndex: "update_time",
      key: "update_time",
      width: 180,
      render: (value: string) => dayjs(value).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: "备注",
      dataIndex: "remarks",
      key: "remarks",
      width: 180,
      ellipsis: true,
      render: (value: string | null) => value || "-",
    },
    {
      title: "操作",
      key: "action",
      width: 380,
      fixed: "right",
      render: (_, record) => {
        const resources = record.resources || [];
        const hasFrontend = resources.some(
          (resource) => resource.resource_type === "前端",
        );
        const hasBackend = resources.some(
          (resource) => resource.resource_type === "后端",
        );
        const isFull = hasFrontend && hasBackend;

        return (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/projects/${record.project_id}`)}
              style={{ color: "#3b82f6" }}
            >
              详情
            </Button>
            <Button
              type="link"
              size="small"
              icon={<PlusOutlined />}
              disabled={isFull}
              onClick={() => {
                let targetType = "";
                if (hasFrontend && !hasBackend) {
                  targetType = "后端";
                } else if (!hasFrontend && hasBackend) {
                  targetType = "前端";
                }
                navigate(
                  `/projects/${record.project_id}/resource/create${
                    targetType ? `?type=${targetType}` : ""
                  }`,
                );
              }}
              style={{ color: isFull ? undefined : "#10b981" }}
            >
              添加资源
            </Button>
            <Button
              type="link"
              size="small"
              icon={<PartitionOutlined />}
              onClick={() =>
                navigate(`/projects/${record.project_id}/external-resource/edit`)
              }
              style={{ color: "#f59e0b" }}
            >
              添加外部资源
            </Button>
            <Button
              type="link"
              size="small"
              onClick={() => navigate(`/projects/${record.project_id}/edit`)}
              style={{ color: "#6366f1" }}
            >
              编辑
            </Button>
            <Button
              type="link"
              size="small"
              danger
              onClick={() => void handleDeleteProject(record)}
            >
              删除
            </Button>
          </Space>
        );
      },
    },
  ];

  const expandedRowRender = (record: ProjectTableRecord) => {
    if (record.resourceLoading) {
      return (
        <div className={styles.expandedContainer} style={{ textAlign: "center" }}>
          <Spin tip="加载资源中..." />
        </div>
      );
    }

    const cards: Array<
      | {
          kind: "resource";
          resource: ProjectResource;
        }
      | {
          kind: "external";
          resource: ProjectExternalResource;
        }
    > = [];

    record.resources.forEach((resource) => {
      cards.push({ kind: "resource", resource });
    });

    const external = record.external_resources;
    const hasExternalConfig =
      external &&
      Boolean(
        external.aliyun_oss ||
          external.database_config ||
          external.redis_config ||
          external.middleware_config ||
          external.other_config,
      );
    if (external && hasExternalConfig) {
      cards.push({ kind: "external", resource: external });
    }

    if (cards.length === 0) {
      return (
        <div className={styles.expandedContainer} style={{ textAlign: "center", color: "#94a3b8" }}>
          暂无资源信息
        </div>
      );
    }

    return (
      <div className={styles.expandedContainer}>
        <Row gutter={[20, 20]}>
          {cards.map((card) => {
            if (card.kind === "external") {
              const resource = card.resource;
              return (
                <Col span={8} key={`external-${record.project_id}`}>
                  <Card
                    size="small"
                    className={`${styles.resourceCard} ${styles.resourceCardExternal}`}
                    title={
                      <Space>
                        <Tag color="orange" style={{ borderRadius: 4 }}>外部资源</Tag>
                        <Text strong>统一配置概览</Text>
                      </Space>
                    }
                    actions={[
                      <Button
                        type="text"
                        size="small"
                        key="edit"
                        icon={<PlusOutlined />}
                        className={styles.actionButton}
                        onClick={() =>
                          navigate(
                            `/projects/${record.project_id}/external-resource/edit`,
                          )
                        }
                        style={{ color: "#10b981" }}
                      >
                        编辑
                      </Button>,
                      <Button
                        type="text"
                        size="small"
                        danger
                        key="delete"
                        className={styles.actionButton}
                        onClick={() =>
                          handleDeleteExternalResources(record.project_id)
                        }
                      >
                        删除
                      </Button>,
                    ]}
                  >
                    <Descriptions
                      column={1}
                      size="small"
                    >
                      <Descriptions.Item
                        label={
                          <span>
                            <CloudOutlined /> 配置概览
                          </span>
                        }
                      >
                        <div style={{ color: "#475569" }}>
                          {resource.aliyun_oss && (
                            <div style={{ marginBottom: 4 }}>阿里云 OSS 已配置</div>
                          )}
                          {resource.database_config && (
                            <div style={{ marginBottom: 4 }}>数据库配置已录入</div>
                          )}
                          {resource.redis_config && (
                            <div style={{ marginBottom: 4 }}>Redis 配置已录入</div>
                          )}
                          {resource.middleware_config && (
                            <div style={{ marginBottom: 4 }}>中间件配置已录入</div>
                          )}
                          {resource.other_config && <div>其他配置已录入</div>}
                        </div>
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>
              );
            }

            const resource = card.resource;
            const typeClass = resource.resource_type === "前端" ? styles.resourceCardFrontend : styles.resourceCardBackend;
            return (
              <Col span={8} key={`resource-${resource.resource_id}`}>
                <Card
                  size="small"
                  className={`${styles.resourceCard} ${typeClass}`}
                  title={
                    <Space>
                      <Tag
                        color={resource.resource_type === "前端" ? "blue" : "green"}
                        style={{ borderRadius: 4 }}
                      >
                        {resource.resource_type}
                      </Tag>
                      <Text strong style={{ color: "#1e293b" }}>{resource.tech_framework || "未填写技术栈"}</Text>
                    </Space>
                  }
                  actions={[
                    <Button
                      type="text"
                      size="small"
                      key="edit"
                      className={styles.actionButton}
                      onClick={() =>
                        navigate(
                          `/projects/${record.project_id}/resource/${resource.resource_id}/edit`,
                        )
                      }
                      style={{ color: "#10b981" }}
                    >
                      编辑
                    </Button>,
                    <Button
                      type="text"
                      size="small"
                      danger
                      key="delete"
                      className={styles.actionButton}
                      onClick={() =>
                        handleDeleteResource(
                          record.project_id,
                          resource.resource_id,
                          resource.resource_type,
                        )
                      }
                    >
                      删除
                    </Button>,
                  ]}
                >
                  <Descriptions
                    column={1}
                    size="small"
                  >
                    <Descriptions.Item
                      label={
                        <span>
                          <GithubOutlined /> Git 仓库
                        </span>
                      }
                    >
                      <Text ellipsis={{ tooltip: resource.git_repo || undefined }}>
                        {resource.git_repo || "-"}
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item
                      label={
                        <span>
                          <TeamOutlined /> 开发人员
                        </span>
                      }
                    >
                      {formatMemberNames(resource.developers)}
                    </Descriptions.Item>
                    <Descriptions.Item
                      label={
                        <span>
                          <PartitionOutlined /> 发布分支
                        </span>
                      }
                    >
                      {resource.deploy_branch || "-"}
                    </Descriptions.Item>
                    <Descriptions.Item
                      label={
                        <span>
                          <GlobalOutlined /> 生产域名
                        </span>
                      }
                    >
                      <Text
                        ellipsis={{ tooltip: resource.prod_domain || undefined }}
                      >
                        {resource.prod_domain || "-"}
                      </Text>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>
            );
          })}
        </Row>
      </div>
    );
  };

  return (
    <div className={styles.projectContainer}>
      <Card className={styles.searchCard}>
        <Row gutter={[24, 20]}>
          <Col xs={24} sm={12} md={8} lg={6}>
            <span className={styles.filterLabel}>项目类型</span>
            <Select
              placeholder="全部类型"
              style={{ width: "100%" }}
              allowClear
              value={filters.project_type}
              onChange={(value) =>
                setFilters((previous) => ({ ...previous, project_type: value }))
              }
            >
              {PROJECT_TYPE_OPTIONS.map((option) => (
                <Select.Option key={option} value={option}>
                  {option}
                </Select.Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={12} md={8} lg={6}>
            <span className={styles.filterLabel}>项目状态</span>
            <Select
              placeholder="全部状态"
              style={{ width: "100%" }}
              allowClear
              value={filters.project_status}
              onChange={(value) =>
                setFilters((previous) => ({
                  ...previous,
                  project_status: value,
                }))
              }
            >
              {PROJECT_STATUS_OPTIONS.map((option) => (
                <Select.Option key={option} value={option}>
                  {option}
                </Select.Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={12} md={8} lg={6}>
            <span className={styles.filterLabel}>业务方</span>
            <Select
              placeholder="全部业务方"
              style={{ width: "100%" }}
              allowClear
              value={filters.business_unit}
              onChange={(value) =>
                setFilters((previous) => ({ ...previous, business_unit: value }))
              }
            >
              {BUSINESS_UNIT_OPTIONS.map((option) => (
                <Select.Option key={option} value={option}>
                  {option}
                </Select.Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={12} md={8} lg={6}>
            <span className={styles.filterLabel}>业务类型</span>
            <Select
              placeholder="全部业务类型"
              style={{ width: "100%" }}
              allowClear
              value={filters.business_type}
              onChange={(value) =>
                setFilters((previous) => ({ ...previous, business_type: value }))
              }
            >
              {BUSINESS_TYPE_OPTIONS.map((option) => (
                <Select.Option key={option} value={option}>
                  {option}
                </Select.Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={12} md={8} lg={6}>
            <span className={styles.filterLabel}>项目负责人</span>
            <Select
              placeholder="全部负责人"
              style={{ width: "100%" }}
              allowClear
              value={filters.project_leader_id}
              onChange={(value) =>
                setFilters((previous) => ({
                  ...previous,
                  project_leader_id: value,
                }))
              }
              showSearch
              optionFilterProp="children"
            >
              {members.map((member) => (
                <Select.Option key={member.member_id} value={member.member_id}>
                  {member.member_name}
                </Select.Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={12} md={8} lg={6}>
            <span className={styles.filterLabel}>所属系统</span>
            <Input
              placeholder="请输入系统名称"
              value={filters.belong_system}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  belong_system: event.target.value || undefined,
                }))
              }
            />
          </Col>

          <Col xs={24} sm={12} md={12} lg={8}>
            <span className={styles.filterLabel}>更新时间</span>
            <RangePicker
              style={{ width: "100%" }}
              value={filters.timeRange}
              onChange={(dates) =>
                setFilters((previous) => ({
                  ...previous,
                  timeRange:
                    dates && dates[0] && dates[1]
                      ? [dates[0], dates[1]]
                      : null,
                }))
              }
            />
          </Col>
        </Row>

        <div className={styles.searchActionRow}>
          <Space size="middle">
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
              style={{ background: "#1e293b", borderColor: "#1e293b", borderRadius: 8 }}
            >
              查询项目
            </Button>
            <Button onClick={handleReset} style={{ borderRadius: 8 }}>重置</Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate("/projects/create")}
              style={{ background: "#10b981", borderColor: "#10b981", borderRadius: 8 }}
            >
              创建项目
            </Button>
          </Space>
        </div>
      </Card>

      <Card className={styles.tableCard}>
        <Table<ProjectTableRecord>
          className={styles.projectTable}
          columns={columns}
          expandable={{
            expandedRowRender,
            expandedRowKeys,
            onExpandedRowsChange: (keys) => setExpandedRowKeys([...keys]),
            onExpand: (expanded, record) => void handleExpand(expanded, record),
          }}
          dataSource={dataSource}
          loading={loading}
          tableLayout="fixed"
          scroll={{ x: 1600 }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条项目`,
          }}
          onChange={(pager) => {
            void fetchProjects(filters, {
              current: pager.current ?? 1,
              pageSize: pager.pageSize ?? pagination.pageSize,
              total: pagination.total,
            });
          }}
        />
      </Card>
    </div>
  );
};

export default ProjectList;
