import { conversionFace, segmentation, rule, createUserName } from './utils/libs.js'
import { userDecode, getUsersData, getGroupData, getGroupChatLog } from './api/index.js'
import './bundle.css'
// 初始化socket.this.$SocketIO
import io from './utils/socket.io.js'
let url = 'wss://server.nikidigital.net'
const socket = io(url, {
  transports: ['websocket'],
})
// 监听 socket 连接成功
socket.on('connect', () => {
  console.log('连接成功')
})


let userInfo = {}
let group_id = null
let group_code = ''
let userIp = null
let is_invite = null
let groupLog = []
/**
  * 设置 弹幕DOM池 每一个通道最多六条弹幕
  **/
const MAX_DM_COUNT = 6;
const CHANNEL_COUNT = 10;
let domPool = [];
let danmuPool = []; // 弹幕内容
let hasPosition = [];
// 收到群消息
socket.on('groupMsg', (data) => {
  if (data.error === -1) {
    popUp(data.message)
    return
  }
  data.type === 0 &&
    (data.message = conversionFace(data.message))
  viewContent(data)
  data.content = data.message
  danmuPool.push(data)
})
let btn = document.getElementById("barrageChatjs").getAttribute("button")
let input = document.getElementById("barrageChatjs").getAttribute("input")
let box = document.getElementById("barrageChatjs").getAttribute("box")
if (!btn) {
  throw new Error('Please pass in the button id, button attribute') // 请传入按钮id,button属性
}
if (!input) {
  throw new Error('Please input input box id, input attribute') // 请传入输入框id,input属性
}
if (!box) {
  throw new Error('Please input the display area id and box attributes') // 请传入展示区域id,box属性 
}
//1.获取元素
let oBox = document.getElementById(box)//获取.box元素
oBox.style.position = 'relative'
let oBoxWith = oBox.offsetWidth
// 设置盒子的最小宽高
oBox.style.minWidth = '200px'
oBox.style.minHeight = '200px'
oBox.style.overflow = 'hidden'

let oCon = document.getElementById(input)  //获取input框
let oBtn = document.getElementById(btn) //获取发送按钮
oBox.style.position = 'relative'
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
  if (!Object.keys(userInfo).length) { return }
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
// 解密参数
async function decode (u) {
  if (u == 'undefined') {
    throw new Error('Please input the merchant-related parameter code')
  } else {
    let param = JSON.parse(u)
    let code
    try {
      code = await userDecode(param)
    } catch (error) {
      throw new Error('解密错误！')
    }
    if (code.data.code === -1) {
      throw new Error(code.data.msg)
    } else if (code.data.code === 0) {
      let paramsData = segmentation(code.data.data)
      // 当解密没有name时创建一个随机name
      if (!paramsData.username) {
        paramsData.username = createUserName()
      }
      group_code = param.code
      group_id = paramsData.group_id
      getUsersUserInfo(param.code, paramsData)
    }
  }

}
// 获取用户信息
async function getUsersUserInfo (code, urlData) {
  let params = {
    username: urlData.username,
  }
  if (code) {
    params.code = code
    params.level = urlData.level ? urlData.level : 0
  }
  let data = await getUsersData(params)

  if (data.data.code === 0) {
    userInfo = data.data
    userIp = {
      ip: data.data.login_ip,
      address: data.data.area
    }
    userInfo.data = rule(data.data.data)
    socket.emit('group', {
      username: userInfo.data.username,
      headimg: userInfo.data.headimg,
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
  if (result.data.group.is_invite &&
    !result.data.users.isPassword) {
    // 需要输入密码，暂时不考虑
  } else {
    getChatLog()
  }

}
// 获取聊天记录
async function getChatLog () {
  let result = await getGroupChatLog(
    {
      page: 1,
      group_id: group_id,
      seller_code: userInfo.seller.seller_code,
      uid: userInfo.data.uid,
    }
  )
  if (result.data.code === 0) {
    groupLog = result.data.data
    danmuPool = groupLog.map((item) => {
      viewContent(item)
      item.nickname = item.from_name
      return item
    })
    init();
  }
}
// 根据信息不同type展示
function viewContent (param) {
  switch (param.type) {
    case 1:
      param.content = '[图片]'
      break;
    case 2:
      param.content = '[文件]'
      break;
    case 3:
      param.content = '[语音]'
      break;
    default:
      break;
  }
}

/**
 * 做一下初始化工作
 */
function init () {
  // 先new一些span 重复利用这些DOM
  for (let j = 0; j < CHANNEL_COUNT; j++) {
    let doms = [];
    for (let i = 0; i < MAX_DM_COUNT; i++) {
      // 要全部放进oBox
      let dom = document.createElement('p');
      oBox.appendChild(dom);
      // 初始化dom的位置 通过设置className
      dom.className = 'right';
      dom.style.transform = `translateX(${oBoxWith}px)`;
      // DOM的通道是固定的 所以设置好top就不需要再改变了
      dom.style.top = j * 20 + 'px';
      // 放入改通道的DOM池
      doms.push(dom);
      // 每次到transition结束的时候 就是弹幕划出屏幕了 将DOM位置重置 再放回DOM池
      dom.addEventListener('transitionend', () => {
        dom.className = 'right';
        dom.style.transform = null;
        dom.style.transform = `translateX(${oBoxWith}px)`;
        domPool[j].push(dom);
      });
    }
    domPool.push(doms);
  }
  // hasPosition 标记每个通道目前是否有位置
  for (let i = 0; i < CHANNEL_COUNT; i++) {
    hasPosition[i] = true;
  }
}
/**
 * 获取一个可以发射弹幕的通道 没有则返回-1
 */
function getChannel () {
  for (let i = 0; i < CHANNEL_COUNT; i++) {
    if (hasPosition[i] && domPool[i].length) return i;
  }
  return -1;
}
/**
 * 根据DOM和弹幕信息 发射弹幕
 */
function shootDanmu (dom, text, channel) {
  dom.innerHTML = text;
  // 设置弹幕的位置信息 性能优化 transform
  dom.style.transform = `translateX(${-dom.clientWidth}px)`;
  dom.style.color = '#' + (~~(Math.random() * (1 << 24))).toString(16),
    dom.className = 'left';
  hasPosition[channel] = false;
  // 弹幕全部显示之后 才能开始下一条弹幕
  // 大概 dom.clientWidth * 10 的时间 该条弹幕就从右边全部划出到可见区域 再加1秒保证弹幕之间距离
  setTimeout(() => {
    hasPosition[channel] = true;
  }, dom.clientWidth * 10 + 1000);
}

window.onload = function () {
  // 每隔1ms从弹幕池里获取弹幕（如果有的话）并发射
  setInterval(() => {
    let channel;
    if (danmuPool.length && (channel = getChannel()) != -1) {
      let dom = domPool[channel].shift();
      let danmu = danmuPool.shift();
      shootDanmu(dom, `${danmu.nickname}:${conversionFace(danmu.content)}`, channel);
    }
  }, 1000);
  // 页面渲染完之后调用
  let code = document.getElementById("barrageChatjs").getAttribute("code")
  decode(code)
}
// 提示框 
function popUp (txt) {
  let messageDom = document.createElement('p');
  messageDom.setAttribute('id', 'messageDom')
  messageDom.style.position = 'absolute'
  messageDom.style.top = '50%'
  messageDom.style.left = '50%'
  messageDom.style.transform = 'translate(-50%, -50%)'
  messageDom.style.background = 'rgba(0,0,0,.3)'
  messageDom.style.borderRadius = '5px'
  messageDom.style.padding = '10px'
  messageDom.style.color = ' #fff'
  messageDom.innerText = txt
  oBox.appendChild(messageDom);
  var idObject = document.getElementById('messageDom');
  if (idObject != null)
    setTimeout(() => {
      idObject.parentNode.removeChild(idObject);
    }, 2000);
}


