import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  Modal,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
  type TableColumnsType,
} from "antd";
import {
  ExclamationCircleOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";

import { PROJECT_STATUS_COLORS } from "@/constants/project";
import {
  createMember,
  deleteMember,
  getMemberDetail,
  getMembers,
  updateMember,
} from "@/services/member";
import type {
  Member,
  MemberDetail,
  MemberDevelopedResourceSummary,
  MemberLeadProjectSummary,
  MemberPayload,
} from "@/types/member";

const { confirm } = Modal;
const { Text, Title } = Typography;
const { TextArea } = Input;

interface TablePaginationState {
  current: number;
  pageSize: number;
  total: number;
}

const EMPTY_COUNTS = {
  leadProjects: 0,
  developedResources: 0,
};

const MemberList: React.FC = () => {
  const navigate = useNavigate();
  const detailRequestIdRef = useRef(0);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberDetail, setMemberDetail] = useState<MemberDetail | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<Member[]>([]);
  const [searchText, setSearchText] = useState("");
  const [pagination, setPagination] = useState<TablePaginationState>({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [form] = Form.useForm<MemberPayload>();

  useEffect(() => {
    void fetchMemberList({ current: 1, pageSize: 10, total: 0 }, "");
  }, []);

  const detailCounts = useMemo(() => {
    if (!memberDetail) {
      return EMPTY_COUNTS;
    }
    return {
      leadProjects: memberDetail.lead_projects.length,
      developedResources: memberDetail.developed_resources.length,
    };
  }, [memberDetail]);

  const fetchMemberList = async (
    nextPagination: TablePaginationState = pagination,
    nextSearchText: string = searchText,
  ) => {
    setLoading(true);
    try {
      const response = await getMembers({
        skip: (nextPagination.current - 1) * nextPagination.pageSize,
        limit: nextPagination.pageSize,
        search: nextSearchText || undefined,
      });
      setDataSource(response.items);
      setPagination({
        current: nextPagination.current,
        pageSize: nextPagination.pageSize,
        total: response.total,
      });
    } catch (error) {
      message.error("获取成员列表失败");
    } finally {
      setLoading(false);
    }
  };

  const closeDetailModal = () => {
    detailRequestIdRef.current += 1;
    setIsDetailOpen(false);
    setMemberDetail(null);
    setSelectedMember(null);
    setDetailLoading(false);
  };

  const openDetailModal = async (member: Member) => {
    const requestId = detailRequestIdRef.current + 1;
    detailRequestIdRef.current = requestId;

    setSelectedMember(member);
    setMemberDetail(null);
    setIsDetailOpen(true);
    setDetailLoading(true);

    try {
      const response = await getMemberDetail(member.member_id);
      if (detailRequestIdRef.current !== requestId) {
        return;
      }
      setMemberDetail(response);
    } catch (error) {
      if (detailRequestIdRef.current === requestId) {
        message.error("获取成员关联信息失败");
      }
    } finally {
      if (detailRequestIdRef.current === requestId) {
        setDetailLoading(false);
      }
    }
  };

  const handleDelete = (member: Member) => {
    confirm({
      title: "确认删除成员",
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除成员「${member.member_name}」吗？`,
      okText: "确认删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          await deleteMember(member.member_id);
          message.success("成员已删除");
          if (selectedMember?.member_id === member.member_id) {
            closeDetailModal();
          }
          void fetchMemberList(pagination, searchText);
        } catch (error) {
          message.error("删除成员失败");
        }
      },
    });
  };

  const openEditModal = (member?: Member) => {
    setEditingMember(member ?? null);
    if (member) {
      form.setFieldsValue({
        member_name: member.member_name,
        position: member.position,
        tech_stack: member.tech_stack ?? undefined,
        phone: member.phone ?? undefined,
        email: member.email ?? undefined,
      });
    } else {
      form.resetFields();
    }
    setIsEditOpen(true);
  };

  const handleEditSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingMember) {
        await updateMember(editingMember.member_id, values);
        message.success("成员已更新");
        if (selectedMember?.member_id === editingMember.member_id) {
          void openDetailModal({ ...selectedMember, ...values });
        }
      } else {
        await createMember(values);
        message.success("成员已创建");
      }
      setIsEditOpen(false);
      void fetchMemberList(pagination, searchText);
    } catch (error) {
      const validationError = error as { errorFields?: unknown[] };
      if (validationError.errorFields) {
        return;
      }
      message.error("保存成员失败");
    }
  };

  const columns: TableColumnsType<Member> = [
    {
      title: "姓名",
      dataIndex: "member_name",
      key: "member_name",
      render: (text: string, record: Member) => (
        <Button type="link" onClick={() => void openDetailModal(record)}>
          {text}
        </Button>
      ),
    },
    {
      title: "岗位",
      dataIndex: "position",
      key: "position",
    },
    {
      title: "技术栈",
      dataIndex: "tech_stack",
      key: "tech_stack",
      ellipsis: true,
      render: (value: string | null) => value || "-",
    },
    {
      title: "联系电话",
      dataIndex: "phone",
      key: "phone",
      render: (value: string | null) =>
        value ? (
          <Text copyable={{ text: value }} style={{ color: "#475569" }}>
            {value}
          </Text>
        ) : (
          "-"
        ),
    },
    {
      title: "邮箱",
      dataIndex: "email",
      key: "email",
      render: (value: string | null) =>
        value ? (
          <Text copyable={{ text: value }} style={{ color: "#475569" }}>
            {value}
          </Text>
        ) : (
          "-"
        ),
    },
    {
      title: "操作",
      key: "action",
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" onClick={() => openEditModal(record)}>
            编辑
          </Button>
          <Button type="link" danger onClick={() => handleDelete(record)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const leadProjectColumns: TableColumnsType<MemberLeadProjectSummary> = [
    {
      title: "项目名称",
      dataIndex: "project_name",
      render: (text: string, record) => (
        <Button type="link" onClick={() => navigate(`/projects/${record.project_id}`)}>
          {text}
        </Button>
      ),
    },
    {
      title: "状态",
      dataIndex: "project_status",
      render: (value: string) => (
        <Tag color={PROJECT_STATUS_COLORS[value] || "blue"}>{value}</Tag>
      ),
    },
    {
      title: "类型",
      dataIndex: "project_type",
    },
    {
      title: "业务方",
      dataIndex: "business_unit",
    },
    {
      title: "更新时间",
      dataIndex: "update_time",
      render: (value: string) => dayjs(value).format("YYYY-MM-DD HH:mm"),
    },
  ];

  const developedResourceColumns: TableColumnsType<MemberDevelopedResourceSummary> = [
    {
      title: "项目",
      key: "project_name",
      render: (_, record) => {
        const project = record.project;
        return project ? (
          <Button type="link" onClick={() => navigate(`/projects/${project.project_id}`)}>
            {project.project_name}
          </Button>
        ) : (
          "-"
        );
      },
    },
    {
      title: "资源类型",
      dataIndex: "resource_type",
      render: (value: string) => (
        <Tag color={value === "前端" ? "blue" : "green"}>{value}</Tag>
      ),
    },
    {
      title: "技术栈",
      dataIndex: "tech_framework",
      render: (value: string | null) => value || "-",
    },
    {
      title: "分支",
      dataIndex: "deploy_branch",
      render: (value: string | null) => value || "-",
    },
    {
      title: "生产域名",
      dataIndex: "prod_domain",
      render: (value: string | null) => value || "-",
    },
    {
      title: "更新时间",
      dataIndex: "update_time",
      render: (value: string) => dayjs(value).format("YYYY-MM-DD HH:mm"),
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex gap-4">
          <Input
            prefix={<SearchOutlined />}
            placeholder="搜索成员姓名"
            className="w-64"
            style={{ borderRadius: 8 }}
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            onPressEnter={() =>
              void fetchMemberList({ ...pagination, current: 1 }, searchText)
            }
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={() =>
              void fetchMemberList({ ...pagination, current: 1 }, searchText)
            }
            style={{ background: "#1e293b", borderColor: "#1e293b", borderRadius: 8 }}
          >
            搜索项目成员
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openEditModal()}
            style={{ background: "#10b981", borderColor: "#10b981", borderRadius: 8 }}
          >
            新增成员
          </Button>
        </div>
      </Card>

      <Card>
        <Table<Member>
          rowKey="member_id"
          columns={columns}
          dataSource={dataSource}
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          onChange={(pager) => {
            void fetchMemberList(
              {
                current: pager.current ?? 1,
                pageSize: pager.pageSize ?? pagination.pageSize,
                total: pagination.total,
              },
              searchText,
            );
          }}
        />
      </Card>

      <Modal
        title={selectedMember ? `${selectedMember.member_name} 关联视图` : "成员详情"}
        open={isDetailOpen}
        onCancel={closeDetailModal}
        footer={null}
        width={1000}
        styles={{ body: { padding: "12px 20px 20px" } }}
      >
        <Spin spinning={detailLoading}>
          {selectedMember ? (
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <Row gutter={[12, 12]}>
                <Col span={12}>
                  <Card variant="borderless" styles={{ body: { padding: "12px 16px" } }} className="bg-slate-50">
                    <Statistic
                      title={<span style={{ fontSize: 13 }}>负责项目数</span>}
                      value={detailCounts.leadProjects}
                      valueStyle={{ fontSize: 20, fontWeight: 700, color: "#3b82f6" }}
                    />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card variant="borderless" styles={{ body: { padding: "12px 16px" } }} className="bg-slate-50">
                    <Statistic
                      title={<span style={{ fontSize: 13 }}>参与资源数</span>}
                      value={detailCounts.developedResources}
                      valueStyle={{ fontSize: 20, fontWeight: 700, color: "#10b981" }}
                    />
                  </Card>
                </Col>
              </Row>

              <Card variant="borderless" styles={{ body: { padding: 0 } }}>
                <Title level={5} style={{ marginBottom: 12, fontSize: 15 }}>成员信息</Title>
                <Descriptions bordered column={2} size="small">
                  <Descriptions.Item label="姓名">
                    {memberDetail?.member_name || selectedMember.member_name}
                  </Descriptions.Item>
                  <Descriptions.Item label="岗位">
                    {memberDetail?.position || selectedMember.position}
                  </Descriptions.Item>
                  <Descriptions.Item label="联系电话">
                    {memberDetail?.phone || selectedMember.phone || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="邮箱">
                    {memberDetail?.email || selectedMember.email || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="技术栈" span={2}>
                    <Text style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>
                      {memberDetail?.tech_stack || selectedMember.tech_stack || "-"}
                    </Text>
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              <Card variant="borderless" styles={{ body: { padding: 0 } }}>
                <Title level={5} style={{ marginBottom: 8, marginTop: 4, fontSize: 15 }}>负责项目</Title>
                <Table<MemberLeadProjectSummary>
                  rowKey="project_id"
                  size="small"
                  pagination={false}
                  dataSource={memberDetail?.lead_projects ?? []}
                  columns={leadProjectColumns}
                  locale={{ emptyText: "暂无负责项目" }}
                />
              </Card>

              <Card variant="borderless" styles={{ body: { padding: 0 } }}>
                <Title level={5} style={{ marginBottom: 8, marginTop: 4, fontSize: 15 }}>参与资源</Title>
                <Table<MemberDevelopedResourceSummary>
                  rowKey="resource_id"
                  size="small"
                  pagination={false}
                  dataSource={memberDetail?.developed_resources ?? []}
                  columns={developedResourceColumns}
                  locale={{ emptyText: "暂无参与资源" }}
                />
              </Card>
            </Space>
          ) : null}
        </Spin>
      </Modal>

      <Modal
        title={editingMember ? "编辑成员" : "新增成员"}
        open={isEditOpen}
        onOk={() => void handleEditSubmit()}
        onCancel={() => setIsEditOpen(false)}
        width={600}
      >
        <Form<MemberPayload> form={form} layout="vertical">
          <Form.Item
            label="姓名"
            name="member_name"
            rules={[{ required: true, message: "请输入成员姓名" }]}
          >
            <Input placeholder="请输入成员姓名" maxLength={50} />
          </Form.Item>
          <Form.Item
            label="岗位"
            name="position"
            rules={[{ required: true, message: "请输入岗位信息" }]}
          >
            <Input placeholder="请输入岗位信息" maxLength={100} />
          </Form.Item>
          <Form.Item label="联系电话" name="phone">
            <Input placeholder="请输入联系电话" maxLength={20} />
          </Form.Item>
          <Form.Item
            label="邮箱"
            name="email"
            rules={[{ type: "email", message: "请输入有效的邮箱地址" }]}
          >
            <Input placeholder="请输入邮箱地址" maxLength={100} />
          </Form.Item>
          <Form.Item label="技术栈" name="tech_stack">
            <TextArea rows={4} placeholder="请输入技术栈" maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MemberList;
