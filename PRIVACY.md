# SleepingTalk Privacy Notice

SleepingTalk does not provide a developer-operated chat backend. API credentials and app settings are stored in `localStorage` on the user's device. Chat sessions, messages, and locally retained attachment originals are stored in the browser's IndexedDB.

When the user starts a request, conversation content and any required attachments are sent directly to the API provider configured by the user. The app's voice input sends recorded audio to the configured DeepSeek speech-recognition endpoint. Voice playback may send assistant response text to the DeepSeek speech-synthesis endpoint. These speech endpoints currently use the app's DeepSeek API service configuration.

Each third-party provider determines its own data handling, retention, and privacy practices. Uploaded files may remain with the provider according to that provider's policies. SleepingTalk has no automatic telemetry or analytics code that uploads chat history or API keys.

Clearing browser/app data, removing site data, or uninstalling the Android app may permanently remove locally stored settings, API keys, conversations, and attachment originals. Android backups are disabled for this app; this does not delete existing local data and does not control copies held by API providers.

Users should protect their API keys, use only trusted API providers, and prefer HTTPS endpoints. An HTTP endpoint can expose API keys and request content to parties able to observe the network. Local or LAN HTTP endpoints may also be blocked by browser or Android WebView security rules.

# SleepingTalk 隐私说明

SleepingTalk 不提供由开发者运营的聊天后端。API Key 和应用设置保存在用户设备的 `localStorage` 中；聊天会话、消息及本地保留的附件原件保存在浏览器 IndexedDB 中。

用户发起请求后，对话内容及请求所需附件会直接发送到用户配置的 API Provider。语音输入会把录制的音频发送到应用配置的 DeepSeek 语音识别接口；语音朗读可能把助手回复文本发送到 DeepSeek 语音合成接口。目前这两个语音接口使用应用的 DeepSeek API 服务配置。

第三方 Provider 自行决定其数据处理、保留期限和隐私实践。上传到 Provider 的文件可能依据其政策继续保留。SleepingTalk 没有用于自动上传聊天记录或 API Key 的遥测或统计代码。

清除浏览器/应用数据、移除站点数据或卸载 Android 应用，可能永久删除本地设置、API Key、会话和附件原件。本应用已禁用 Android 系统备份；这不会删除设备上现存的数据，也不影响 API Provider 持有的副本。

用户应妥善保管 API Key，只使用可信的 API Provider，并优先选择 HTTPS 地址。HTTP 地址可能使 API Key 和请求内容暴露给能够观察网络流量的第三方。本地或局域网 HTTP 地址也可能被浏览器或 Android WebView 的安全规则阻止。
