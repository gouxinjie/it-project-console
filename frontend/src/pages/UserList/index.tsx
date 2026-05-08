import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  message,
  type TableColumnsType,
} from "antd";
import {
  ExclamationCircleOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { useAuth } from "@/contexts/AuthContext";
import {
  createUser,
  deleteUser,
  getUsers,
  resetUserPassword,
  updateUser,
} from "@/services/user";
import type {
  User,
  UserCreatePayload,
  UserPasswordResetPayload,
  UserUpdatePayload,
} from "@/types/user";

const { confirm } = Modal;

const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]+$/;

interface TablePaginationState {
  current: number;
  pageSize: number;
  total: number;
}

interface UserEditorFormValues {
  username?: string;
  email: string;
  password?: string;
  confirm_password?: string;
  is_active: boolean;
  is_superuser: boolean;
}

interface PasswordResetFormValues {
  new_password: string;
  confirm_password: string;
}

type StatusFilter = "all" | "active" | "inactive";

function formatDateTime(value: string | null): string {
  if (!value) {
    return "未记录";
  }
  return dayjs(value).format("YYYY-MM-DD HH:mm");
}

const UserList: React.FC = () => {
  const { currentUser, refreshCurrentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<User[]>([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [pagination, setPagination] = useState<TablePaginationState>({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [editorForm] = Form.useForm<UserEditorFormValues>();
  const [passwordForm] = Form.useForm<PasswordResetFormValues>();

  const fetchUserList = async (
    nextPagination: TablePaginationState = pagination,
    nextSearchText: string = searchText,
    nextStatusFilter: StatusFilter = statusFilter,
  ) => {
    setLoading(true);
    try {
      const response = await getUsers({
        skip: (nextPagination.current - 1) * nextPagination.pageSize,
        limit: nextPagination.pageSize,
        search: nextSearchText || undefined,
        is_active:
          nextStatusFilter === "all"
            ? undefined
            : nextStatusFilter === "active",
      });
      setDataSource(response.items);
      setPagination({
        current: nextPagination.current,
        pageSize: nextPagination.pageSize,
        total: response.total,
      });
    } catch (error) {
      message.error("获取账号列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUserList({ current: 1, pageSize: 10, total: 0 }, "", "all");
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    editorForm.setFieldsValue({
      username: "",
      email: "",
      password: "",
      confirm_password: "",
      is_active: true,
      is_superuser: false,
    });
    setIsEditorOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    editorForm.setFieldsValue({
      username: user.username,
      email: user.email,
      password: undefined,
      confirm_password: undefined,
      is_active: user.is_active,
      is_superuser: user.is_superuser,
    });
    setIsEditorOpen(true);
  };

  const handleEditorSubmit = async () => {
    try {
      const values = await editorForm.validateFields();
      setSubmitting(true);

      if (editingUser) {
        const payload: UserUpdatePayload = {
          email: values.email,
          is_active: values.is_active,
          is_superuser: values.is_superuser,
        };
        await updateUser(editingUser.id, payload);
        if (editingUser.id === currentUser?.id) {
          await refreshCurrentUser();
        }
        message.success("账号已更新");
      } else {
        const payload: UserCreatePayload = {
          username: values.username?.trim() ?? "",
          email: values.email.trim(),
          password: values.password ?? "",
          is_active: values.is_active,
          is_superuser: values.is_superuser,
        };
        await createUser(payload);
        message.success("账号已创建");
      }

      setIsEditorOpen(false);
      editorForm.resetFields();
      void fetchUserList(pagination, searchText, statusFilter);
    } catch (error) {
      const formError = error as { errorFields?: unknown[]; response?: { data?: { detail?: string } } };
      if (formError.errorFields) {
        return;
      }
      message.error(formError.response?.data?.detail || "保存账号失败");
    } finally {
      setSubmitting(false);
    }
  };

  const openPasswordResetModal = (user: User) => {
    setPasswordTarget(user);
    passwordForm.resetFields();
    setIsPasswordResetOpen(true);
  };

  const handlePasswordReset = async () => {
    if (!passwordTarget) {
      return;
    }

    try {
      const values = await passwordForm.validateFields();
      setPasswordSubmitting(true);
      const payload: UserPasswordResetPayload = {
        new_password: values.new_password,
      };
      await resetUserPassword(passwordTarget.id, payload);
      message.success(`已重置账号 ${passwordTarget.username} 的密码`);
      setIsPasswordResetOpen(false);
      passwordForm.resetFields();
    } catch (error) {
      const formError = error as { errorFields?: unknown[]; response?: { data?: { detail?: string } } };
      if (formError.errorFields) {
        return;
      }
      message.error(formError.response?.data?.detail || "重置密码失败");
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const handleDelete = (user: User) => {
    confirm({
      title: "确认删除账号",
      icon: <ExclamationCircleOutlined />,
      content: `确定删除账号“${user.username}”吗？该操作不可恢复。`,
      okText: "确认删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          await deleteUser(user.id);
          message.success("账号已删除");
          void fetchUserList(pagination, searchText, statusFilter);
        } catch (error) {
          const requestError = error as { response?: { data?: { detail?: string } } };
          message.error(requestError.response?.data?.detail || "删除账号失败");
        }
      },
    });
  };

  const handleTableChange = (page: { current?: number; pageSize?: number }) => {
    const nextPagination = {
      current: page.current ?? pagination.current,
      pageSize: page.pageSize ?? pagination.pageSize,
      total: pagination.total,
    };
    void fetchUserList(nextPagination, searchText, statusFilter);
  };

  const handleSearch = (value?: string) => {
    const nextSearchText = value ?? searchText;
    const nextPagination = { ...pagination, current: 1 };
    setSearchText(nextSearchText);
    void fetchUserList(nextPagination, nextSearchText, statusFilter);
  };

  const handleStatusFilterChange = (value: StatusFilter) => {
    const nextPagination = { ...pagination, current: 1 };
    setStatusFilter(value);
    void fetchUserList(nextPagination, searchText, value);
  };

  const isEditingSelf = editingUser?.id === currentUser?.id;

  const columns: TableColumnsType<User> = [
    {
      title: "用户名",
      dataIndex: "username",
      key: "username",
      width: 180,
    },
    {
      title: "邮箱",
      dataIndex: "email",
      key: "email",
      ellipsis: true,
    },
    {
      title: "角色",
      key: "role",
      width: 120,
      render: (_, record) => (
        <Tag color={record.is_superuser ? "gold" : "blue"}>
          {record.is_superuser ? "管理员" : "普通用户"}
        </Tag>
      ),
    },
    {
      title: "状态",
      key: "status",
      width: 120,
      render: (_, record) => (
        <Tag color={record.is_active ? "green" : "default"}>
          {record.is_active ? "启用" : "停用"}
        </Tag>
      ),
    },
    {
      title: "创建时间",
      dataIndex: "create_time",
      key: "create_time",
      width: 180,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: "最近登录",
      dataIndex: "last_login",
      key: "last_login",
      width: 180,
      render: (value: string | null) => formatDateTime(value),
    },
    {
      title: "操作",
      key: "actions",
      width: 240,
      render: (_, record) => {
        const isSelf = record.id === currentUser?.id;

        return (
          <Space><Button type="link" onClick={() => openEditModal(record)}>编辑</Button><Tooltip title={isSelf ? "请使用右上角的个人改密入口" : ""}><Button type="link" disabled={isSelf} onClick={() => openPasswordResetModal(record)}>重置密码</Button></Tooltip><Tooltip title={isSelf ? "不能删除当前登录账号" : ""}><Button type="link" danger disabled={isSelf} onClick={() => handleDelete(record)}>删除</Button></Tooltip></Space>
        );
      },
    },
  ];

  return (
    <>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Alert
          type="info"
          showIcon
          message="管理员可在此创建账号、调整角色状态，并为其他用户重置密码。当前管理员账号已预填在登录页。"
        />

        <Card
          title="账号管理"
          extra={(
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
              新建账号
            </Button>
          )}
        >
          <Space style={{ width: "100%", marginBottom: 16, justifyContent: "space-between" }} wrap>
            <Input.Search
              allowClear
              enterButton={<SearchOutlined />}
              placeholder="按用户名或邮箱搜索"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onSearch={handleSearch}
              style={{ maxWidth: 360 }}
            />
            <Select<StatusFilter>
              value={statusFilter}
              onChange={handleStatusFilterChange}
              style={{ width: 160 }}
              options={[
                { label: "全部状态", value: "all" },
                { label: "仅启用", value: "active" },
                { label: "仅停用", value: "inactive" },
              ]}
            />
          </Space>

          <Table<User>
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={dataSource}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
            onChange={handleTableChange}
            scroll={{ x: 1180 }}
          />
        </Card>
      </Space>

      <Modal
        title={editingUser ? `编辑账号：${editingUser.username}` : "新建账号"}
        open={isEditorOpen}
        onOk={handleEditorSubmit}
        okText={editingUser ? "保存" : "创建"}
        cancelText="取消"
        confirmLoading={submitting}
        onCancel={() => {
          setIsEditorOpen(false);
          editorForm.resetFields();
        }}
        destroyOnClose
      >
        <Form form={editorForm} layout="vertical" requiredMark={false}>
          <Form.Item
            label="用户名"
            name="username"
            rules={[
              { required: true, message: "请输入用户名" },
              { min: 3, message: "用户名至少 3 位" },
            ]}
          >
            <Input placeholder="请输入用户名" disabled={Boolean(editingUser)} />
          </Form.Item>

          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { required: true, message: "请输入邮箱" },
              { type: "email", message: "请输入有效的邮箱地址" },
            ]}
          >
            <Input placeholder="请输入邮箱地址" />
          </Form.Item>

          {!editingUser ? (
            <>
              <Form.Item
                label="初始密码"
                name="password"
                rules={[
                  { required: true, message: "请输入初始密码" },
                  { min: 6, message: "密码至少 6 位" },
                  {
                    pattern: passwordPattern,
                    message: "密码需包含字母和数字，且仅支持字母数字",
                  },
                ]}
                extra="密码需至少 6 位，并包含字母和数字，且仅支持字母数字。"
              >
                <Input.Password placeholder="请输入初始密码" />
              </Form.Item>

              <Form.Item
                label="确认初始密码"
                name="confirm_password"
                dependencies={["password"]}
                rules={[
                  { required: true, message: "请再次输入初始密码" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("password") === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error("两次输入的密码不一致"));
                    },
                  }),
                ]}
              >
                <Input.Password placeholder="请再次输入初始密码" />
              </Form.Item>
            </>
          ) : null}

          <Form.Item label="账号启用" name="is_active" valuePropName="checked">
            <Switch disabled={isEditingSelf} />
          </Form.Item>

          <Form.Item
            label="管理员权限"
            name="is_superuser"
            valuePropName="checked"
            extra={isEditingSelf ? "当前登录管理员不能在此修改自己的角色和状态。" : undefined}
          >
            <Switch disabled={isEditingSelf} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={passwordTarget ? `重置密码：${passwordTarget.username}` : "重置密码"}
        open={isPasswordResetOpen}
        onOk={handlePasswordReset}
        okText="重置"
        cancelText="取消"
        confirmLoading={passwordSubmitting}
        onCancel={() => {
          setIsPasswordResetOpen(false);
          passwordForm.resetFields();
        }}
        destroyOnClose
      >
        <Form form={passwordForm} layout="vertical" requiredMark={false}>
          <Form.Item
            label="新密码"
            name="new_password"
            rules={[
              { required: true, message: "请输入新密码" },
              { min: 6, message: "密码至少 6 位" },
              {
                pattern: passwordPattern,
                message: "密码需包含字母和数字，且仅支持字母数字",
              },
            ]}
            extra="密码需至少 6 位，并包含字母和数字，且仅支持字母数字。"
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>

          <Form.Item
            label="确认新密码"
            name="confirm_password"
            dependencies={["new_password"]}
            rules={[
              { required: true, message: "请再次输入新密码" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("new_password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("两次输入的密码不一致"));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default UserList;
