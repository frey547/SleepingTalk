# SleepingTalk

[English](README.md) | 简体中文

SleepingTalk 是一个面向 Web、PWA 和 Android 的独立、本地优先 AI 聊天客户端。项目支持 DeepSeek 官方 API，以及可配置 Base URL、API Key 和模型的 OpenAI Chat Completions 兼容服务。

SleepingTalk 是独立的第三方项目，与 DeepSeek 官方不存在隶属、合作、联合开发或官方认可关系。

## 功能

- 流式输出和多轮上下文。
- 多 API Provider 及独立配置。
- 本地聊天历史、消息编辑、重新生成和分支切换。
- Markdown、代码高亮、KaTeX 公式和 Mermaid 图表。
- 移动端适配、PWA 和 Capacitor Android 工程。

## 本地数据

API Key 和设置保存在 localStorage，会话和附件原件保存在 IndexedDB。聊天内容会直接发送给用户选择的 API 服务商；本仓库不包含 SleepingTalk 自建应用后端。

## 本地开发

需要 Node.js 22.12+ 和 pnpm。

```sh
pnpm install
pnpm dev
```

开发服务器默认运行在 http://localhost:8090。执行 `pnpm build` 可在 `dist/` 生成静态站点。

### Android 环境

Android 开发需要 JDK 21 和 Android SDK，请使用标准的本地环境配置：

- 将 `JAVA_HOME` 指向本机 JDK 21，或在 Android Studio 中将 Gradle JDK 设为 JDK 21。
- 从终端构建时，将 `ANDROID_HOME` 或 `ANDROID_SDK_ROOT` 指向本机 Android SDK。
- Android Studio 可以在 `android/local.properties` 中写入本机 `sdk.dir`；该文件已被 Git 忽略。

编辑器个人设置、SDK 路径、签名密钥和签名属性文件必须保留在本地，不应提交到仓库。

## 上游项目

SleepingTalk 基于 DeepSeek 官方 [chat-demo](https://github.com/deepseek-ai/chat-demo) 二次开发。原始 DeepSeek 版权声明和 MIT 许可证完整保留在 [LICENSE](LICENSE) 中。

项目中 DeepSeek Provider 和 API 名称仅用于说明服务兼容性，不代表 SleepingTalk 与 DeepSeek 官方存在关联。

## 许可证

[MIT](LICENSE)。原始 DeepSeek chat-demo 版权声明和许可文本继续保留，分发时不得移除；第三方依赖及随包资源分别遵循其各自许可证，详情见 [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES)。
