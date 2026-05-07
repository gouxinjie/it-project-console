import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Modal,
  Space,
  Table,
  message,
  type TableColumnsType,
} from "antd";
import {
  ExclamationCircleOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";

import {
  createMember,
  deleteMember,
  getMembers,
  updateMember,
} from "@/services/member";
import type { Member, MemberPayload } from "@/types/member";

const { confirm } = Modal;
const { TextArea } = Input;

interface TablePaginationState {
  current: number;
  pageSize: number;
  total: number;
}

const MemberList: React.FC = () => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
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
      } else {
        await createMember(values);
        message.success("成员已创建");
      }
      setIsEditOpen(false);
      void fetchMemberList(pagination, searchText);
    } catch (error) {
      message.error("保存成员失败");
    }
  };

  const columns: TableColumnsType<Member> = [
    {
      title: "姓名",
      dataIndex: "member_name",
      key: "member_name",
      render: (text: string, record: Member) => (
        <Button
          type="link"
          onClick={() => {
            setSelectedMember(record);
            setIsDetailOpen(true);
          }}
        >
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
      render: (value: string | null) => value || "-",
    },
    {
      title: "邮箱",
      dataIndex: "email",
      key: "email",
      render: (value: string | null) => value || "-",
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

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex gap-4">
          <Input
            prefix={<SearchOutlined />}
            placeholder="搜索成员姓名"
            className="w-64"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            onPressEnter={() =>
              void fetchMemberList({ ...pagination, current: 1 }, searchText)
            }
          />
          <Button
            type="primary"
            onClick={() =>
              void fetchMemberList({ ...pagination, current: 1 }, searchText)
            }
          >
            搜索
          </Button>
          <Button icon={<PlusOutlined />} onClick={() => openEditModal()}>
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
        title="成员详情"
        open={isDetailOpen}
        onCancel={() => setIsDetailOpen(false)}
        footer={null}
        width={700}
      >
        {selectedMember && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="姓名">
              {selectedMember.member_name}
            </Descriptions.Item>
            <Descriptions.Item label="岗位">
              {selectedMember.position}
            </Descriptions.Item>
            <Descriptions.Item label="联系电话">
              {selectedMember.phone || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="邮箱">
              {selectedMember.email || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="技术栈">
              <div className="bg-gray-50 p-2 rounded">
                {selectedMember.tech_stack || "-"}
              </div>
            </Descriptions.Item>
          </Descriptions>
        )}
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
