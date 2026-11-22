# PingPong KK2

手机网页连上 ESP32-S3 的 Wi-Fi 热点，分别调节两颗 LED 的亮度。固件把 0–100 的数值写成 PWM，接到 GPIO14 和 GPIO15。热点名是 `PingPong-ESP32`，密码是 `pingpong123`。

## 文件树

```
pingpong-kk2/
├── README.md                 本说明
├── KK2_PROJECT_PLAN.md       项目计划，从电机原型写到 LED 验证
├── CURSOR_START_HERE.md      把计划放进已有仓库时的入口说明
├── .gitignore
├── docs/
│   └── PLAN.md               中文阶段计划
├── tools/
│   └── deploy_web.py         把 web/dist 复制到 esp32/data
├── web/                      浏览器里的控制页
│   ├── index.html            页面外壳，标题为 KK2 LED
│   ├── package.json          Node 依赖和 npm 脚本
│   ├── package-lock.json     依赖版本锁
│   ├── vite.config.ts        Vite 开发服务器、PWA，以及 /ws 转发到板子 81 端口
│   ├── tsconfig.json         TypeScript 工程引用
│   ├── tsconfig.app.json     浏览器代码的 TypeScript 配置
│   ├── tsconfig.node.json    Vite 配置文件的 TypeScript 配置
│   ├── public/               图标，原样进构建结果
│   └── src/
│       ├── main.tsx          React 入口
│       ├── App.tsx           两个滑块、开始/停止，经 WebSocket 发送亮度
│       ├── i18n.ts           瑞典语、英语、中文界面文案
│       └── style.css        页面样式
└── esp32/                    PlatformIO 固件
    ├── platformio.ini        板型、USB 串口、LittleFS
    ├── src/main.cpp          热点、网页、81 端口 WebSocket、两路 PWM
    └── data/                 烧进 LittleFS 的网页文件，由 deploy_web.py 生成
```

`web/node_modules/`、`web/dist/` 和 `esp32/.pio/` 是安装和编译产物，不手改。

## 各文件做什么

- `web/src/App.tsx` 用 WebSocket 把两路亮度发给板子。滑块上的数字只跟手指变。运行中约每 30 ms 推一次最新值，不等上一包的 HTTP 应答。1 分钟没有新指令，或最后一个页面断开时，固件把两颗灯关掉。
- `web/src/i18n.ts` 配置界面的多语言用语。语言是瑞典语 `sv`、英语 `en`、中文 `zh`。按钮、标题、提示都从这里按当前语言取出，页面上不写死句子。
- `esp32/src/main.cpp` 开热点，托管网页，并用 LEDC 驱动 GPIO14、GPIO15。`ENABLE_PWM_OUTPUTS` 现在是 `true`。
- `tools/deploy_web.py` 清空 `esp32/data/` 后，把 `web/dist/` 整份拷进去。

## 开发环境

1. 安装 [Node.js](https://nodejs.org/)（含 npm），用于编译网页。
2. 安装 Python 3。部署脚本只用标准库。
3. 在 Cursor 或 VS Code 安装 PlatformIO IDE。固件工程是 `esp32/`，环境名 `freenove_esp32s3`，板型 `esp32-s3-devkitc-1`，框架 Arduino。
4. 用 USB 线连接 Freenove ESP32-S3。本机串口是 COM3 时，在 `esp32/` 下编译和烧录会用到它；换口时在 PlatformIO 里改上传端口。
5. 第一次进入 `web/` 执行 `npm install`。

## 编译、链接、部署

固件的编译和链接由 PlatformIO 一次完成：C++ 源文件编成目标文件，再链接成 `firmware.elf`，并生成可烧录的 `firmware.bin`。

在 `esp32/` 目录：

```powershell
pio run
pio run -t upload
pio device monitor
```

`pio run` 编译并链接。`pio run -t upload` 把固件写进 Flash。监视器波特率是 115200。第一次有浏览器访问 API 时，串口打印热点名和 `192.168.4.1`。

网页有两种打开方式，用一种即可。

**在电脑上改页面。** 进入 `web/` 后执行：

```powershell
npm install
npm run dev
```

电脑浏览器打开 `http://localhost:5173`。这个地址上的页面是电脑临时提供的，板子里还没有这份网页。页面要调灯，就得能访问板子上的接口。板子的地址是 `http://192.168.4.1`，只有连上它自己发出的热点 `PingPong-ESP32` 才能到达。所以电脑也要连这个热点。连上之后，开发页面里的 WebSocket 路径 `/ws` 由 Vite 转到板子的 `ws://192.168.4.1:81`。手机打开板子上的页面时，浏览器直接连这个 81 端口。手机不必打开 `localhost:5173`，那个地址只在这台电脑上有效。

**把页面放进板子，之后不用开电脑。** 在仓库根目录执行：

```powershell
cd web
npm run build
cd ..
python tools/deploy_web.py
cd esp32
pio run -t uploadfs
```

`npm run build` 把页面打成静态文件，放在 `web/dist/`。`deploy_web.py` 把这些文件复制到 `esp32/data/`。`pio run -t uploadfs` 把它们写进板子的文件系统。完成后关掉开发服务器。手机只连热点 `PingPong-ESP32`，浏览器打开 `http://192.168.4.1`。页面由板子自己提供，两根滑块分别改 LED 1 和 LED 2 的亮度。

改了 `platformio.ini` 里的分区表或重新烧录固件后，文件系统里的网页可能被清掉，需要再执行一次 `uploadfs`。
