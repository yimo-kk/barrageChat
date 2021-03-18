import { conversionFace, segmentation, rule, createUserName, isIE, overturn } from './utils/libs.js'
import { userDecode, getUsersData, getGroupData, getGroupChatLog, uploadVoice } from './api/index.js'
import './bundle.css'
// 初始化socket.this.$SocketIO
import io from './utils/socket.io.js'
import Recorder from "js-audio-recorder";
let recorder
if (!isIE()) {
  recorder = new Recorder({
    sampleBits: 16, // 采样位数，支持 8 或 16，默认是16
    sampleRate: 24000, // 采样率，支持 11025、16000、22050、24000、44100、48000，根据浏览器默认值，我的chrome是48000
    numChannels: 1 // 声道，支持 1 或 2， 默认是1e
  });
}
let url = 'wss://server.nikidigital.net'
const socket = io(url, {
  transports: ['websocket'],
})
// 监听 socket 连接成功
socket.on('connect', () => {
  console.log('连接成功')
})

let autoAudioM = false
let userInfo = {}
let group_id = null
let group_code = ''
let userIp = null
let is_invite = null
let groupLog = []
let chat_bullet = 1
/**
  * 设置 弹幕DOM池 每一个通道最多六条弹幕
  **/
let MAX_DM_COUNT = 6;
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
  data.type === 3 &&
    (data.message = data.message.src)
  viewContent(data)
  data.content = data.message
  danmuPool.push(data)
})
let btn = document.getElementById("barrageChatjs").getAttribute("sendBtn")
let input = document.getElementById("barrageChatjs").getAttribute("sendInput")
let box = document.getElementById("barrageChatjs").getAttribute("barrageChat")
let recordButton = document.getElementById("barrageChatjs").getAttribute("recordButton") // 录音按钮
let direction = document.getElementById("barrageChatjs").getAttribute("scollView") || 'rightToLeft' //默认右到左
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
let oBoxWidth = oBox.offsetWidth
let oBoxHeight = oBox.offsetHeight
// 设置盒子的最小宽高
oBox.style.minWidth = '200px'
oBox.style.minHeight = '200px'
oBox.style.overflow = 'hidden'
let oCon = document.getElementById(input)  //获取input框
let oBtn = document.getElementById(btn) //获取发送按钮
let oRecord = document.getElementById(recordButton) //获取发送按钮
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
  if (!chat_bullet) {
    popUp('当前群不允许开启该模式，请联系商家管理员！')
    return
  }
  //获取oCon的内容
  if (oCon.value.length <= 0 || (/^\s+$/).test(oCon.value)) {
    alert('请输入发送内容！');
    return false;
  }
  if (!Object.keys(userInfo).length) return
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
    from_ip: userIp.ip || '',
  }
  socket.emit('message', my_send)
  oCon.value = '';   //收尾工作清空输入框
}
// 获取点击录音按钮 录音
oRecord.addEventListener('click', () => {
  recordPopup()
})
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
  chat_bullet = result.data.group.chat_bullet
  if (result.data.group.chat_bullet === 0) {
    popUp('当前群不允许开启该模式，请联系商家管理员！')
    return
  }
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
    // case 3:
    //   param.content = '[语音]'
    //   break;
    default:
      break;
  }
}
/**
 * 做一下初始化工作  左右弹幕方式
 */
function init () {
  // 先new一些span 重复利用这些DOM
  for (let j = 0; j < CHANNEL_COUNT; j++) {
    let doms = [];
    for (let i = 0; i < MAX_DM_COUNT; i++) {
      // direction  初始化时判断弹幕方向
      // 要全部放进oBox
      let dom = document.createElement('div');
      oBox.appendChild(dom);
      // 初始化dom的位置 通过设置className
      dom.className = 'right';
      // endPosition 根据方向传入的结束位置
      dom.style.transform = barrageDirection(direction, getEndPosition(direction), 'start');
      // DOM的通道是固定的 所以设置好top就不需要再改变了
      // dom.style.height = '70px'
      // dom.style.lineHeight = '70px'
      if (direction === 'topToBottom' || direction === 'BottomToTop') {
        oBox.style.display = 'flex'
        oBox.style.justifyContent = 'center'
      } else {
        dom.style.top = j * 20 + 'px';
      }

      // 放入改通道的DOM池
      doms.push(dom);
      // 每次到transition结束的时候 就是弹幕划出屏幕了 将DOM位置重置 再放回DOM池
      dom.addEventListener('transitionend', () => {
        dom.className = 'right';
        dom.style.transform = null;
        // dom.style.transform =  barrageDirection('start')// `translateX(${oBoxWidth}px)`;
        // dom.style.transform = `translateX(${oBoxWidth}px)`;
        dom.style.transform = barrageDirection(direction, getEndPosition(direction), 'start');
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
// 判断弹幕方向
/**需要三个参数， 方向 根据方向传入的结束位置  需要返回开始还是结束位置
 * 
 */
function barrageDirection (direction, { startPosition, endPosition }, val) {
  // topToBottom 上到下 BottomToTop 下到上 leftToRight  左到右 rightToLeft 右到左  // 默认右到左
  if (direction === 'topToBottom') {
    return val === 'start' ? `translateY(${startPosition}px)` : `translateY(${endPosition}px)`;
  } else if (direction === 'BottomToTop') {
    return val === 'start' ? `translateY(${startPosition}px)` : `translateY(${endPosition}px)`;
  } else if (direction === 'leftToRight') {
    return val === 'start' ? `translateX(${startPosition}px)` : `translateX(${endPosition}px)`;
  } else { // 当存在都匹配不到 (direction === 'rightToLeft')  
    return val === 'start' ? `translateX(${startPosition}px)` : `translateX(${endPosition}px)`;
  }
}
/**
 *  // endPosition 根据方向传入的结束位置
 */
function getEndPosition (dir, selfWidth = 0) {
  if (dir === 'topToBottom') {
    return { startPosition: 0 - selfWidth, endPosition: oBoxHeight }
  } else if (dir === 'BottomToTop') {
    return { endPosition: 0 - selfWidth, startPosition: oBoxHeight }
  } else if (dir === 'leftToRight') {
    return { startPosition: 0 - selfWidth, endPosition: oBoxWidth }
  } else { // 当存在都匹配不到 (dir === 'rightToLeft')  
    return { endPosition: 0 - selfWidth, startPosition: oBoxWidth }
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

  // 判断是 文本还是语音
  if (text.type === 0) {
    // 判断方向是否需要翻转内容
    dom.innerHTML = direction === 'leftToRight' ? `${conversionFace(overturn(text.content))}:${overturn(text.nickname)}` : `${text.nickname}:${conversionFace(text.content)}`
    // dom.innerHTML = `${text.nickname}:${conversionFace()}`
  } else if (text.type === 3) {
    text.play = false
    dom.style.display = 'flex';
    dom.style.alignItems = 'center';
    if (direction === 'leftToRight') {
      dom.innerHTML = `<div class="record_content" onclick='review(111)' style='transform: rotate(180deg)'> <p class="small"></p>
      <p class= "middle stopanimate" ></p>
      <p class="large stopanimate" ></p>
      <audio id='audioControls' src="${text.content}" ${autoAudioM ? 'autoplay' : ''} style='display:none'>
      </audio>
      </div> : ${overturn(text.nickname)}`
    } else {
      dom.innerHTML = `${text.nickname}: <div class="record_content" onclick='review(111)'> <p class="small"></p>
      <p class= "middle stopanimate" ></p>
      <p class="large stopanimate" ></p>
      <audio id='audioControls' src="${text.content}" ${autoAudioM ? 'autoplay' : ''} style='display:none'>
      </audio>
      </div> `
    }
  }
  let domWidthHeight = direction === 'topToBottom' || direction === 'BottomToTop' ? dom.clientHeight : dom.clientWidth
  // 获取到了元素得宽后再次重新设置初始位置
  // 右到左起点需要减去 自身宽度
  dom.style.transform = barrageDirection(direction, getEndPosition(direction, domWidthHeight), 'start');
  // 设置弹幕的位置信息 性能优化 transform
  dom.style.transform = barrageDirection(direction, getEndPosition(direction, domWidthHeight), 'end');
  // 默认设置黑色
  // dom.style.color = '#' + (~~(Math.random() * (1 << 24))).toString(16),
  dom.style.color = '#000',
    dom.className = 'left';
  hasPosition[channel] = false;
  // 弹幕全部显示之后 才能开始下一条弹幕
  // 大概 dom.clientWidth * 10 的时间 该条弹幕就从右边全部划出到可见区域 再加1秒保证弹幕之间距离
  setTimeout(() => {
    hasPosition[channel] = true;
  }, sportsTime(direction, dom));
}
function sportsTime (dir, dom) {
  if (dir === 'topToBottom' || dir === 'BottomToTop') {
    return dom.clientHeight * 10 + 1000
  } else {
    return dom.clientWidth * 10 + 1000
  }
}
window.onload = function () {
  // 每隔1ms从弹幕池里获取弹幕（如果有的话）并发射
  setInterval(() => {
    let channel;
    if (danmuPool.length && (channel = getChannel()) != -1) {
      let dom = domPool[channel].shift();
      let danmu = danmuPool.shift();
      // shootDanmu(dom, `${danmu.nickname}:${conversionFace(danmu.content)}`, channel);
      shootDanmu(dom, danmu, channel);
    }
  }, 1000);
  // 页面渲染完之后调用
  let code = document.getElementById("barrageChatjs").getAttribute("code")
  decode(code)
  createButton(oBox)
  // record(oBox)
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
// 创建标签 打开和关闭 自动播放语音
function createButton (oBox) {
  let buttonBox = document.createElement('div')
  buttonBox.innerText = autoAudioM ? '关闭自动播放语音' : '开启自动播放语音'
  buttonBox.style.fontSize = '12px'
  buttonBox.style.position = 'absolute'
  buttonBox.style.top = '10px'
  buttonBox.style.right = '10px'
  buttonBox.style.zIndex = '99'
  buttonBox.style.cursor = 'pointer';
  buttonBox.setAttribute('id', 'autoAudio')
  buttonBox.onclick = playOrCloseAudio
  oBox.appendChild(buttonBox)
}
// 开启关闭语音自动播放
function playOrCloseAudio () {
  if (document.getElementById('autoAudio').innerHTML === '开启自动播放语音') {
    document.getElementById('autoAudio').innerHTML = '关闭自动播放语音'
    document.getElementById('audioControls').autoplay = true
    autoAudioM = true
  } else {
    document.getElementById('autoAudio').innerHTML = '开启自动播放语音'
    document.getElementById('audioControls').autoplay = false
    autoAudioM = false
  }
}

// 录音功能弹框
function recordPopup () {
  if (document.getElementById('recordBox')) return
  let recordBox = document.createElement('div')
  recordBox.style.width = '200px'
  // recordBox.style.height = '150px'
  recordBox.style.fontSize = '14px'
  recordBox.style.background = 'rgba(0, 20, 35, 0.5)'
  recordBox.style.transform = 'translate(-50%, -50%)'
  recordBox.style.position = 'absolute'
  recordBox.style.top = '50%'
  recordBox.style.left = '50%'
  recordBox.style.padding = '20px 0'
  recordBox.style.borderRadius = '3px'
  recordBox.setAttribute('id', 'recordBox')
  let recordImg = document.createElement('img')
  recordImg.style.height = '50%'
  recordImg.style.width = '50%'
  recordImg.style.textAlign = 'center'
  recordImg.setAttribute('src', './assets/image/voice.gif')
  let recordText = document.createElement('p')
  recordText.style.textAlign = 'center'
  recordText.innerText = '正在录音请说话...'
  let recordBtnBox = document.createElement('div')
  recordBtnBox.style.display = 'flex'
  recordBtnBox.style.justifyContent = 'space-around'
  recordBtnBox.style.alignItems = 'center'
  let recordSend = document.createElement('p')
  recordSend.innerText = '发送'
  recordSend.style.background = '#fff'
  recordSend.style.padding = '5px'
  recordSend.style.margin = '0'
  recordSend.style.cursor = 'pointer';
  recordSend.addEventListener('click', () => {
    stopRecorder()
  })
  let recordClose = document.createElement('p')
  recordClose.innerText = '取消'
  recordClose.style.background = '#fff'
  recordClose.style.padding = '5px'
  recordClose.style.margin = '0'
  recordClose.style.cursor = 'pointer';
  recordClose.addEventListener('click', () => {
    cancelAudio()
  })
  recordBox.appendChild(recordImg)
  recordBox.appendChild(recordText)
  recordBtnBox.appendChild(recordSend)
  recordBtnBox.appendChild(recordClose)
  recordBox.appendChild(recordBtnBox)
  oBox.appendChild(recordBox)
  // 开始录音
  startRecorder()
}
// 点击语音播放获取不到点击事件的函数
function review (num) {
  console.log(num)
  console.log('点击播放了')
}
// 发送语音  结束录音
function stopRecorder () {
  recorder.stop()
  if (recorder.duration < 1) { // 当录音小于 1s
    popUp('录音太短了！')
    document.getElementById('recordBox').remove()
    return
  } else {
    document.getElementById('recordBox').remove()
  }
  let dataMp3 = recorder.getWAVBlob()
  var fileName = new Date().valueOf() + '.' + 'wav'
  const formData = new FormData()
  formData.append('name', fileName)
  formData.append('file', dataMp3)
  uploadVoice({
    params: formData,
    seller_code: userInfo.seller.seller_code
  })
    .then((result) => {
      let data = result.data.data
      data.duration = Math.round(recorder.duration)
      let my_send = {
        cmd: 'user-group',
        message: data,
        from_id: userInfo.data.uid,
        from_name: userInfo.data.username,
        from_avatar: userInfo.data.headimg,
        group_id: group_id,
        seller_code: userInfo.seller.seller_code,
        state: 0,
        nickname: userInfo.data.nickname[group_code],
        type: 3,
        is_invite: is_invite,
        from_ip: userIp.ip || '',
      }
      socket.emit('message', my_send)
    })
    .catch((err) => {
      popUp('发送失败')
    })
}
// 取消发送语音需要暂停处理
function cancelAudio () {
  recorder.stop()
  document.getElementById('recordBox').remove()
}
// 开始录音
function startRecorder () {
  recorder.start().then(
    () => {
      // this.drawRecord(); //开始绘制图片
    },
    (error) => {
      // 出错
      popUp('录音失败')
      document.getElementById('recordBox').remove()
    }
  )
  recorder.onprogress = function (params) {
    if (params.duration >= 5) {
      stopRecorder()
    }
  }
}