const appData = require("../assets/emojis.json");
// import addData  from '../assets/emojis.json'
// const appData = {}
// 表情转化
export function conversion (input) {
  if (!input) return
  const regexTab = [];
  for (let key of Object.keys(appData)) {
    regexTab.push({
      regex: new RegExp(appData[key]["char"], "g"),
      placeholder: "[em_" + key + "]"
    });
  }
  for (let x of regexTab) {
    input = input.replace(x.regex, x.placeholder);
  }
  return input;
}
export function conversionFace (input) {
  if (!input) return
  for (let key of Object.keys(appData)) {
    input = input.replace(
      new RegExp(`\\[em_${key}\\]`, "g"),
      appData[key]["char"]
    );
  }
  return input;
}
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