import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";

import { clearCacheStore } from "@/utils/cache";

// 基础 API 路径
const baseURL = "/api/v1";

// 创建 Axios 实例
const client = axios.create({
  baseURL,
  timeout: 10000, // 请求超时时间：10秒
});

/**
 * 请求拦截器
 * 逻辑：如果本地存有 token，则在所有请求头中自动添加 Authorization
 */
client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

/**
 * 响应拦截器
 * 逻辑：统一处理 401 (未授权) 错误，清除登录态并跳转至登录页
 */
client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      clearCacheStore();
      // 如果当前不在登录页，则强制跳转
      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    }
    return Promise.reject(error);
  },
);

/**
 * 封装后的通用请求工具
 * 简化了 Axios 的调用并直接返回 response.data
 */
const request = {
  get<T>(url: string, config?: AxiosRequestConfig) {
    return client.get<T>(url, config).then((response) => response.data);
  },
  post<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>) {
    return client.post<T>(url, data, config).then((response) => response.data);
  },
  put<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>) {
    return client.put<T>(url, data, config).then((response) => response.data);
  },
  delete<T>(url: string, config?: AxiosRequestConfig) {
    return client.delete<T>(url, config).then((response) => response.data);
  },
};

export default request;
