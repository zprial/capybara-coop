# 水豚双舟 · Capybara Co-op

单文件起家的双人合作联机射击游戏：两只水豚各乘小船，用枪械后坐力当引擎，在 300m 随机浅海里生存、探索、打首领。

## 玩法速览
- **后坐力即引擎**：开枪反冲推船，想往右就朝左打；`WASD` 只是轻划桨
- 5 颗心，倒地后队友靠近按住 `E` 救起；全员倒地即失败
- 64 格迷雾海域、8 种地貌；沉船 / 漩涡 / 神龛 / 符文藏在雾里，集齐 3 枚符文可提前唤醒首领
- 随机事件（宝箱潮 / 怪潮 / 落雷 / 洋流 / 幽灵商船 / 荆棘开花 / 海雾散去 / 陨石雨）每分钟轮转
- 商船每班换港口；生存 4 分钟后首领登场，击杀通关

## 工程结构
```
src/                  # 源码（ES 模块）
  core.js             #   基础工具 / 网格坐标
  config.js           #   常量与数据表（武器/怪物/事件/地貌）
  state.js            #   权威游戏状态
  net.js              #   传输层（BroadcastChannel / WebSocket 中继）
  input.js            #   键鼠 + AI 输入
  sim.js              #   60Hz 权威模拟
  snapshot.js         #   20Hz 快照 + 客户端预测/和解
  msg.js              #   房间消息路由（候船厅/席位/开始）
  scene.js            #   renderer / camera / 灯光
  pipeline.js         #   程序化建模管线
  world.js            #   按 seed 的大世界生成
  models.js           #   实体模型（船/水豚/怪物/首领…）
  fx.js               #   特效与音效
  view.js             #   插值渲染与相机
  hud.js              #   HUD / 小地图 / 商店
  loop.js             #   固定步长主循环
  main.js             #   生命周期与 UI 绑定（入口）
  shell.html          #   页面骨架（样式 + DOM）
  three.js            #   three.js CDN 加载器
build.mjs             # 零依赖构建：src/ -> dist/capybara-coop.html（单文件）
index.html            # 开发版入口（直接加载 src/，需 HTTP 服务）
server.mjs            # 零依赖 Node：静态托管 + /relay WebSocket 中继 + /healthz
Dockerfile            # 多阶段：镜像内构建 dist，运行期只有产物与服务
docker-compose.yml    # 端口 31118
```

## 开发
```bash
npm run dev        # 127.0.0.1:31118，改 src/ 刷新即生效
node build.mjs     # 生成 dist/capybara-coop.html（部署用单文件）
```
> 开发页在 `/index.html`，服务器首页 `/` 返回的是 `dist/` 构建产物。

## 部署（Docker）
```bash
docker compose up -d --build
# http://<host>:31118/        页面
# ws(s)://<host>:31118/relay  中继（同源自动发现，HTTPS 下自动 wss）
# http://<host>:31118/healthz 健康检查
```
跨设备联机：两台设备打开同一网址、房间名一致即可；先「创建房间」，等人齐后房主点「开始游戏」。房间最多 12 人、同场 6 条船，空位 AI 补位，超额观战。

> HTTPS 反代时把 `/relay` 做 WebSocket 升级转发；页面与中继保持同源即可零配置。

## 网络模型
房主浏览器内跑 60Hz 固定步长权威模拟；20Hz 快照下发；客户端 60Hz 输入直发 + 本地预测 + 回滚重放和解，其余实体做快照插值。服务器不跑游戏逻辑，只做静态托管与房间内 JSON 广播。
