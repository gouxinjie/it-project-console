export const PROJECT_TYPE_OPTIONS = [
  "web应用",
  "钉钉微应用",
  "小程序",
  "低代码",
] as const;

export const PROJECT_STATUS_OPTIONS = [
  "待启动",
  "开发中",
  "已上线",
  "已下线",
] as const;

export const BUSINESS_UNIT_OPTIONS = [
  "集团总部",
  "董事办",
  "风控",
  "投管",
  "财务",
  "人力资源",
  "投融资",
] as const;

export const BUSINESS_TYPE_OPTIONS = [
  "运维",
  "运营",
  "新需求",
  "B端业务",
  "报表分析",
] as const;

export const RESOURCE_TYPE_OPTIONS = [
  "前端",
  "后端",
] as const;

export const PROJECT_STATUS_COLORS: Record<string, string> = {
  "待启动": "default",
  "开发中": "orange",
  "已上线": "green",
  "已下线": "default",
};
