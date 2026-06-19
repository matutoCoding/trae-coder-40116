# 剧本杀组局桌面客户端

基于 Electron + React + TypeScript + Ant Design 开发的剧本杀组局管理桌面应用。

---

## 🚀 命令速查

> 所有命令在项目根目录执行，需先 `npm install` 安装依赖。

### 🖥️ 桌面开发（推荐）

启动 Vite 开发服务器 + 自动拉起 Electron 桌面窗口，支持热更新：

```bash
npm run dev
```

- 弹出 **Electron 桌面窗口**，不是浏览器
- 修改代码后桌面窗口自动刷新
- 产物：无（仅开发运行）

### 🌐 Web 预览

仅启动 Vite 开发服务器，**不会弹出桌面窗口**，用浏览器访问：

```bash
npm run dev:web
```

- 浏览器打开 http://localhost:5173
- 不启动 Electron，适合只调 UI 样式
- 产物：无（仅开发运行）

### 📦 桌面打包

构建 Web 资源 + Electron 主进程 + 打包为可安装的桌面客户端：

```bash
npm run build
```

- 构建流程：`vite build`（含 Electron 主进程编译）→ `electron-builder` 打包
- 产物位置：
  - Web 构建产物：`dist/`
  - Electron 主进程：`dist-electron/`
  - **桌面安装包**：`release/` 目录（`.exe` 安装程序或便携版）

### 📦 仅构建 Web

只构建前端资源，不打包桌面客户端：

```bash
npm run build:web
```

- 产物位置：`dist/`（纯静态文件，可部署到任意 Web 服务器）

### 其他

```bash
npm run typecheck   # TypeScript 类型检查
npm run preview     # 预览 Web 构建产物（需先 build:web）
```

---

## 命令对比表

| 命令 | Electron 桌面窗口 | 浏览器 | 产物 | 用途 |
|------|:-:|:-:|------|------|
| `npm run dev` | ✅ 弹出 | — | 无 | 桌面客户端开发 |
| `npm run dev:web` | — | ✅ 手动打开 | 无 | 纯 Web UI 调试 |
| `npm run build` | — | — | `release/` 安装包 | 打包桌面客户端 |
| `npm run build:web` | — | — | `dist/` 静态文件 | 构建 Web 版本 |

---

## 📁 项目结构

```
├── electron/              # Electron 主进程
│   ├── main.ts            # 主窗口创建
│   └── preload.ts         # 预加载脚本
├── scripts/
│   └── dev-electron.js    # 桌面开发/打包启动脚本
├── src/
│   ├── types/             # 类型定义
│   ├── data/              # 模拟数据
│   ├── modules/           # 业务模块
│   │   ├── matchScore.ts  # 契合度评分
│   │   ├── matching.ts    # 双向撮合
│   │   ├── discount.ts    # 优惠计算
│   │   ├── billing.ts     # 账单生成
│   │   └── dmSchedule.ts  # DM排班
│   ├── store/             # 状态管理 (Zustand)
│   ├── pages/             # 页面组件
│   ├── layouts/           # 布局组件
│   └── styles/            # 样式
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 🛠️ 技术栈

- **框架**：React 18 + TypeScript
- **构建工具**：Vite
- **桌面端**：Electron
- **UI 组件库**：Ant Design 5.x
- **状态管理**：Zustand
- **路由**：React Router（HashRouter，兼容 Electron file:// 协议）

## 🎯 功能模块

1. **双向撮合** — 玩家和局双向意愿匹配，双方都同意才成交
2. **契合排序** — 题材/难度/标签多维度评分，按口味匹配度排序
3. **优惠计算** — 折扣券+满减叠加，顺序可配，金额不为负
4. **账单生成** — 批量出账、优惠明细、打印、支付状态流转
5. **DM排班** — 日历视图、智能推荐
6. **玩家/剧本管理** — CRUD、偏好设置

## 📝 业务规则

### 双向撮合
- 玩家点「我想玩」+ 局方点「局方缺人」→ 双方都同意 → 撮合成功
- 单方意愿不成交
- 撮合成功自动加入对局，人数达标自动成团

### 优惠计算
- 顺序影响最终价：先满减后折扣 ≠ 先折扣后满减
- 例：¥200，满100减20 + 8折 → 先满减：(200-20)×0.8=¥144 / 先折扣：200×0.8-20=¥140
- 叠加后最低 ¥0，不会出现负数
- 独占券不可与其他券叠加，系统自动选最优方案
