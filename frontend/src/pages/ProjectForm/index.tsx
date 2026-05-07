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
  message,
} from "antd";
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

interface ProjectFormValues
  extends Omit<ProjectPayload, "project_leader_ids"> {
  project_leader_ids?: number[];
}

const ProjectForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [form] = Form.useForm<ProjectFormValues>();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const isEdit = Boolean(id);

  useEffect(() => {
    void fetchMembers();
    if (isEdit) {
      void fetchProjectData();
    }
  }, [id, isEdit]);

  const fetchMembers = async () => {
    try {
      const items = await getAllMembers();
      setMembers(items);
    } catch (error) {
      console.error("Failed to fetch members:", error);
      message.error("获取成员列表失败");
    }
  };

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

  const handleSubmit = async (values: ProjectFormValues) => {
    setSubmitting(true);
    try {
      const payload: ProjectPayload = {
        ...values,
        project_leader_ids: values.project_leader_ids ?? [],
      };

      if (isEdit && id) {
        await updateProject(Number(id), payload);
        message.success("项目已更新");
      } else {
        await createProject(payload);
        message.success("项目已创建");
      }
      navigate("/projects");
    } catch (error) {
      message.error(isEdit ? "更新项目失败" : "创建项目失败");
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
      title={isEdit ? "编辑项目" : "创建项目"}
      bordered={false}
      extra={<Button onClick={() => navigate("/projects")}>返回</Button>}
    >
      <Form<ProjectFormValues>
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
        size="middle"
      >
        <Row gutter={24}>
          <Col span={24}>
            <Form.Item
              label="项目名称"
              name="project_name"
              rules={[
                { required: true, message: "请输入项目名称" },
                { max: 100, message: "项目名称不能超过 100 个字符" },
              ]}
            >
              <Input placeholder="请输入项目名称" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label="项目类型"
              name="project_type"
              rules={[{ required: true, message: "请选择项目类型" }]}
            >
              <Select placeholder="请选择项目类型">
                {PROJECT_TYPE_OPTIONS.map((option) => (
                  <Select.Option key={option} value={option}>
                    {option}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label="项目状态"
              name="project_status"
              rules={[{ required: true, message: "请选择项目状态" }]}
            >
              <Select placeholder="请选择项目状态">
                {PROJECT_STATUS_OPTIONS.map((option) => (
                  <Select.Option key={option} value={option}>
                    {option}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col span={24}>
            <Form.Item label="项目描述" name="project_desc">
              <TextArea
                rows={4}
                placeholder="请输入项目描述"
                maxLength={500}
                showCount
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item label="技术栈" name="tech_framework">
              <Input placeholder="例如：React + FastAPI" maxLength={200} />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item label="项目负责人" name="project_leader_ids">
              <Select
                mode="multiple"
                placeholder="请选择项目负责人"
                maxTagCount="responsive"
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

          <Col span={8}>
            <Form.Item
              label="业务方"
              name="business_unit"
              rules={[{ required: true, message: "请选择业务方" }]}
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

          <Col span={8}>
            <Form.Item
              label="业务类型"
              name="business_type"
              rules={[{ required: true, message: "请选择业务类型" }]}
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

          <Col span={8}>
            <Form.Item
              label="所属系统"
              name="belong_system"
              rules={[{ required: true, message: "请输入所属系统" }]}
            >
              <Input placeholder="请输入所属系统" maxLength={50} />
            </Form.Item>
          </Col>

          <Col span={24}>
            <Form.Item label="备注" name="remarks">
              <TextArea
                rows={3}
                placeholder="请输入备注信息"
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
              {isEdit ? "更新项目" : "创建项目"}
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

export default ProjectForm;
