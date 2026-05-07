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
  message,
} from "antd";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { RESOURCE_TYPE_OPTIONS } from "@/constants/project";
import { getMembers } from "@/services/member";
import {
  createProjectResource,
  getProjectResource,
  getProjectResources,
  updateProjectResource,
} from "@/services/project";
import type { Member } from "@/types/member";
import type { ProjectResourcePayload } from "@/types/project";

const { TextArea } = Input;

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
      const response = await getMembers({ skip: 0, limit: 1000 });
      setMembers(response.items);
    } catch (error) {
      console.error("Failed to fetch members:", error);
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
      title={isEdit ? "编辑项目资源" : "新增项目资源"}
      bordered={false}
      extra={<Button onClick={() => navigate("/projects")}>返回</Button>}
    >
      <Form<ResourceFormValues>
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
        size="middle"
      >
        <Divider orientation="left">基本信息</Divider>
        <Row gutter={24}>
          <Col span={12}>
            <Form.Item
              label="资源类型"
              name="resource_type"
              rules={[{ required: true, message: "请选择资源类型" }]}
            >
              <Select
                placeholder="请选择资源类型"
                disabled={Boolean(forcedType) && !isEdit}
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

          <Col span={12}>
            <Form.Item
              label="Git 仓库"
              name="git_repo"
              rules={[{ required: true, message: "请输入 Git 仓库地址" }]}
            >
              <Input placeholder="请输入 Git 仓库地址" maxLength={200} />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label="技术栈"
              name="tech_framework"
              rules={[{ required: true, message: "请输入技术栈" }]}
            >
              <Input placeholder="例如：React 18 + TypeScript" maxLength={200} />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label="开发人员"
              name="developer_ids"
              rules={[{ required: true, message: "请选择开发人员" }]}
            >
              <Select
                mode="multiple"
                placeholder="请选择开发人员"
                allowClear
                showSearch
                optionFilterProp="label"
                options={members.map((member) => ({
                  label: member.member_name,
                  value: member.member_id,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">部署信息</Divider>
        <Row gutter={24}>
          <Col span={8}>
            <Form.Item label="部署方式" name="deploy_method">
              <Select placeholder="请选择部署方式" allowClear>
                <Select.Option value="Docker">Docker</Select.Option>
                <Select.Option value="K8s">K8s</Select.Option>
                <Select.Option value="Jenkins">Jenkins</Select.Option>
                <Select.Option value="云托管">云托管</Select.Option>
                <Select.Option value="手动部署">手动部署</Select.Option>
                <Select.Option value="其他">其他</Select.Option>
              </Select>
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item label="发布分支" name="deploy_branch">
              <Input placeholder="例如：main、develop、production" maxLength={50} />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item label="部署地址或主机 IP" name="deploy_addr">
              <Input placeholder="请输入部署地址或主机 IP" maxLength={100} />
            </Form.Item>
          </Col>

          <Col span={24}>
            <Form.Item label="部署步骤" name="deploy_steps">
              <TextArea
                rows={4}
                placeholder="请输入部署步骤，每行一个步骤"
                maxLength={1000}
                showCount
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">环境信息</Divider>
        <Row gutter={24}>
          <Col span={12}>
            <Form.Item label="生产域名" name="prod_domain">
              <Input placeholder="请输入生产域名" maxLength={100} />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item label="UAT 域名" name="uat_domain">
              <Input placeholder="请输入 UAT 域名" maxLength={100} />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">其他信息</Divider>
        <Row gutter={24}>
          <Col span={12}>
            <Form.Item label="资源备注" name="resource_remarks">
              <TextArea
                rows={3}
                placeholder="请输入资源备注"
                maxLength={500}
                showCount
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item label="特别说明" name="special_note">
              <TextArea
                rows={3}
                placeholder="请输入特别说明"
                maxLength={500}
                showCount
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item style={{ marginTop: 16 }}>
          <Space size="large">
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              style={{ width: 120 }}
            >
              {isEdit ? "更新资源" : "创建资源"}
            </Button>
            <Button onClick={() => navigate("/projects")} style={{ width: 120 }}>
              取消
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default ProjectResourceForm;
