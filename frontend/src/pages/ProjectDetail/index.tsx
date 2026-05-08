import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  List,
  Row,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
  message,
} from "antd";
import {
  AlertOutlined,
  ApiOutlined,
  BranchesOutlined,
  CloudOutlined,
  DatabaseOutlined,
  EditOutlined,
  LinkOutlined,
  ReloadOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate, useParams } from "react-router-dom";

import {
  PROJECT_STATUS_COLORS,
  PROJECT_STATUS_OPTIONS,
  RESOURCE_TYPE_OPTIONS,
} from "@/constants/project";
import { getProject, getProjectResources } from "@/services/project";
import type { StructuredExternalResource } from "@/types/externalResource";
import type {
  ProjectResource,
  ProjectResourcesPayload,
  ProjectSummary,
} from "@/types/project";
import {
  hasStructuredSectionContent,
  hasStructuredSectionItems,
  normalizeExternalResource,
} from "@/utils/externalResource";

const { Paragraph, Text, Title } = Typography;

const FRONTEND_RESOURCE_TYPE = RESOURCE_TYPE_OPTIONS[0];
const BACKEND_RESOURCE_TYPE = RESOURCE_TYPE_OPTIONS[1];
const ONLINE_STATUS = PROJECT_STATUS_OPTIONS[2];

type WarningLevel = "error" | "warning";

interface ProjectWarning {
  level: WarningLevel;
  message: string;
}

type SectionKey = keyof StructuredExternalResource;

interface SectionDescriptor {
  key: SectionKey;
  title: string;
  icon: React.ReactNode;
  fields: Array<{
    key: string;
    label: string;
  }>;
}

const SECTION_DESCRIPTORS: SectionDescriptor[] = [
  {
    key: "aliyun_oss",
    title: "OSS / 对象存储",
    icon: <CloudOutlined />,
    fields: [
      { key: "name", label: "名称" },
      { key: "bucket_name", label: "Bucket" },
      { key: "endpoint", label: "Endpoint" },
      { key: "region", label: "Region" },
      { key: "environment", label: "环境" },
      { key: "access_path", label: "访问路径" },
      { key: "notes", label: "备注" },
    ],
  },
  {
    key: "database_config",
    title: "数据库",
    icon: <DatabaseOutlined />,
    fields: [
      { key: "name", label: "名称" },
      { key: "engine", label: "类型" },
      { key: "host", label: "Host" },
      { key: "port", label: "Port" },
      { key: "database_name", label: "库名" },
      { key: "account_name", label: "账号" },
      { key: "environment", label: "环境" },
      { key: "notes", label: "备注" },
    ],
  },
  {
    key: "redis_config",
    title: "Redis",
    icon: <ApiOutlined />,
    fields: [
      { key: "name", label: "名称" },
      { key: "host", label: "Host" },
      { key: "port", label: "Port" },
      { key: "database_index", label: "DB Index" },
      { key: "environment", label: "环境" },
      { key: "notes", label: "备注" },
    ],
  },
  {
    key: "middleware_config",
    title: "中间件",
    icon: <BranchesOutlined />,
    fields: [
      { key: "name", label: "名称" },
      { key: "middleware_type", label: "类型" },
      { key: "endpoint", label: "接入地址" },
      { key: "environment", label: "环境" },
      { key: "notes", label: "备注" },
    ],
  },
  {
    key: "other_config",
    title: "其他依赖",
    icon: <LinkOutlined />,
    fields: [
      { key: "name", label: "名称" },
      { key: "environment", label: "环境" },
      { key: "config_summary", label: "配置摘要" },
      { key: "notes", label: "备注" },
    ],
  },
];

function formatMemberNames(
  members: Array<{ member_name: string }> | undefined,
): string {
  if (!members || members.length === 0) {
    return "-";
  }
  return members.map((member) => member.member_name).join("、");
}

function hasOnlineGaps(resource: ProjectResource): boolean {
  return !resource.prod_domain || !resource.deploy_method || !resource.deploy_addr;
}

function buildWarnings(
  project: ProjectSummary | null,
  resourcesPayload: ProjectResourcesPayload | null,
  structuredExternal: StructuredExternalResource | null,
): ProjectWarning[] {
  if (!project || !resourcesPayload || !structuredExternal) {
    return [];
  }

  const warnings: ProjectWarning[] = [];
  const resources = resourcesPayload.resources;
  const hasFrontend = resources.some(
    (resource) => resource.resource_type === FRONTEND_RESOURCE_TYPE,
  );
  const hasBackend = resources.some(
    (resource) => resource.resource_type === BACKEND_RESOURCE_TYPE,
  );
  const structuredSections = SECTION_DESCRIPTORS.filter(({ key }) =>
    hasStructuredSectionItems(structuredExternal[key]),
  );

  if (project.project_leader_ids.length === 0) {
    warnings.push({
      level: "warning",
      message: "项目未配置负责人，后续交接和责任归属会不清晰。",
    });
  }

  if (!hasFrontend) {
    warnings.push({
      level: "warning",
      message: "项目缺少前端资源登记。",
    });
  }

  if (!hasBackend) {
    warnings.push({
      level: "warning",
      message: "项目缺少后端资源登记。",
    });
  }

  if (dayjs().diff(project.update_time, "day") > 90) {
    warnings.push({
      level: "warning",
      message: "项目超过 90 天未更新，建议确认资源和负责人是否仍准确。",
    });
  }

  for (const resource of resources) {
    if (resource.developer_ids.length === 0) {
      warnings.push({
        level: "warning",
        message: `${resource.resource_type}资源未配置开发人员。`,
      });
    }
    if (!resource.git_repo) {
      warnings.push({
        level: "warning",
        message: `${resource.resource_type}资源未填写 Git 仓库地址。`,
      });
    }
    if (project.project_status === ONLINE_STATUS && hasOnlineGaps(resource)) {
      warnings.push({
        level: "error",
        message: `${resource.resource_type}资源已上线但部署信息不完整，至少应补齐部署方式、部署地址和生产域名。`,
      });
    }
  }

  if (project.project_status === ONLINE_STATUS && structuredSections.length === 0) {
    warnings.push({
      level: "error",
      message: "项目状态为已上线，但尚未登记任何结构化外部依赖。",
    });
  }

  for (const descriptor of SECTION_DESCRIPTORS) {
    const section = structuredExternal[descriptor.key];
    if (section.items.length === 0 && section.notes.trim()) {
      warnings.push({
        level: "warning",
        message: `${descriptor.title}目前只有备注说明，尚未补齐结构化字段。`,
      });
    }
  }

  const incompleteDatabaseItems = structuredExternal.database_config.items.filter(
    (item) => !item.host || !item.database_name,
  ).length;
  if (incompleteDatabaseItems > 0) {
    warnings.push({
      level: "warning",
      message: `数据库配置中有 ${incompleteDatabaseItems} 条缺少 host 或库名。`,
    });
  }

  const incompleteRedisItems = structuredExternal.redis_config.items.filter(
    (item) => !item.host || !item.port,
  ).length;
  if (incompleteRedisItems > 0) {
    warnings.push({
      level: "warning",
      message: `Redis 配置中有 ${incompleteRedisItems} 条缺少 host 或 port。`,
    });
  }

  const incompleteOssItems = structuredExternal.aliyun_oss.items.filter(
    (item) => !item.bucket_name || !item.endpoint,
  ).length;
  if (incompleteOssItems > 0) {
    warnings.push({
      level: "warning",
      message: `OSS 配置中有 ${incompleteOssItems} 条缺少 bucket 或 endpoint。`,
    });
  }

  return warnings;
}

function renderValue(value: unknown): React.ReactNode {
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  return "-";
}

function SectionCard({
  descriptor,
  resource,
}: {
  descriptor: SectionDescriptor;
  resource: StructuredExternalResource;
}) {
  const section = resource[descriptor.key];

  if (!hasStructuredSectionContent(section)) {
    return null;
  }

  return (
    <Card
      title={
        <Space>
          {descriptor.icon}
          <span>{descriptor.title}</span>
        </Space>
      }
      variant="borderless"
      style={{ height: "100%" }}
    >
      {section.items.length > 0 ? (
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          {section.items.map((item, index) => (
            <Descriptions
              key={`${descriptor.key}-${index}`}
              size="small"
              bordered
              column={1}
              title={`${descriptor.title} ${index + 1}`}
            >
              {descriptor.fields
                .filter(({ key }) => {
                  const value = (item as Record<string, unknown>)[key];
                  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
                })
                .map(({ key, label }) => (
                  <Descriptions.Item key={key} label={label}>
                    {renderValue((item as Record<string, unknown>)[key])}
                  </Descriptions.Item>
                ))}
            </Descriptions>
          ))}
        </Space>
      ) : null}

      {section.notes?.trim() ? (
        <Alert
          type="info"
          showIcon
          message="补充说明"
          description={section.notes}
          style={{ marginTop: section.items.length > 0 ? 16 : 0 }}
        />
      ) : null}
    </Card>
  );
}

const ProjectDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [resourcesPayload, setResourcesPayload] = useState<ProjectResourcesPayload | null>(null);

  useEffect(() => {
    void fetchProjectDetail();
  }, [id]);

  const externalResource = useMemo(
    () => normalizeExternalResource(resourcesPayload?.external_resources),
    [resourcesPayload],
  );

  const warnings = useMemo(
    () => buildWarnings(project, resourcesPayload, externalResource),
    [externalResource, project, resourcesPayload],
  );

  const visibleExternalSections = useMemo(
    () =>
      SECTION_DESCRIPTORS.filter(({ key }) =>
        hasStructuredSectionContent(externalResource[key]),
      ),
    [externalResource],
  );

  const structuredExternalSections = useMemo(
    () =>
      SECTION_DESCRIPTORS.filter(({ key }) =>
        hasStructuredSectionItems(externalResource[key]),
      ),
    [externalResource],
  );

  const fetchProjectDetail = async () => {
    if (!id) {
      return;
    }

    setLoading(true);
    try {
      const [projectResponse, resourceResponse] = await Promise.all([
        getProject(Number(id)),
        getProjectResources(Number(id)),
      ]);
      setProject(projectResponse);
      setResourcesPayload(resourceResponse);
    } catch (error) {
      message.error("获取项目详情失败");
      navigate("/projects");
    } finally {
      setLoading(false);
    }
  };

  if (loading || !project || !resourcesPayload) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card variant="borderless">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <Space size={[8, 8]} wrap>
              <Title level={3} style={{ margin: 0 }}>
                {project.project_name}
              </Title>
              <Tag color="blue">{project.project_type}</Tag>
              <Tag color={PROJECT_STATUS_COLORS[project.project_status] || "blue"}>
                {project.project_status}
              </Tag>
            </Space>
            <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
              {project.project_desc || "暂无项目描述"}
            </Paragraph>
          </div>

          <Space wrap>
            <Button onClick={() => navigate("/projects")}>返回列表</Button>
            <Button onClick={() => void fetchProjectDetail()} icon={<ReloadOutlined />}>
              刷新
            </Button>
            <Button
              onClick={() => navigate(`/projects/${project.project_id}/external-resource/edit`)}
              icon={<CloudOutlined />}
            >
              编辑外部资源
            </Button>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => navigate(`/projects/${project.project_id}/edit`)}
            >
              编辑项目
            </Button>
          </Space>
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <Card variant="borderless">
            <Statistic title="负责人" value={project.project_leader_ids.length} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card variant="borderless">
            <Statistic title="资源条目" value={resourcesPayload.resources.length} prefix={<ApiOutlined />} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card variant="borderless">
            <Statistic title="结构化外部分类" value={structuredExternalSections.length} prefix={<CloudOutlined />} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card variant="borderless">
            <Statistic
              title="预警项"
              value={warnings.length}
              prefix={<AlertOutlined />}
              valueStyle={{ color: warnings.length > 0 ? "#cf1322" : undefined }}
            />
          </Card>
        </Col>
      </Row>

      {warnings.length > 0 ? (
        <Alert
          type={warnings.some((item) => item.level === "error") ? "error" : "warning"}
          showIcon
          message="项目预警"
          description={
            <List<ProjectWarning>
              size="small"
              dataSource={warnings}
              renderItem={(item) => (
                <List.Item>
                  <Space size={8} wrap>
                    <Tag color={item.level === "error" ? "red" : "orange"}>
                      {item.level === "error" ? "高风险" : "提醒"}
                    </Tag>
                    <span>{item.message}</span>
                  </Space>
                </List.Item>
              )}
            />
          }
        />
      ) : (
        <Alert
          type="success"
          showIcon
          message="当前未发现明显预警"
          description="项目负责人、资源和外部依赖信息已达到当前规则下的基础完整度。"
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card title="基础信息" variant="borderless">
            <Descriptions bordered column={2}>
              <Descriptions.Item label="项目名称">{project.project_name}</Descriptions.Item>
              <Descriptions.Item label="项目类型">{project.project_type}</Descriptions.Item>
              <Descriptions.Item label="项目状态">{project.project_status}</Descriptions.Item>
              <Descriptions.Item label="技术栈">{project.tech_framework || "-"}</Descriptions.Item>
              <Descriptions.Item label="业务方">{project.business_unit}</Descriptions.Item>
              <Descriptions.Item label="业务类型">{project.business_type}</Descriptions.Item>
              <Descriptions.Item label="所属系统">{project.belong_system}</Descriptions.Item>
              <Descriptions.Item label="最后更新时间">
                {dayjs(project.update_time).format("YYYY-MM-DD HH:mm")}
              </Descriptions.Item>
              <Descriptions.Item label="项目负责人" span={2}>
                {formatMemberNames(project.project_leaders)}
              </Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>
                {project.remarks || "-"}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card title="资源覆盖情况" variant="borderless">
            <List
              split={false}
              dataSource={[
                {
                  title: "前端资源",
                  exists: resourcesPayload.resources.some(
                    (resource) => resource.resource_type === FRONTEND_RESOURCE_TYPE,
                  ),
                },
                {
                  title: "后端资源",
                  exists: resourcesPayload.resources.some(
                    (resource) => resource.resource_type === BACKEND_RESOURCE_TYPE,
                  ),
                },
                {
                  title: "结构化外部依赖",
                  exists: structuredExternalSections.length > 0,
                },
              ]}
              renderItem={(item) => (
                <List.Item>
                  <Space>
                    <Tag color={item.exists ? "green" : "orange"}>
                      {item.exists ? "已登记" : "待补充"}
                    </Tag>
                    <span>{item.title}</span>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="项目资源"
        variant="borderless"
        extra={
          <Button onClick={() => navigate(`/projects/${project.project_id}/resource/create`)}>
            添加资源
          </Button>
        }
      >
        {resourcesPayload.resources.length === 0 ? (
          <Empty description="暂无项目资源" />
        ) : (
          <Row gutter={[16, 16]}>
            {resourcesPayload.resources.map((resource) => (
              <Col key={resource.resource_id} xs={24} xl={12}>
                <Card
                  size="small"
                  title={
                    <Space>
                      <Tag
                        color={
                          resource.resource_type === FRONTEND_RESOURCE_TYPE ? "blue" : "green"
                        }
                      >
                        {resource.resource_type}
                      </Tag>
                      <span>{resource.tech_framework || "未填写技术栈"}</span>
                    </Space>
                  }
                  extra={
                    <Button
                      type="link"
                      onClick={() =>
                        navigate(
                          `/projects/${project.project_id}/resource/${resource.resource_id}/edit`,
                        )
                      }
                    >
                      编辑
                    </Button>
                  }
                >
                  <Descriptions size="small" column={1}>
                    <Descriptions.Item label="开发人员">
                      {formatMemberNames(resource.developers)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Git 仓库">{resource.git_repo || "-"}</Descriptions.Item>
                    <Descriptions.Item label="部署方式">{resource.deploy_method || "-"}</Descriptions.Item>
                    <Descriptions.Item label="部署分支">{resource.deploy_branch || "-"}</Descriptions.Item>
                    <Descriptions.Item label="部署地址">{resource.deploy_addr || "-"}</Descriptions.Item>
                    <Descriptions.Item label="生产域名">{resource.prod_domain || "-"}</Descriptions.Item>
                    <Descriptions.Item label="UAT 域名">{resource.uat_domain || "-"}</Descriptions.Item>
                    <Descriptions.Item label="部署步骤">
                      <Text style={{ whiteSpace: "pre-wrap" }}>{resource.deploy_steps || "-"}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="特别说明">
                      {resource.special_note || resource.resource_remarks || "-"}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>

      <Card
        title="外部资源"
        variant="borderless"
        extra={
          <Button onClick={() => navigate(`/projects/${project.project_id}/external-resource/edit`)}>
            编辑外部资源
          </Button>
        }
      >
        {visibleExternalSections.length === 0 ? (
          <Empty description="暂无外部资源配置" />
        ) : (
          <Row gutter={[16, 16]}>
            {visibleExternalSections.map((descriptor) => (
              <Col key={descriptor.key} xs={24} xl={12}>
                <SectionCard descriptor={descriptor} resource={externalResource} />
              </Col>
            ))}
          </Row>
        )}
      </Card>
    </Space>
  );
};

export default ProjectDetail;
