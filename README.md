# SleepingTalk



SleepingTalk 是一款独立的、本地优先的 AI 聊天客户端，支持 Web、PWA 和 Android 平台。它支持官方 DeepSeek API，以及可配置的 OpenAI Chat Completions 兼容服务商，包括自定义 Base URL、API Key 和模型。

SleepingTalk 是一个独立的第三方项目，与 DeepSeek 没有任何隶属、认可或合作开发关系。

## 功能特性

- 流式响应与多轮对话。
- 支持多个 API 服务商，并可分别配置各服务商的参数。
- 本地聊天记录、消息编辑、重新生成和对话分支切换。
- 支持 Markdown、代码语法高亮、KaTeX 数学公式和 Mermaid 图表。
- 响应式移动端界面、PWA 支持及基于 Capacitor 的 Android 项目。

## 本地数据

API Key 和相关设置存储在 localStorage 中。对话记录及附件原件存储在 IndexedDB 中。聊天内容会直接发送至用户选择的 API 服务商；本仓库不包含 SleepingTalk 自有的应用后端服务。

## 开发指南

需要 Node.js 22.12 或更高版本，以及 pnpm。

```
pnpm install
pnpm dev
```

开发服务器运行地址为 http://localhost:8090。使用 `pnpm build` 可以构建静态网站，生成的文件位于 `dist/` 目录中。

### Android 开发环境

Android 开发需要 JDK 21 和 Android SDK。请使用标准本地开发工具配置：

- 将 `JAVA_HOME` 设置为本地 JDK 21 的安装路径，或者在 Android Studio 中将 Gradle JDK 设置为 JDK 21。
- 如果通过终端进行构建，请将 `ANDROID_HOME` 或 `ANDROID_SDK_ROOT` 设置为本地 Android SDK 的安装路径。
- Android Studio 可能会自动创建 `android/local.properties`，其中包含本地 `sdk.dir` 配置。该文件已被 Git 忽略，不会提交到仓库。

与具体设备相关的编辑器设置、SDK 路径、签名密钥及签名属性文件必须保留在本地，不得提交到 Git 仓库。

## 上游项目

SleepingTalk 基于 DeepSeek 官方的 [chat-demo](https://github.com/deepseek-ai/chat-demo) 项目开发。原始 DeepSeek 版权声明及 MIT 许可证已保留在 LICENSE 文件中。

项目中对 DeepSeek 的服务商名称和 API 集成的引用，仅用于说明与 DeepSeek 服务的兼容性，并不代表本项目与 DeepSeek 存在官方关联。

## 许可证

本项目采用 MIT 许可证。原始 DeepSeek chat-demo 项目的版权声明及许可声明仍包含在 LICENSE 文件中，必须予以保留。

第三方依赖及项目中打包的资源仍受各自许可证约束，详情请参阅 `THIRD_PARTY_NOTICES` 文件。
