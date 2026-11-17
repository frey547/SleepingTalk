import { create } from 'zustand'
import type { TtsVoice } from './api/speech.js'
import { normalizeLocation, type UserLocation } from './location.js'

export type Locale = 'zh-CN' | 'en-US'

/** 主题偏好；默认跟随系统 */
export type ThemePreference = 'light' | 'dark' | 'system'

export type ApiProviderId = 'deepseek' | 'openai'

export type OpenAIConfig = {
  baseUrl: string
  apiKey: string | null
  model: string
}

/** 本机设置，存 localStorage：API Key、语言、主题、位置、朗读音色、深度思考与智能搜索开关、侧边栏收起状态 */
type Settings = {
  apiProvider: ApiProviderId
  /** DeepSeek 官方 API Key。保留字段名以兼容现有调用和本地配置。 */
  apiKey: string | null
  openAI: OpenAIConfig
  locale: Locale
  themePreference: ThemePreference
  location: UserLocation | null
  ttsVoice: TtsVoice
  thinking: boolean
  search: boolean
  siderCollapsed: boolean
}

const KEYS = {
  apiProvider: 'chat-demo:api-provider',
  apiKey: 'chat-demo:api-key',
  openAIBaseUrl: 'chat-demo:openai:base-url',
  openAIApiKey: 'chat-demo:openai:api-key',
  openAIModel: 'chat-demo:openai:model',
  locale: 'chat-demo:locale',
  location: 'chat-demo:location',
  themePreference: 'chat-demo:theme-preference',
  ttsVoice: 'chat-demo:tts-voice',
  thinking: 'chat-demo:thinking',
  search: 'chat-demo:search',
  siderCollapsed: 'chat-demo:sider-collapsed',
} as const

const read = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const write = (key: string, value: string | null) => {
  try {
    if (value === null) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, value)
    }
  } catch {
    // 存储不可用时只在内存中生效
  }
}

/** 位置选择模式跟随浏览器语言，与应用内选择的界面语言无关。 */
export const isChineseBrowser = (): boolean =>
  (typeof navigator === 'undefined' ? 'zh' : navigator.language).toLowerCase().startsWith('zh')

const initialLocale = (): Locale => {
  const saved = read(KEYS.locale)
  if (saved === 'zh-CN' || saved === 'en-US') {
    return saved
  }
  return isChineseBrowser() ? 'zh-CN' : 'en-US'
}

const initialLocation = (): UserLocation | null => {
  try {
    const location = normalizeLocation(JSON.parse(read(KEYS.location) ?? 'null'))
    if (!location) {
      return null
    }
    return isChineseBrowser()
      ? location.region === 'CN' && location.province
        ? location
        : null
      : { region: location.region }
  } catch {
    return null
  }
}

/** 未保存过时跟随系统 */
const initialThemePreference = (): ThemePreference => {
  const saved = read(KEYS.themePreference)
  return saved === 'light' || saved === 'dark' ? saved : 'system'
}

/** 未保存过时使用服务端默认音色 stella（海星） */
const initialTtsVoice = (): TtsVoice => (read(KEYS.ttsVoice) === 'tide' ? 'tide' : 'stella')

export const useSettings = create<Settings>(() => ({
  apiProvider: read(KEYS.apiProvider) === 'openai' ? 'openai' : 'deepseek',
  apiKey: read(KEYS.apiKey),
  openAI: {
    baseUrl: read(KEYS.openAIBaseUrl) ?? 'https://api.siliconflow.com/v1',
    apiKey: read(KEYS.openAIApiKey),
    model: read(KEYS.openAIModel) ?? '',
  },
  locale: initialLocale(),
  location: initialLocation(),
  themePreference: initialThemePreference(),
  ttsVoice: initialTtsVoice(),
  thinking: read(KEYS.thinking) === 'true',
  search: read(KEYS.search) === 'true',
  siderCollapsed: read(KEYS.siderCollapsed) === 'true',
}))

export const setLocale = (locale: Locale) => {
  write(KEYS.locale, locale)
  useSettings.setState({ locale })
}

export const setLocation = (value: UserLocation | null) => {
  const location = normalizeLocation(value)
  write(KEYS.location, location ? JSON.stringify(location) : null)
  useSettings.setState({ location })
}

export const setThemePreference = (themePreference: ThemePreference) => {
  write(KEYS.themePreference, themePreference)
  useSettings.setState({ themePreference })
}

export const setTtsVoice = (ttsVoice: TtsVoice) => {
  write(KEYS.ttsVoice, ttsVoice)
  useSettings.setState({ ttsVoice })
}

export const setApiKey = (apiKey: string | null) => {
  write(KEYS.apiKey, apiKey)
  useSettings.setState({ apiKey })
}

export const setApiProvider = (apiProvider: ApiProviderId) => {
  write(KEYS.apiProvider, apiProvider)
  useSettings.setState({ apiProvider })
}

export const setOpenAIConfig = (openAI: OpenAIConfig) => {
  const normalized = {
    baseUrl: openAI.baseUrl.trim().replace(/\/+$/, ''),
    apiKey: openAI.apiKey?.trim() || null,
    model: openAI.model.trim(),
  }
  write(KEYS.openAIBaseUrl, normalized.baseUrl)
  write(KEYS.openAIApiKey, normalized.apiKey)
  write(KEYS.openAIModel, normalized.model)
  useSettings.setState({ openAI: normalized })
}

export const hasActiveApiConfig = (settings = useSettings.getState()): boolean =>
  settings.apiProvider === 'deepseek'
    ? Boolean(settings.apiKey)
    : Boolean(settings.openAI.baseUrl && settings.openAI.apiKey && settings.openAI.model)

export const setThinking = (thinking: boolean) => {
  write(KEYS.thinking, String(thinking))
  useSettings.setState({ thinking })
}

export const setSearch = (search: boolean) => {
  write(KEYS.search, String(search))
  useSettings.setState({ search })
}

export const setSiderCollapsed = (siderCollapsed: boolean) => {
  write(KEYS.siderCollapsed, String(siderCollapsed))
  useSettings.setState({ siderCollapsed })
}
