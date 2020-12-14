import { conversionFace, conversion, segmentation, rule } from './utils/libs.js'
import { userDecode, getUsersData, getGroupData } from './api/index.js'
// 初始化socket.this.$SocketIO
import io from './utils/socket.io.js'
let url = 'wss://server.nikidigital.net'
const socket = io(url, {
  transports: ['websocket'],
})
// 监听 socket 连接成功
socket.on('connect', () => {
  console.log('成功')
})
let userInfo = ''
let group_id = null
let group_code = ''
let userIp = null
let is_invite = null
// 收到群消息
socket.on('groupMsg', (data) => {
  //   if (this.username !== data.from4_name) {
  //     let num = this.$store.state.num
  //     this.$store.commit('setNum', ++num)
  //     this.$store.commit('setTitle', num)
  //     this.$store.commit('closeTitleScrolling')
  //     this.$store.dispatch('playPromptVuex')
  //     this.$store.commit('titleScrolling')
  //   }
  //   data.type === 3 && (data.message.play = false)
  data.type === 0 &&
    (data.message = conversionFace(data.message))
  createEle(`${data.nickname}： ${data.message}`);
  //   this.messages.push(data)
})

let btn = document.getElementById("barrageChatjs").getAttribute("button")
let input = document.getElementById("barrageChatjs").getAttribute("input")
let box = document.getElementById("barrageChatjs").getAttribute("box")
let code = document.getElementById("barrageChatjs").getAttribute("code")
decode(JSON.parse(code))
//1.获取元素
let oBox = document.getElementById(box)//获取.box元素
// 设置盒子的最小宽高
oBox.style.minWidth = '200px'
oBox.style.minHeight = '200px'
let oCon = document.getElementById(input)  //获取input框
let oBtn = document.getElementById(btn) //获取发送按钮
var cW = oBox.offsetWidth;   //获取box的宽度
var cH = oBox.offsetHeight;   //获取box的高度
oBox.style.position = 'relative'
var message = '';   //弹幕内容初始化
oBtn.onclick = send;   //点击发送
oCon.onkeydown = function (e) {
  e = e || window.event;
  if (e.keyCode === 13) {
    //回车键
    send();
  }
};
function send () {
  //获取oCon的内容
  if (oCon.value.length <= 0 || (/^\s+$/).test(oCon.value)) {
    alert('请输入发送内容！');
    return false;
  }
  message = oCon.value;
  //生成标签
  // createEle(message);   //执行节点创建模块
  let my_send = {
    cmd: 'user-group',
    message: oCon.value,
    from_id: userInfo.data.uid,
    from_name: userInfo.data.username,
    from_avatar: userInfo.data.headimg,
    group_id: group_id,
    seller_code: userInfo.seller.seller_code,
    state: 0,
    nickname: userInfo.data.nickname[group_code],
    type: 0,
    is_invite: is_invite,
    from_ip: userIp,
  }
  socket.emit('message', my_send)
  oCon.value = '';   //收尾工作清空输入框
}
function createEle (txt) {
  //动态生成span标签
  var oMessage = document.createElement('span');   //创建标签
  oMessage.className = 'elementItem'
  oMessage.innerHTML = txt;   //接收参数txt并且生成替换内容
  oMessage.style.left = cW + 'px';  //初始化生成位置x
  oBox.appendChild(oMessage);   //把标签塞到oBox里面
  roll.call(oMessage, {
    //call改变函数内部this的指向
    // timing: ['linear', 'ease-out'][~~(Math.random() * 2)],
    timing: 'linear',
    color: '#' + (~~(Math.random() * (1 << 24))).toString(16),
    top: random(20, cH - 20),
    // fontSize: random(16, 32)
    fontSize: 16,
    left: cW // offSetWidth 获取left 不准确
  });
}
function roll (opt) {
  //弹幕滚动
  //如果对象中不存在timing 初始化
  opt.timing = opt.timing || 'linear';
  opt.color = opt.color || '#fff';
  opt.top = opt.top || 0;
  opt.fontSize = opt.fontSize || 16;
  this._left = parseInt(opt.left);   //获取当前left的值并加上自身的width
  this.style.color = opt.color;   //初始化颜色
  this.style.top = opt.top + 'px';
  this.style.fontSize = opt.fontSize + 'px';
  this.style.position = 'absolute';
  this.timer = setInterval(function () {
    // 获取弹幕的自身长度
    if (this._left <= (-this.offsetWidth)) {
      clearInterval(this.timer);   //终止定时器
      this.parentNode.removeChild(this);
      return;   //终止函数
    }
    switch (opt.timing) {
      case 'linear':   //如果匀速
        this._left = this._left - 2;
        break;
      case 'ease-out':   //
        this._left += (0 - this._left) * .01;
        break;
    }
    this.style.left = this._left + 'px';
  }.bind(this), 1000 / 20);
}
function random (start, end) {
  //随机数封装
  return start + ~~(Math.random() * (end - start));
}
// 解密参数
async function decode (u) {
  let code = await userDecode(u)
  if (code.data.code === 0) {
    let paramsData = segmentation(code.data.data)
    group_code = u.code
    group_id = paramsData.group_id
    getUsersUserInfo(u.code, paramsData)
  }
}
// 获取用户信息
async function getUsersUserInfo (code, urlData) {
  let params = {
    username: urlData.username,
    is_tourist: urlData.username ? 2 : 0
  }
  if (code) {
    params.code = code
  }
  let data = await getUsersData(params)

  if (data.data.code === 0) {
    userInfo = data.data
    userIp = {
      ip: data.data.login_ip,
      address: data.data.area
    }
    userInfo.data = rule(data.data.data)
    console.log(userInfo)
    socket.emit('group', {
      username: userInfo.data.username,
      group_id: urlData.group_id,
      seller_code: userInfo.seller.seller_code,
      nickname: userInfo.data.nickname,
    })
    GroupIsPassword({
      group_id: urlData.group_id,
      seller_code: userInfo.seller.seller_code,
      username: userInfo.data.username
    })
  }
}
// 判断群是否需要密码进入
async function GroupIsPassword (userData) {
  let result = await getGroupData(userData)
  is_invite = result.data.group.is_invite
}