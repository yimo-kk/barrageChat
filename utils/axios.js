import axios from "axios";
const baseUrl = 'https://server.nikidigital.net';
axios.defaults.baseURL = baseUrl;
axios.defaults.timeout = 50000;
axios.defaults.headers = {
  "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
};
// 添加请求拦截器
axios.interceptors.request.use(
  function (config) {
    // 在发送请求之前做些什
    return config;
  },
  function (error) {
    // 对请求错误做些什么
    return Promise.reject(error);
  }
);

// 添加响应拦截器
axios.interceptors.response.use(
  function (response) {
    return response;
  },
  function (error) {
    // 对响应错误做点什么
    return Promise.reject(error);
  }
);
export default axios;
