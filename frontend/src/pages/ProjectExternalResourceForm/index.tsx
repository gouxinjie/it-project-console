import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  Row,
  Select,
  Space,
  Spin,
  Typography,
  message,
} from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";

import type { StructuredExternalResourceFormValues } from "@/types/externalResource";
import { getProjectExternalResources, updateProjectExternalResources } from "@/services/project";
import {
  parseExternalResource,
  serializeExternalResourceFormValues,
  toExternalResourceFormValues,
} from "@/utils/externalResource";

const { TextArea } = Input;
const { Paragraph, Text } = Typography;

type SectionKey = keyof StructuredExternalResourceFormValues;
type FieldType = "input" | "textarea" | "select";

interface FieldConfig {
  key: string;
  label: string;
  placeholder: string;
  type?: FieldType;
  span?: number;
  rows?: number;
  options?: string[];
}

interface SectionConfig {
  key: SectionKey;
  title: string;
  description: string;
  addLabel: string;
  fields: FieldConfig[];
}

const ENV_OPTIONS = ["生产", "预发/UAT", "测试", "开发", "共享"];

const EMPTY_FORM_VALUES: StructuredExternalResourceFormValues = {
  aliyun_oss: { items: [], notes: "" },
  database_config: { items: [], notes: "" },
  redis_config: { items: [], notes: "" },
  middleware_config: { items: [], notes: "" },
  other_config: { items: [], notes: "" },
};

const SECTION_CONFIGS: SectionConfig[] = [
  {
    key: "aliyun_oss",
    title: "OSS / 对象存储",
    description: "按资源条目维护 bucket、endpoint 和访问说明，适合多个环境并存。",
    addLabel: "添加 OSS 条目",
    fields: [
      { key: "name", label: "名称", placeholder: "如：项目主桶", span: 8 },
      { key: "bucket_name", label: "Bucket", placeholder: "bucket 名称", span: 8 },
      { key: "endpoint", label: "Endpoint", placeholder: "如：oss-cn-shanghai.aliyuncs.com", span: 8 },
      { key: "region", label: "Region", placeholder: "如：cn-shanghai", span: 8 },
      {
        key: "environment",
        label: "环境",
        placeholder: "选择环境",
        type: "select",
        span: 8,
        options: ENV_OPTIONS,
      },
      { key: "access_path", label: "访问路径", placeholder: "域名 / 路径 / 权限说明", span: 8 },
      {
        key: "notes",
        label: "备注",
        placeholder: "补充说明、负责人、权限来源等",
        type: "textarea",
        rows: 3,
        span: 24,
      },
    ],
  },
  {
    key: "database_config",
    title: "数据库",
    description: "把数据库拆成结构化字段，便于后续检查 host、库名和环境是否缺失。",
    addLabel: "添加数据库条目",
    fields: [
      { key: "name", label: "名称", placeholder: "如：主库 / 报表库", span: 6 },
      {
        key: "engine",
        label: "类型",
        placeholder: "选择数据库类型",
        type: "select",
        span: 6,
        options: ["MySQL", "PostgreSQL", "SQL Server", "Oracle", "MongoDB", "Other"],
      },
      { key: "host", label: "Host", placeholder: "数据库地址", span: 6 },
      { key: "port", label: "Port", placeholder: "端口", span: 6 },
      { key: "database_name", label: "库名", placeholder: "数据库名称", span: 8 },
      { key: "account_name", label: "账号", placeholder: "账号名或凭据说明", span: 8 },
      {
        key: "environment",
        label: "环境",
        placeholder: "选择环境",
        type: "select",
        span: 8,
        options: ENV_OPTIONS,
      },
      {
        key: "notes",
        label: "备注",
        placeholder: "补充连接方式、白名单、凭据位置等",
        type: "textarea",
        rows: 3,
        span: 24,
      },
    ],
  },
  {
    key: "redis_config",
    title: "Redis",
    description: "记录 Redis 实例、逻辑库和环境，方便排查线上依赖缺失。",
    addLabel: "添加 Redis 条目",
    fields: [
      { key: "name", label: "名称", placeholder: "如：缓存实例", span: 6 },
      { key: "host", label: "Host", placeholder: "Redis 地址", span: 6 },
      { key: "port", label: "Port", placeholder: "端口", span: 6 },
      { key: "database_index", label: "DB Index", placeholder: "逻辑库编号", span: 6 },
      {
        key: "environment",
        label: "环境",
        placeholder: "选择环境",
        type: "select",
        span: 8,
        options: ENV_OPTIONS,
      },
      {
        key: "notes",
        label: "备注",
        placeholder: "补充密码位置、哨兵信息、集群说明等",
        type: "textarea",
        rows: 3,
        span: 16,
      },
    ],
  },
  {
    key: "middleware_config",
    title: "中间件",
    description: "适合维护 MQ、配置中心、网关、定时任务平台等外部依赖。",
    addLabel: "添加中间件条目",
    fields: [
      { key: "name", label: "名称", placeholder: "中间件名称", span: 8 },
      {
        key: "middleware_type",
        label: "类型",
        placeholder: "选择中间件类型",
        type: "select",
        span: 8,
        options: ["MQ", "配置中心", "网关", "任务调度", "搜索引擎", "Other"],
      },
      {
        key: "environment",
        label: "环境",
        placeholder: "选择环境",
        type: "select",
        span: 8,
        options: ENV_OPTIONS,
      },
      { key: "endpoint", label: "接入地址", placeholder: "域名 / 地址 / Topic 等", span: 12 },
      {
        key: "notes",
        label: "备注",
        placeholder: "补充用途、负责人、关键配置项",
        type: "textarea",
        rows: 3,
        span: 12,
      },
    ],
  },
  {
    key: "other_config",
    title: "其他依赖",
    description: "用于记录上面未覆盖但仍需要交接或预警的资源。",
    addLabel: "添加其他条目",
    fields: [
      { key: "name", label: "名称", placeholder: "资源名称", span: 8 },
      {
        key: "environment",
        label: "环境",
        placeholder: "选择环境",
        type: "select",
        span: 8,
        options: ENV_OPTIONS,
      },
      {
        key: "config_summary",
        label: "配置摘要",
        placeholder: "一句话说明用途和接入方式",
        span: 8,
      },
      {
        key: "notes",
        label: "备注",
        placeholder: "补充必要说明",
        type: "textarea",
        rows: 3,
        span: 24,
      },
    ],
  },
];

function renderField(
  sectionKey: SectionKey,
  itemName: number,
  fieldConfig: FieldConfig,
) {
  const namePath = [sectionKey, "items", itemName, fieldConfig.key];

  if (fieldConfig.type === "textarea") {
    return (
      <Form.Item key={fieldConfig.key} name={namePath} label={fieldConfig.label}>
        <TextArea
          rows={fieldConfig.rows ?? 3}
          placeholder={fieldConfig.placeholder}
          maxLength={500}
          showCount
        />
      </Form.Item>
    );
  }

  if (fieldConfig.type === "select") {
    return (
      <Form.Item key={fieldConfig.key} name={namePath} label={fieldConfig.label}>
        <Select
          allowClear
          placeholder={fieldConfig.placeholder}
          options={(fieldConfig.options ?? []).map((option) => ({
            label: option,
            value: option,
          }))}
        />
      </Form.Item>
    );
  }

  return (
    <Form.Item key={fieldConfig.key} name={namePath} label={fieldConfig.label}>
      <Input placeholder={fieldConfig.placeholder} maxLength={200} />
    </Form.Item>
  );
}

const ProjectExternalResourceForm: React.FC = () => {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const [form] = Form.useForm<StructuredExternalResourceFormValues>();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [legacySections, setLegacySections] = useState<string[]>([]);

  useEffect(() => {
    void fetchResourceData();
  }, [projectId]);

  const legacyNotice = useMemo(() => {
    if (legacySections.length === 0) {
      return null;
    }
    return `检测到旧版文本配置：${legacySections.join("、")}。已自动转入补充说明，建议补齐结构化字段后保存。`;
  }, [legacySections]);

  const fetchResourceData = async () => {
    if (!projectId) {
      return;
    }

    setLoading(true);
    try {
      const data = await getProjectExternalResources(Number(projectId));
      const parsed = parseExternalResource(data);
      setLegacySections(
        SECTION_CONFIGS.filter(({ key }) => parsed[key].source === "legacy-text").map(
          ({ title }) => title,
        ),
      );
      form.setFieldsValue(toExternalResourceFormValues(data));
    } catch (error) {
      message.error("获取外部资源信息失败");
      navigate("/projects");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: StructuredExternalResourceFormValues) => {
    if (!projectId) {
      return;
    }

    setSubmitting(true);
    try {
      await updateProjectExternalResources(
        Number(projectId),
        serializeExternalResourceFormValues(values),
      );
      message.success("外部资源已更新");
      navigate(`/projects/${projectId}`);
    } catch (error) {
      message.error("更新失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (projectId) {
      navigate(`/projects/${projectId}`);
      return;
    }
    navigate("/projects");
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Card
      title="外部资源"
      bordered={false}
      extra={<Button onClick={handleCancel}>返回</Button>}
    >
      {legacyNotice ? (
        <Alert
          type="warning"
          showIcon
          message="已自动兼容旧版文本配置"
          description={legacyNotice}
          style={{ marginBottom: 16 }}
        />
      ) : null}

      <Form<StructuredExternalResourceFormValues>
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
        size="middle"
        initialValues={EMPTY_FORM_VALUES}
      >
        {SECTION_CONFIGS.map((section) => (
          <div key={section.key}>
            <Divider orientation="left">{section.title}</Divider>
            <Paragraph type="secondary" style={{ marginBottom: 12 }}>
              {section.description}
            </Paragraph>

            <Form.List name={[section.key, "items"]}>
              {(fields, { add, remove }) => (
                <Space direction="vertical" size={16} style={{ width: "100%" }}>
                  {fields.map((field, index) => (
                    <Card
                      key={field.key}
                      size="small"
                      title={`${section.title} ${index + 1}`}
                      extra={
                        <Button
                          type="text"
                          danger
                          icon={<MinusCircleOutlined />}
                          onClick={() => remove(field.name)}
                        >
                          删除
                        </Button>
                      }
                    >
                      <Row gutter={16}>
                        {section.fields.map((fieldConfig) => (
                          <Col
                            key={fieldConfig.key}
                            xs={24}
                            md={fieldConfig.span ?? 12}
                          >
                            {renderField(section.key, field.name, fieldConfig)}
                          </Col>
                        ))}
                      </Row>
                    </Card>
                  ))}

                  <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({})} block>
                    {section.addLabel}
                  </Button>
                </Space>
              )}
            </Form.List>

            <Form.Item
              name={[section.key, "notes"]}
              label="补充说明"
              style={{ marginTop: 16 }}
            >
              <TextArea
                rows={4}
                placeholder="如暂时无法结构化录入，可先补充说明；保存后会按新格式存储。"
                maxLength={1000}
                showCount
              />
            </Form.Item>
          </div>
        ))}

        <div style={{ marginTop: 24 }}>
          <Text type="secondary">
            说明：结构化字段用于后续详情展示和预警检测，补充说明用于保留复杂或暂未拆分的信息。
          </Text>
        </div>

        <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
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
