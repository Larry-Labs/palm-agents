# Palm Agents · 掌上 Agents

仓库：[Larry-Labs/palm-agents](https://github.com/Larry-Labs/palm-agents)。开发分支：`dev/palm-agents`。基于 Codex Relay 1.6.3 客户端，保留上游许可证及作者署名。

## 本轮实现

- 简体中文界面：配对、会话侧栏、聊天、模型与权限、审批与输入请求、设置、工作区文件、Git、网页与终端操作。文案集中在 `apps/mobile/src/i18n/zh-CN.ts`；模型名、文件名、协议值、用户和助手消息保持原样。
- 跟随系统的浅色／深色外观：React Native 样式、导航、SwiftUI 设置与空状态、底部面板、聊天 Markdown 与代码高亮使用同一主题。终端与嵌入式 Monaco 编辑器暂保留原有深色工作表面。
- 聊天布局参考 Codex 的信息结构：按项目组织的会话侧栏、标题与工作区信息、无卡片包裹的助手回复、底部多行输入框、模型／权限选择、独立工作区预览。手机使用侧栏与全屏预览，大屏保留分栏。
- 修复：中文输入法组字时占位文字重叠（原生依赖补丁）、保存的推理等级与新模型不匹配、自动模式向新版 app-server 发送已移除的 `on-failure` 策略。

审批策略兼容修复位于 Relay 服务端，需要同时运行本分支的 Relay 服务；仅更换手机端不能修复旧服务器的该问题。

这不是官方 OpenAI 客户端。布局采用相近的层级与工作流，并针对手机屏幕、触控和中文长度调整。

## 功能探索

项目已具备会话置顶与搜索、逐会话草稿、计划模式、图片附件、Git 差异和终端、回到最新消息按钮；不将这些重复列为新增功能。

| 优先级 | 候选功能            | 使用场景与验收方向                                                                                                                                                              |
| ------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1     | 多电脑配置与切换    | 在 NAS、工作电脑和个人电脑间切换；按主机隔离会话、密钥、草稿和缓存，防止串数据。上游需求：[#68](https://github.com/gronxb/codex-relay/issues/68)。                              |
| P1     | HTML 与图片文件预览 | 从工作区文件直接查看生成的网页、报告与截图；保留查看源码，限制在工作区内读取，HTML 使用无原生桥接的隔离预览。上游需求：[#48](https://github.com/gronxb/codex-relay/issues/48)。 |
| P2     | 导出与分享会话      | 导出选定消息为 Markdown，通过 iOS 分享面板发送；明确是否包含工具输出与附件，避免默认导出敏感工作区信息。                                                                        |
| P2     | 会话内搜索          | 按关键词定位消息、命令或文件路径；支持中文输入和跳转到命中位置，区别于现有的会话列表搜索。                                                                                      |
| P2     | 连接诊断            | 将已有配对错误整理为可操作的连接状态：电脑在线、Relay 版本、局域网／Tailscale 可达性、重新配对。                                                                                |

## 其余已知问题

以下问题需要专门复现，不在本轮宣称已修复：

- [#82](https://github.com/gronxb/codex-relay/issues/82)：其他客户端刚完成任务后，Relay 恢复会话可能遇到 active writer 占用。
- [#52](https://github.com/gronxb/codex-relay/issues/52)：超大 rollout 文件的完整读取可能超出 Node 字符串上限，适合单独改为有界流式读取并测试。
- [#51](https://github.com/gronxb/codex-relay/issues/51)：会话时间与消息数量在旧元数据和实时状态之间闪动。
- [#49](https://github.com/gronxb/codex-relay/issues/49)：iOS LaTeX 显示需要在不同表达式与字体下复现。

## 构建与验证

英文名为 **Palm Agents**，中文名为「掌上 Agents」。桌面显示名称为 Palm Agents，Bundle ID 为 `com.larrylabs.palmagents`，URL scheme 为 `palm-agents`。应用内扫码仍兼容上游 Relay 生成的配对二维码。独立的 Bundle ID 可与上游应用并存。

在 macOS 安装依赖并运行原生开发客户端：

```sh
pnpm install --frozen-lockfile
pnpm dev:mobile:ios
```

## 启动 Relay 并配对

在要运行 Codex 的电脑或 NAS 上，从工作目录启动 Palm Agents Relay：

```sh
npx @larry-labs/palm-agents-relay@latest
```

用 Palm Agents 扫描终端打印的二维码。手机显示审批码时，在运行 Relay 的终端核对后输入 `y`。如果 Relay 在后台运行，也可以在该机器上执行：

```sh
npx @larry-labs/palm-agents-relay@latest approve XXXX-XXXX
```

Relay 支持 Node.js 22.14 或更新版本，运行机器需要安装并登录 Codex CLI。不要将配对凭据提交到仓库。

## 发布配置

使用 EAS 构建或推送通知前，先关联自己的 Expo 项目并设置 `EAS_PROJECT_ID`；没有沿用上游项目 ID。提交 App Store 前需选择自己的 App Store Connect 应用；EAS 配置没有预填上游商店应用 ID。OTA 默认关闭；独立配置 `EXPO_PUBLIC_HOT_UPDATER_BASE_URL` 和 `HOT_UPDATER_PUBLIC_KEY_PATH` 后才启用相应原生构建插件。

当前工作环境是 Linux，不能运行 iOS 模拟器或生成签名后的 iPhone 安装包。上游依赖的 Markdown 输入框与原生网络模块缺少完整 Web 实现，浏览器不能替代原生客户端验收。

本轮校验：服务端回归测试 337 项通过（5 项条件跳过），移动端测试 34 项通过，发布与 OTA 配置测试 15 项通过，全工作区 TypeScript 检查通过，iOS Hermes JavaScript 包构建成功。Lint 无错误；终端组件有两条原有的 Hook 依赖警告。Metro 对上游 Unistyles 子路径导出存在警告，但成功解析并完成构建。以上不代表真机界面和原生输入法验收已经完成。

真机验收应覆盖：系统主题在应用打开期间切换、窄屏与横屏、中文组字／选字／取消／清空、长文件名、模型与权限面板、配对与重连、审批与输入请求、通知权限。原生输入补丁必须重新编译后验证。
