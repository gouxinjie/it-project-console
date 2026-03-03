import axios from "axios";

// 从环境变量加载基础 URL
// 使用相对路径，触发 vite.config.ts 中的代理(proxy)配置
const baseURL = "/api/v1";

const request = axios.create({
  baseURL,
  timeout: 10000
});

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default request;
