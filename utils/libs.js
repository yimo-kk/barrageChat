import { emojisAmap } from './face/index.js'
// 表情转化
// 解析emoji表情 以及换行回车
export function faceHtml (value) {
  var reg = RegExp(/b/);
  return `<span contenteditable='false' class="${value} ${reg.test(value) ? ' emoji_b' : 'emoji_a'}" data-name='${value}'></span>`
}
export function conversionFace (input) {
  for (const key in emojisAmap) {
    var reg = RegExp(/b/);
    let re = {
      regex: new RegExp(`\\[${emojisAmap[key]}\\]`, "g"),
      placeholder: `<span contenteditable='false' class="${emojisAmap[key]} ${reg.test(emojisAmap[key]) ? ' emoji_b' : 'emoji_a'}" data-name='${emojisAmap[key]}'></span>`
    }
    input = input.replace(re.regex, re.placeholder);
  }
  return input
}

// export function conversion (input) {
//   if (!input) return
//   const regexTab = [];
//   for (let key of Object.keys(appData)) {
//     regexTab.push({
//       regex: new RegExp(appData[key]["char"], "g"),
//       placeholder: "[em_" + key + "]"
//     });
//   }
//   for (let x of regexTab) {
//     input = input.replace(x.regex, x.placeholder);
//   }
//   return input;
// }
// export function conversionFace (input) {
//   if (!input) return
//   for (let key of Object.keys(appData)) {
//     input = input.replace(
//       new RegExp(`\\[em_${key}\\]`, "g"),
//       appData[key]["char"]
//     );
//   }
//   return input;
// }
export function segmentation (string) {
  let obj = {}
  var vars = string.split("&");
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split("=");
    obj[pair[0]] = pair[1]
  }
  return obj
}
export function rule (data) {
  let str = JSON.parse(JSON.stringify(data))
  str.nickname = eval('(' + str.nickname + ')')
  return str
}
export function createUserName () {
  var ranNum = Math.ceil(Math.random() * 25);
  var letter = String.fromCharCode(65 + ranNum); //随机字母
  var day = new Date();
  var fullYear = day.getFullYear(); //获取当前年份
  var rand = GetRandomNum(10000, 99999); //随机数字
  return letter + fullYear + rand;
}
// 生成随机字符串
function GetRandomNum (Min, Max) {
  var Range = Max - Min;
  var Rand = Math.random();
  return Min + Math.round(Rand * Range);
}
