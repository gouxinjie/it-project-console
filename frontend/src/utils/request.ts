import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";

import { clearCacheStore } from "@/utils/cache";

const baseURL = "/api/v1";

const client = axios.create({
  baseURL,
  timeout: 10000,
});

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

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      clearCacheStore();
      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    }
    return Promise.reject(error);
  },
);

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
