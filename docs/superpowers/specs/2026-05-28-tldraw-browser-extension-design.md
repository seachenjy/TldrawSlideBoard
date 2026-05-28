# Tldraw 浏览器插件重构设计文档

## 1. 目标

基于 `need.txt` 的要求，将当前项目重构为一个基于 `tldraw` 的浏览器插件，支持：

1. slide 模式
2. 即时创建白板，可编辑和持久化
3. 内容按时间进行索引，有日期面板，可以查看当日创建了多少白板
4. 全量导出和导入功能

本项目采用 `Chrome Extension Manifest V3`，插件主入口为独立插件页面，其中 `side panel` 负责日常索引和管理，独立编辑页承载 `tldraw` 画布。

## 2. 非目标

以下内容不在本轮重构范围内：

- 多用户协作
- 云端账号与同步
- 复杂权限体系
- 完整笔记应用或文档产品
- 插件商店发布相关的自动化打包与发布流水线
- 移动端适配

## 3. 方案结论

采用 `A1：Side Panel + tldraw + IndexedDB` 方案。

### 3.1 为什么选 side panel

- 适合作为长期使用的入口
- 天然适合“日期索引 + 白板列表 + 快速操作”
- 不受 popup 高度限制，索引和检索体验更稳定

### 3.2 为什么编辑器独立成页面

- `tldraw` 编辑器需要足够空间
- 独立页面更容易承载 slide 管理、画布保存、返回导航
- 能让 side panel 保持轻量，只承担索引和管理职责

### 3.3 为什么用 IndexedDB

- `tldraw` 快照数据量较大
- `chrome.storage` 不适合承载频繁变化的大型结构化数据
- `IndexedDB` 更适合存储白板元数据、快照和按天索引

## 4. 目标架构

整体分为 5 层：

- `extension shell`：插件入口、权限、页面跳转、消息通信
- `panel app`：side panel 中的索引、日期面板、列表与导入导出入口
- `editor app`：独立编辑页，承载 `tldraw`、slide 管理、单白板保存
- `store`：Pinia 状态管理，维护当前选中日期、列表状态、轻量 UI 状态
- `repository`：IndexedDB 封装层，统一处理白板的创建、读取、更新、删除、导入、导出

### 4.1 工程基础

保留现有 `Vue3 + Vite + TypeScript` 工程基础，但业务代码按新目标重构。

主要新增依赖：

- `@tldraw/tldraw`
- `pinia`
- 按需引入 `idb` 或自封装 IndexedDB 访问层

### 4.2 页面入口

- `sidepanel.html`：插件 side panel 主入口
- `editor.html`：白板编辑页
- 可选 `options.html`：用于全量导入导出或全局设置

## 5. 页面设计

### 5.1 Side Panel

Side Panel 承担所有索引和管理职责。

核心功能：

- 按天查看白板索引
- 展示某一天创建了多少白板
- 展示当日白板列表
- 新建白板
- 打开某个白板进入编辑页
- 全量导出
- 全量导入

交互规则：

- 默认展示当天
- 日期切换后立刻更新列表与统计
- 新建白板后跳转到编辑页
- 导入完成后刷新当前索引

### 5.2 Editor Page

Editor Page 负责编辑与 slide 管理。

核心功能：

- 承载 `tldraw`
- 展示白板标题、创建时间
- 返回 side panel
- 新建 slide、切换 slide、删除 slide
- 自动保存当前白板
- 导出当前白板

交互规则：

- 打开编辑页时加载目标白板
- 切换 slide 时保存当前状态并加载目标 slide
- 页面关闭或切换前执行一次保存
- 删除 slide 时保留至少一个 slide

## 6. 数据模型设计

### 6.1 boardMeta

用于索引和列表展示。

字段：

- `id`
- `title`
- `createdAt`
- `updatedAt`
- `dateKey`
- `activeSlideId`
- `slideCount`

### 6.2 boardData

用于存储完整白板数据。

字段：

- `id`
- `slides`
- `updatedAt`

### 6.3 slide

每个白板内部可包含多个 slide。

字段：

- `id`
- `boardId`
- `order`
- `name`
- `snapshot`
- `createdAt`
- `updatedAt`

### 6.4 dateIndex

用于快速统计某天有多少白板。

字段：

- `dateKey`
- `boardIds`

## 7. 时间索引设计

### 7.1 日期粒度

按天聚合，不做跨天拆分。

### 7.2 dateKey 规则

建议使用 `YYYY-MM-DD`。

### 7.3 统计规则

- 以白板的 `createdAt` 归入对应日期
- 日期面板展示“当天创建了多少白板”
- 列表默认按 `createdAt` 倒序展示

### 7.4 边界情况

- 当天没有任何白板时显示空态
- 全量导入后如果包含历史日期，索引自动补齐
- 删除白板时同步清理对应日期索引

## 8. 持久化设计

### 8.1 存储策略

- `boardMeta` 存一份轻量索引数据
- `boardData` 存完整 slide 数据
- `dateIndex` 维护 `dateKey -> boardId[]`

### 8.2 写入策略

- 新建白板时同时写入 `boardMeta`、`boardData`、`dateIndex`
- 编辑页保存时主要更新 `boardData` 和 `boardMeta.updatedAt`
- slide 新增、删除、排序时更新 `boardData.slides`
- 删除白板时清理 `boardMeta`、`boardData`、`dateIndex`

### 8.3 自动保存策略

建议两种触发方式结合：

- 编辑过程中按间隔自动保存
- 页面失焦或离开前强制保存一次

## 9. 导入导出设计

### 9.1 全量导出

导出一个 JSON 文件，包含当前全部数据。

建议结构：

- `version`
- `exportedAt`
- `boardMetas`
- `boards`

### 9.2 全量导入

导入时先校验文件结构，再决定写入策略。

校验项：

- 是否存在必要顶层字段
- `boardMetas` 和 `boards` 是否配套
- 是否有明显损坏的 slide 数据

建议提供两种导入模式：

- `merge`：新增不存在的数据，跳过已存在数据
- `overwrite`：清空当前数据后全量写入

默认推荐 `merge`。

## 10. 组件拆分

### 10.1 `SidePanelApp`

- 挂载日期面板、白板列表、导入导出入口
- 负责 side panel 页面顶层组织

### 10.2 `DatePanel`

- 展示可选日期
- 展示当天白板数量
- 触发日期切换

### 10.3 `BoardList`

- 展示当前日期下的白板列表
- 支持打开、删除
- 展示创建时间和更新时间

### 10.4 `EditorApp`

- 挂载 `tldraw`
- 组织顶部导航、slide 面板、保存状态

### 10.5 `SlidePanel`

- 新建 slide
- 切换 slide
- 删除 slide
- 展示当前 slide 名称与顺序

### 10.6 `useBoardRepository`

- 封装白板和 slide 的 CRUD
- 统一处理 IndexedDB 读写

### 10.7 `useDateIndex`

- 维护按天统计结果
- 处理新建、删除、导入后的索引更新

## 11. 数据流设计

### 11.1 创建白板

1. 用户点击“新建白板”
2. 生成 `boardMeta`
3. 生成默认 `boardData`
4. 初始化第一个 `slide`
5. 更新 `dateIndex`
6. 跳转到 `editor.html?id=...`

### 11.2 打开白板

1. side panel 点击白板
2. 跳转到编辑页
3. 编辑页读取 `boardMeta` 和 `boardData`
4. 渲染当前 active slide
5. 用户编辑后定时保存

### 11.3 按天浏览

1. 用户切换日期
2. 读取该日期下的 `boardIds`
3. 批量读取对应的 `boardMeta`
4. 渲染列表和统计数量

### 11.4 导入导出

1. 导出时读取全部 `boardMeta`、`boardData`、`dateIndex` 并序列化
2. 导入时先校验 JSON
3. 按模式写入 IndexedDB
4. 刷新当前索引视图

## 12. 异常处理

### 12.1 白板加载失败

- 编辑页展示错误提示
- 提供返回 side panel 的入口
- 不展示空白页面

### 12.2 自动保存失败

- 在编辑页展示轻量保存失败提示
- 允许用户手动重试保存

### 12.3 导入文件异常

- 校验失败时提示具体原因
- 不执行半写入，避免数据损坏

### 12.4 slide 删除边界

- 最后一个 slide 不允许删除
- 删除后自动切换到相邻 slide

## 13. 测试策略

### 13.1 手动验证

必须覆盖：

- 新建白板并进入编辑页
- 编辑后持久化，再次打开可恢复
- 日期面板显示当天创建数量
- 新建、切换、删除 slide
- 全量导出生成合法 JSON
- 全量导入后索引和白板正确恢复

### 13.2 自动化测试

优先覆盖：

- `boardMeta` 创建和按天聚合逻辑
- `boardData` 保存与读取
- 导入校验逻辑
- slide 顺序维护逻辑

不重点覆盖：

- `tldraw` 内部行为
- 浏览器插件权限层细节
- 全量 UI 快照

## 14. 验收标准

当满足以下条件时，视为本次重构完成：

- 基于 `tldraw` 实现浏览器插件
- 支持 slide 模式
- 可即时创建白板，并能编辑和持久化
- 内容按时间索引，有日期面板，能查看当日创建了多少白板
- 具备全量导出和全量导入功能
- side panel 与编辑页之间导航稳定
- 数据持久化可靠，关闭后重新打开可恢复

## 15. 实现建议

建议按以下顺序实现：

1. 重建插件工程结构与入口
2. 接入 `tldraw`，完成最小可编辑白板
3. 接入 IndexedDB，完成持久化
4. 建立 `boardMeta`、`boardData`、`dateIndex` 模型
5. 完成 side panel 的日期索引与列表
6. 增加 slide 模式
7. 增加全量导入导出
8. 最后做异常兜底与验收打磨
