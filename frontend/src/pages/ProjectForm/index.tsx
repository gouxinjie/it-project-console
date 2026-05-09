import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Select,
  Space,
  Spin,
  Tooltip,
  message,
  Typography,
  Divider,
} from "antd";
import {
  InfoCircleOutlined,
  ProjectOutlined,
  UserOutlined,
  CodeOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  BuildOutlined,
  ArrowLeftOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";

import {
  BUSINESS_TYPE_OPTIONS,
  BUSINESS_UNIT_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  PROJECT_TYPE_OPTIONS,
} from "@/constants/project";
import { getAllMembers } from "@/services/member";
import { createProject, getProject, updateProject } from "@/services/project";
import type { Member } from "@/types/member";
import type { ProjectPayload } from "@/types/project";

const { TextArea } = Input;
const { Title, Text } = Typography;

// 表单提交的数据类型定义
interface ProjectFormValues
  extends Omit<ProjectPayload, "project_leader_ids"> {
  project_leader_ids?: number[];
}

/**
 * 项目表单页面组件
 * 用于创建新项目或编辑现有项目的基础信息
 */
const ProjectForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>(); // URL 中是否有 ID 决定了是“创建”还是“编辑”模式
  const [form] = Form.useForm<ProjectFormValues>();
  const [loading, setLoading] = useState(false); // 数据加载状态
  const [submitting, setSubmitting] = useState(false); // 表单提交状态
  const [members, setMembers] = useState<Member[]>([]); // 可选的项目负责人列表
  const isEdit = Boolean(id);

  // 初始化：获取成员列表；若是编辑模式，还需拉取项目详情
  useEffect(() => {
    void fetchMembers();
    if (isEdit) {
      void fetchProjectData();
    }
  }, [id, isEdit]);

  /**
   * 获取所有成员，供 Select 选择器使用
   */
  const fetchMembers = async () => {
    try {
      const items = await getAllMembers();
      setMembers(items);
    } catch (error) {
      console.error("Failed to fetch members:", error);
      message.error("获取成员列表失败");
    }
  };

  /**
   * 编辑模式下，获取待修改的项目原始数据并填充表单
   */
  const fetchProjectData = async () => {
    if (!id) {
      return;
    }

    setLoading(true);
    try {
      const data = await getProject(Number(id));
      form.setFieldsValue({
        ...data,
        project_leader_ids: data.project_leader_ids,
      });
    } catch (error) {
      message.error("获取项目详情失败");
      navigate("/projects");
    } finally {
      setLoading(false);
    }
  };

  /**
   * 提交表单
   * 逻辑：根据 isEdit 调用创建或更新 API
   */
  const handleSubmit = async (values: ProjectFormValues) => {
    setSubmitting(true);
    try {
      const payload: ProjectPayload = {
        ...values,
        project_leader_ids: values.project_leader_ids || [],
      };

      if (isEdit) {
        await updateProject(Number(id), payload);
        message.success("项目更新成功");
      } else {
        await createProject(payload);
        message.success("项目创建成功");
      }
      navigate("/projects"); // 成功后返回列表页
    } catch (error) {
      message.error(isEdit ? "项目更新失败" : "项目创建失败");
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
            {isEdit ? "编辑项目" : "创建项目"}
          </Title>
        </Space>
      }
      variant="borderless"
      style={{ boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)" }}
    >
      <Form<ProjectFormValues>
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
            <ProjectOutlined />
            基本信息
          </Title>
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Form.Item
                label="项目名称"
                name="project_name"
                rules={[
                  { required: true, message: "请输入项目名称" },
                  { max: 100, message: "项目名称不能超过 100 个字符" },
                ]}
                style={{ marginBottom: 0 }}
              >
                <Input 
                  prefix={<ProjectOutlined style={{ color: 'rgba(0,0,0,0.45)' }} />}
                  placeholder="请输入项目名称" 
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                label="项目类型"
                name="project_type"
                rules={[{ required: true, message: "请选择项目类型" }]}
                style={{ marginBottom: 0 }}
              >
                <Select 
                  placeholder="请选择项目类型"
                  suffixIcon={<AppstoreOutlined />}
                >
                  {PROJECT_TYPE_OPTIONS.map((option) => (
                    <Select.Option key={option} value={option}>
                      {option}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                label="项目状态"
                name="project_status"
                rules={[{ required: true, message: "请选择项目状态" }]}
                style={{ marginBottom: 0 }}
              >
                <Select 
                  placeholder="请选择项目状态"
                  suffixIcon={<CheckCircleOutlined />}
                >
                  {PROJECT_STATUS_OPTIONS.map((option) => (
                    <Select.Option key={option} value={option}>
                      {option}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item label="项目描述" name="project_desc" style={{ marginBottom: 0 }}>
                <TextArea
                  rows={3}
                  placeholder="请输入项目的背景、目标和主要功能描述"
                  maxLength={500}
                  showCount
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
            <TeamOutlined />
            团队与技术
          </Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item label="技术栈" name="tech_framework" style={{ marginBottom: 0 }}>
                <Input 
                  prefix={<CodeOutlined style={{ color: 'rgba(0,0,0,0.45)' }} />}
                  placeholder="例如：React + FastAPI" 
                  maxLength={200} 
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item label="项目负责人" name="project_leader_ids" style={{ marginBottom: 0 }}>
                <Select
                  mode="multiple"
                  placeholder="请选择项目负责人"
                  maxTagCount="responsive"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  suffixIcon={<TeamOutlined />}
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
          background: '#fffbe6', 
          border: '1px solid #ffe58f', 
          borderLeft: '4px solid #faad14',
          borderRadius: '8px' 
        }}>
          <Title level={5} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, marginTop: 0, color: '#874d00' }}>
            <AppstoreOutlined />
            业务归属
          </Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Form.Item
                label="业务方"
                name="business_unit"
                rules={[{ required: true, message: "请选择业务方" }]}
                style={{ marginBottom: 0 }}
              >
                <Select placeholder="请选择业务方">
                  {BUSINESS_UNIT_OPTIONS.map((option) => (
                    <Select.Option key={option} value={option}>
                      {option}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} sm={8}>
              <Form.Item
                label="业务类型"
                name="business_type"
                rules={[{ required: true, message: "请选择业务类型" }]}
                style={{ marginBottom: 0 }}
              >
                <Select placeholder="请选择业务类型">
                  {BUSINESS_TYPE_OPTIONS.map((option) => (
                    <Select.Option key={option} value={option}>
                      {option}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} sm={8}>
              <Form.Item
                label="所属系统"
                name="belong_system"
                rules={[{ required: true, message: "请输入所属系统" }]}
                style={{ marginBottom: 0 }}
              >
                <Input 
                  prefix={<BuildOutlined style={{ color: 'rgba(0,0,0,0.45)' }} />}
                  placeholder="请输入所属系统" 
                  maxLength={50} 
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
            <InfoCircleOutlined />
            辅助信息
          </Title>
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Form.Item label="备注" name="remarks" style={{ marginBottom: 0 }}>
                <TextArea
                  rows={2}
                  placeholder="请输入备注信息，如项目背景、特殊要求等"
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
              icon={<SaveOutlined />}
              style={{ minWidth: 120 }}
            >
              {isEdit ? "更新项目" : "立即创建"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default ProjectForm;
