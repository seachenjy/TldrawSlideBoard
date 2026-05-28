# GitHub Release 自动打包发布设计文档

## 1. 目标

为当前项目添加一个 GitHub Actions 工作流，在推送版本标签时自动完成以下流程：

- 安装依赖
- 构建插件产物
- 将 `dist` 目录打包为 zip 文件
- 创建对应的 GitHub Release
- 将 zip 文件作为 Release 附件上传

## 2. 非目标

以下内容不包含在本次实现范围内：

- `main` 分支每次提交自动发布
- Actions Artifact 作为主要交付形式
- 自动生成版本号
- 自动更新 `package.json` 版本
- 同时上传 `crx`、源码包或其他额外产物

## 3. 触发方式

工作流仅在推送符合 `v*` 规则的标签时触发，例如：

- `v0.1.0`
- `v1.2.3`

这样可以把“构建”和“正式发布”绑定到显式版本标签，避免 `main` 上的普通提交自动生成正式 Release。

## 4. 方案结论

采用 GitHub Actions + `softprops/action-gh-release` 的方案。

原因：

- 配置简洁，维护成本低
- 与 GitHub Release 集成直接
- 使用内置 `GITHUB_TOKEN` 即可完成发布
- 适合当前单产物发布场景

## 5. 工作流设计

工作流文件位置：

- `.github/workflows/release.yml`

核心步骤：

1. 检出仓库代码
2. 安装 Node.js
3. 执行 `npm ci`
4. 执行 `npm run build`
5. 将 `dist` 目录压缩为 `tldraw-slide-board-${tag}.zip`
6. 创建 GitHub Release
7. 上传 zip 附件

## 6. 产物设计

产物文件名：

- `tldraw-slide-board-v0.1.0.zip`

命名规则：

- 前缀固定为项目名 `tldraw-slide-board`
- 后缀使用当前标签名

压缩内容：

- zip 中包含构建后的 `dist` 目录内容

## 7. 权限与依赖

工作流使用：

- `contents: write`

这样可以允许工作流创建 Release 并上传附件。

工作流依赖：

- `actions/checkout`
- `actions/setup-node`
- `softprops/action-gh-release`

不需要额外配置 Personal Access Token，默认使用 GitHub 提供的 `GITHUB_TOKEN`。

## 8. 失败处理

如果以下任一步骤失败，则本次发布中止：

- 依赖安装失败
- 构建失败
- 压缩失败
- Release 创建或附件上传失败

失败时不会生成不完整的正式 Release。

## 9. 验证方式

实现后通过以下方式验证：

1. 本地执行 `npm run build`
2. 提交工作流文件
3. 推送一个测试标签，例如 `v0.1.0`
4. 检查 GitHub Actions 是否成功执行
5. 检查仓库 Releases 页面是否生成对应版本
6. 下载 zip 并确认内容为构建后的 `dist`

## 10. 风险与边界

- 如果仓库未启用 Actions 或权限受限，Release 创建会失败
- 如果标签重复推送到同名 Release，可能触发更新行为而非新建行为
- 当前方案面向正式版本发布，不覆盖 nightly、beta、prerelease 等变体

## 11. 实现范围

本次实现只新增一项内容：

- GitHub Actions 自动发布工作流

不修改现有插件业务逻辑，不变更构建产物结构，不引入额外发布平台。
