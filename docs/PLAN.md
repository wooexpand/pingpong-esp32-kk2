# KK2 开发计划与验收

## V0.1 — REST 通信
- ESP32-S3 广播 AP `PingPong-ESP32`
- `GET /api/status` 返回可解析 JSON
- `POST /api/start` 进入运行状态
- `POST /api/motors` 正确处理 0-100 数值并打印 Serial
- `POST /api/stop` 立即清零，断联约 1 分钟自动停机

## V0.2 — React 控制器
- Cursor 中的 React 页面提供连接状态、双滑块、预设、启停
- 浏览器与 ESP32 连续交换命令
- 网络断开有明确提示

## V0.3 — 单板独立部署
- `web/dist` 部署到 LittleFS
- 手机连接 ESP32 Wi-Fi，访问 `http://192.168.4.1`
- iOS Safari 添加到主屏幕；Android 测试添加快捷方式
- 离开电脑后仍可操作

## V0.4 — LED 验证
- 安全前提下启用双路 PWM，仅连接带限流电阻的 LED
- 两通道变化可观察

## V0.5 — 电机测试
- 另行设计和审核电源、驱动器、接线与急停
- 验证最大电流、失联、重启和失控停机

## V1.0 — 机械发射验证
- 可靠的成品摩擦轮、保护罩、可调节电机座
- 单球发射可重复；由手机控制速度与差速

## 风险清单
- 真实电机危险：卡球、飞轮碎裂、电机过流、塑料轮毂破裂
- SoftAP 没有互联网；手机可能自动切回数据网络
- HTTP 不加密；其他连接到热点的客户端可控制设备
- 本地 HTTP 不能满足标准 HTTPS Service Worker 约束
