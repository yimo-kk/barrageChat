import Axios from "../utils/axios";
import qs from "qs";
/**
 * 获取参数进行解密
 * @param {*} params
 */
export function userDecode (params) {
  console.log(params)
  return Axios({
    url: `/chat/userDecode`,
    method: "post",
    data: qs.stringify(params)
  });
}
/**
 * 获取用户信息
 * @param {*} params
 */
export function getUsersData (params) {
  return Axios({
    url: "/users/getUsersData",
    method: "get",
    params: params
  });
}
/**
 * 校验是否需要密码进入
 * @params {*}params
 */
export function getGroupData (params) {
  return Axios({
    url: '/chat/getGroupData',
    method: 'post',
    data: qs.stringify(params)
  })
}
