<p align="center">
  <img src="logo.png" alt="Tldraw Slide Board" width="128" />
</p>

<h1 align="center">Tldraw Slide Board</h1>

<p align="center">
  基于 <a href="https://tldraw.com">tldraw</a> 的浏览器插件，用于创建和管理白板幻灯片。
</p>
<p>
  <img src="screen_1.png" alt="Screen 1" width="640" />
  <img src="screen_2.png" alt="Screen 2" width="640" />
</p>
<p align="center">
  <a href="README.md">English</a>
</p>

---

## 功能特性

- **Slide 模式** — 每个白板支持多个幻灯片，可在白板内创建、切换和删除 slide。
- **日期索引** — 白板按创建日期归档，通过日期导航栏浏览历史记录。
- **内联编辑** — tldraw 画布直接嵌入侧边栏，无需打开新标签页。
- **自动保存** — 每 3 秒自动保存变更，同时提供手动保存按钮。
- **标题编辑** — 在历史列表中直接重命名白板。
- **全量导入/导出** — 将所有白板和幻灯片导出为单个 JSON 文件，支持合并导入或覆盖导入。

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 生产构建

```bash
npm run build
```

### 加载为 Chrome 扩展

1. 使用 `npm run build` 构建项目。
2. 在浏览器中打开 `chrome://extensions`。
3. 开启 **开发者模式**。
4. 点击 **加载已解压的扩展程序**，选择 `dist` 文件夹。

## 技术栈

- [Vue 3](https://vuejs.org/) — 组合式 API + `<script setup>`
- [tldraw](https://tldraw.com/) — 协作白板/画布编辑器
- [Vite](https://vitejs.dev/) — 构建工具
- [idb-keyval](https://github.com/jakearchibald/idb-keyval) — IndexedDB 键值存储
- [@lucide/vue](https://lucide.dev/) — SVG 图标库
- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)

## 项目结构

```
src/
├── background/
│   └── main.ts                # 服务脚本（侧边栏与 action 处理）
├── shared/
│   ├── types.ts               # 数据模型（BoardMeta、SlideRecord 等）
│   └── storage.ts             # IndexedDB 持久化层
├── sidepanel/
│   ├── SidePanelApp.vue       # 侧边栏主组件（日期索引 + 白板列表）
│   ├── InlineEditor.vue       # 内嵌 tldraw 编辑器（含 slide 管理）
│   ├── DatePanel.vue          # 日期导航栏
│   ├── BoardList.vue          # 白板历史列表（支持标题编辑）
│   └── main.ts                # 侧边栏入口
└── editor/
    ├── EditorApp.vue          # 独立编辑器页面（可选）
    ├── TldrawVueBridge.vue    # Vue ↔ React 桥接组件
    └── main.ts                # 编辑器入口
```

## 开源协议

MIT
