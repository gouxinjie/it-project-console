import React, { useEffect, useState } from "react";
import {
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
  Tooltip,
  message,
  Typography,
} from "antd";
import {
  InfoCircleOutlined,
  CloudUploadOutlined,
  DeploymentUnitOutlined,
  BranchesOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  FileTextOutlined,
  UserOutlined,
  GithubOutlined,
  CodeOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { RESOURCE_TYPE_OPTIONS } from "@/constants/project";
import { getAllMembers } from "@/services/member";
import {
  createProjectResource,
  getProjectResource,
  getProjectResources,
  updateProjectResource,
} from "@/services/project";
import type { Member } from "@/types/member";
import type { ProjectResourcePayload } from "@/types/project";

const { TextArea } = Input;
const { Title, Text } = Typography;

interface ResourceFormValues
  extends Omit<ProjectResourcePayload, "developer_ids"> {
  developer_ids?: number[];
}

const ProjectResourceForm: React.FC = () => {
  const navigate = useNavigate();
  const { projectId, resourceId } = useParams<{
    projectId: string;
    resourceId: string;
  }>();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm<ResourceFormValues>();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existingTypes, setExistingTypes] = useState<string[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const forcedType = searchParams.get("type");
  const isEdit = Boolean(resourceId);

  useEffect(() => {
    void fetchMembers();
    if (isEdit) {
      void fetchResourceData();
      return;
    }

    void fetchExistingResources();
    if (forcedType) {
      form.setFieldsValue({ resource_type: forcedType });
    }
  }, [forcedType, isEdit, projectId, resourceId]);

  const fetchMembers = async () => {
    try {
      const items = await getAllMembers();
      setMembers(items);
    } catch (error) {
      console.error("Failed to fetch members:", error);
      message.error("获取成员列表失败");
    }
  };

  const fetchExistingResources = async () => {
    if (!projectId) {
      return;
    }

    try {
      const response = await getProjectResources(Number(projectId));
      setExistingTypes(response.resources.map((resource) => resource.resource_type));
    } catch (error) {
      console.error("Failed to fetch project resources:", error);
    }
  };

  const fetchResourceData = async () => {
    if (!projectId || !resourceId) {
      return;
    }

    setLoading(true);
    try {
      const data = await getProjectResource(Number(projectId), Number(resourceId));
      form.setFieldsValue({
        ...data,
        developer_ids: data.developer_ids,
      });
    } catch (error) {
      message.error("获取资源详情失败");
      navigate("/projects");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: ResourceFormValues) => {
    if (!projectId) {
      return;
    }

    setSubmitting(true);
    try {
      const payload: ProjectResourcePayload = {
        ...values,
        developer_ids: values.developer_ids ?? [],
      };

      if (!isEdit && existingTypes.includes(payload.resource_type)) {
        message.error(`当前项目已存在 ${payload.resource_type} 资源，不能重复创建`);
        return;
      }

      if (isEdit && resourceId) {
        await updateProjectResource(Number(projectId), Number(resourceId), payload);
        message.success("资源已更新");
      } else {
        await createProjectResource(Number(projectId), payload);
        message.success("资源已创建");
      }
      navigate("/projects");
    } catch (error) {
      message.error(isEdit ? "更新资源失败" : "创建资源失败");
    } finally {
      setSubmitting(false);
    }
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
      title={
        <Space>
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate("/projects")} 
            style={{ marginRight: 8 }}
          />
          <Title level={4} style={{ margin: 0 }}>
            {isEdit ? "编辑项目资源" : "新增项目资源"}
          </Title>
        </Space>
      }
      variant="borderless"
      className="form-card"
      style={{ boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)" }}
    >
      <Form<ResourceFormValues>
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
        size="middle"
        requiredMark="optional"
      >
        <div style={{ 
          marginBottom: 20, 
          padding: '20px 24px', 
          background: '#f0f7ff', 
          border: '1px solid #91caff', 
          borderLeft: '4px solid #1677ff',
          borderRadius: '8px' 
        }}>
          <Title level={5} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, marginTop: 0, color: '#003a8c' }}>
            <CodeOutlined />
            基本信息
          </Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="资源类型"
                name="resource_type"
                rules={[{ required: true, message: "请选择资源类型" }]}
                tooltip="定义该资源所属的技术分层"
                style={{ marginBottom: 0 }}
              >
                <Select
                  placeholder="请选择资源类型"
                  disabled={Boolean(forcedType) && !isEdit}
                  suffixIcon={<CodeOutlined />}
                >
                  {RESOURCE_TYPE_OPTIONS.map((option) => (
                    <Select.Option
                      key={option}
                      value={option}
                      disabled={!isEdit && existingTypes.includes(option)}
                    >
                      {option}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                label="Git 仓库"
                name="git_repo"
                rules={[{ required: true, message: "请输入 Git 仓库地址" }]}
                style={{ marginBottom: 0 }}
              >
                <Input 
                  prefix={<GithubOutlined style={{ color: 'rgba(0,0,0,0.45)' }} />} 
                  placeholder="https://github.com/example/repo.git" 
                  maxLength={200} 
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                label="技术栈"
                name="tech_framework"
                rules={[{ required: true, message: "请输入技术栈" }]}
                style={{ marginBottom: 0 }}
              >
                <Input 
                  prefix={<CodeOutlined style={{ color: 'rgba(0,0,0,0.45)' }} />}
                  placeholder="例如：React 18 + TypeScript" 
                  maxLength={200} 
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                label="开发人员"
                name="developer_ids"
                rules={[{ required: true, message: "请选择开发人员" }]}
                style={{ marginBottom: 0 }}
              >
                <Select
                  mode="multiple"
                  placeholder="请选择负责该资源的开发人员"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  suffixIcon={<UserOutlined />}
                  options={members.map((member) => ({
                    label: member.member_name,
                    value: member.member_id,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
        </div>

        <div style={{ 
          marginBottom: 20, 
          padding: '20px 24px', 
          background: '#f6ffed', 
          border: '1px solid #b7eb8f', 
          borderLeft: '4px solid #52c41a',
          borderRadius: '8px' 
        }}>
          <Title level={5} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, marginTop: 0, color: '#135200' }}>
            <CloudUploadOutlined />
            部署信息
          </Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Form.Item label="部署方式" name="deploy_method" style={{ marginBottom: 0 }}>
                <Select 
                  placeholder="请选择部署方式" 
                  allowClear
                  suffixIcon={<CloudUploadOutlined />}
                >
                  <Select.Option value="Docker">Docker</Select.Option>
                  <Select.Option value="K8s">K8s</Select.Option>
                  <Select.Option value="Jenkins">Jenkins</Select.Option>
                  <Select.Option value="云托管">云托管</Select.Option>
                  <Select.Option value="手动部署">手动部署</Select.Option>
                  <Select.Option value="其他">其他</Select.Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} sm={8}>
              <Form.Item label="发布分支" name="deploy_branch" style={{ marginBottom: 0 }}>
                <Input 
                  prefix={<BranchesOutlined style={{ color: 'rgba(0,0,0,0.45)' }} />}
                  placeholder="例如：main、develop" 
                  maxLength={50} 
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={8}>
              <Form.Item label="部署地址" name="deploy_addr" style={{ marginBottom: 0 }}>
                <Input 
                  prefix={<DeploymentUnitOutlined style={{ color: 'rgba(0,0,0,0.45)' }} />}
                  placeholder="主机 IP 或访问地址" 
                  maxLength={100} 
                />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item 
                label="部署步骤" 
                name="deploy_steps"
                extra="简要描述部署流程，便于运维人员理解"
                style={{ marginBottom: 0 }}
              >
                <TextArea
                  rows={3}
                  placeholder="1. npm install&#10;2. npm run build&#10;3. docker build..."
                  maxLength={1000}
                  showCount
                />
              </Form.Item>
            </Col>
          </Row>
        </div>

        <div style={{ 
          marginBottom: 20, 
          padding: '20px 24px', 
          background: '#fffbe6', 
          border: '1px solid #ffe58f', 
          borderLeft: '4px solid #faad14',
          borderRadius: '8px' 
        }}>
          <Title level={5} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, marginTop: 0, color: '#874d00' }}>
            <GlobalOutlined />
            环境信息
          </Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item label="生产域名" name="prod_domain" style={{ marginBottom: 0 }}>
                <Input 
                  prefix={<GlobalOutlined style={{ color: 'rgba(0,0,0,0.45)' }} />}
                  placeholder="https://api.example.com" 
                  maxLength={100} 
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item label="UAT 域名" name="uat_domain" style={{ marginBottom: 0 }}>
                <Input 
                  prefix={<EnvironmentOutlined style={{ color: 'rgba(0,0,0,0.45)' }} />}
                  placeholder="https://uat-api.example.com" 
                  maxLength={100} 
                />
              </Form.Item>
            </Col>
          </Row>
        </div>

        <div style={{ 
          marginBottom: 20, 
          padding: '20px 24px', 
          background: '#f9f0ff', 
          border: '1px solid #d3adf7', 
          borderLeft: '4px solid #722ed1',
          borderRadius: '8px' 
        }}>
          <Title level={5} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, marginTop: 0, color: '#22075e' }}>
            <FileTextOutlined />
            其他信息
          </Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item label="资源备注" name="resource_remarks" style={{ marginBottom: 0 }}>
                <TextArea
                  rows={2}
                  placeholder="请输入资源备注信息"
                  maxLength={500}
                  showCount
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item label="特别说明" name="special_note" style={{ marginBottom: 0 }}>
                <TextArea
                  rows={2}
                  placeholder="如：需要特定的环境变量，或依赖外部服务"
                  maxLength={500}
                  showCount
                />
              </Form.Item>
            </Col>
          </Row>
        </div>

        <Divider />

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space size="middle">
            <Button onClick={() => navigate("/projects")} style={{ minWidth: 100 }}>
              取消
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              icon={<CloudUploadOutlined />}
              style={{ minWidth: 120 }}
            >
              {isEdit ? "更新资源" : "提交创建"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default ProjectResourceForm;
