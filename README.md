# barrageChat

## Project setup
```
npm build
```
 
## 如何使用
```
生成一个dist文件夹 中的bundle.js 直接引入使用的html文件 或者 动态创建 script 标签引入
// 创建后需要传入的参数等结构
 通过script标签引入 并传入盒子,输入框和发送按钮的id 可正常发送消息以及展示
    /* 设置了盒子的最想宽高都为200px
    * script 标签需要设置 规定的id (才能动态获取相应参数) 
    * box 展示盒子Id
    * input 输入框Id
    * button 按钮Id
    * src 我们相应脚本地址 (这是我本地的)
    */
    例如: <script id="barrageChatjs" type="module" src="../barrageChat/dist/bundle.js" button='sendBtn' input='sendBarrage' box='barrageChat'>
    ```