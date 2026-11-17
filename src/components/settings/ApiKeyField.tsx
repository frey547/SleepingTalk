import { useState } from 'react'
import { ApiError } from '../../services/api/client.js'
import { isHttpOpenAIBaseUrl } from '../../services/api/openai.js'
import { classifyApiError } from '../../services/api/errors.js'
import { verifyProvider, type ProviderConfig } from '../../services/api/providers.js'
import {
  setApiKey,
  setApiProvider,
  setOpenAIConfig,
  useSettings,
  type ApiProviderId,
} from '../../services/settings.js'
import { useTranslate } from '../../i18n/index.js'
import { Button } from '../base/Button.js'
import { Select } from '../base/Select.js'
import styles from './Settings.module.css'

export const useApiKeyEditor = () => {
  const savedDeepSeekKey = useSettings((state) => state.apiKey)
  const savedOpenAI = useSettings((state) => state.openAI)
  const [deepSeekKey, setDeepSeekKey] = useState('')
  const [openAIKey, setOpenAIKey] = useState('')
  const [baseUrl, setBaseUrl] = useState(savedOpenAI.baseUrl)
  const [model, setModel] = useState(savedOpenAI.model)
  const [verifying, setVerifying] = useState(false)
  const [failure, setFailure] = useState<unknown>(null)
  return {
    savedDeepSeekKey,
    savedOpenAI,
    deepSeekKey,
    setDeepSeekKey,
    openAIKey,
    setOpenAIKey,
    baseUrl,
    setBaseUrl,
    model,
    setModel,
    verifying,
    setVerifying,
    failure,
    setFailure,
  }
}

type ApiKeyEditor = ReturnType<typeof useApiKeyEditor>

const maskApiKey = (apiKey: string) => {
  const normalized = apiKey.trim()
  if (normalized.length <= 5) {
    return '*'.repeat(normalized.length)
  }
  return `${normalized.slice(0, 3)}...${normalized.slice(-2)}`
}

const describeFailure = (error: unknown, apiKey: string, t: ReturnType<typeof useTranslate>) => {
  const headline =
    classifyApiError(error) === 'unauthorized'
      ? t('apiKeyInvalid')
      : classifyApiError(error) === 'network'
        ? t('commonNetworkErrorToast')
        : t('apiKeyVerificationFailed', {
            message:
              error instanceof ApiError && error.localMessage
                ? t(error.localMessage.key, error.localMessage.params)
                : error instanceof Error
                  ? error.message
                  : String(error),
          })
  if (!(error instanceof ApiError)) {
    return headline
  }
  const key = apiKey.trim()
  return [
    headline,
    `${t('apiDiagnosticUrl')}: ${error.requestUrl ?? '-'}`,
    `${t('apiDiagnosticStatus')}: ${error.status ?? '-'}`,
    `${t('apiDiagnosticKey')}: ${key ? t('apiDiagnosticKeyPresent') : t('apiDiagnosticKeyEmpty')}, ${t('apiDiagnosticKeyLength')}: ${key.length}, ${maskApiKey(key)}`,
    `${t('apiDiagnosticResponse')}: ${error.responseBody ?? error.message}`,
  ].join('\n')
}

/** 当前服务商及其独立连接配置。密钥只保存在浏览器 localStorage。 */
export const ApiKeyField = ({ editor }: { editor: ApiKeyEditor }) => {
  const t = useTranslate()
  const provider = useSettings((state) => state.apiProvider)
  const {
    savedDeepSeekKey,
    savedOpenAI,
    deepSeekKey,
    setDeepSeekKey,
    openAIKey,
    setOpenAIKey,
    baseUrl,
    setBaseUrl,
    model,
    setModel,
    verifying,
    setVerifying,
    failure,
    setFailure,
  } = editor
  const key =
    provider === 'deepseek' ? deepSeekKey || savedDeepSeekKey : openAIKey || savedOpenAI.apiKey
  const normalizedKey = key?.trim() ?? ''
  const complete =
    provider === 'deepseek'
      ? Boolean(normalizedKey)
      : Boolean(baseUrl.trim() && normalizedKey && model.trim())

  const save = async () => {
    if (!complete || !normalizedKey || verifying) {
      return
    }
    const config: ProviderConfig =
      provider === 'deepseek'
        ? { id: 'deepseek', apiKey: normalizedKey }
        : { id: 'openai', baseUrl: baseUrl.trim(), apiKey: normalizedKey, model: model.trim() }
    setVerifying(true)
    setFailure(null)
    try {
      await verifyProvider(config)
      if (config.id === 'deepseek') {
        setApiKey(normalizedKey)
        setDeepSeekKey('')
      } else {
        setOpenAIConfig(config)
        setOpenAIKey('')
      }
    } catch (error) {
      setFailure(error)
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className={styles.providerSection}>
      <div className={styles.providerRow}>
        <label className={styles.label}>{t('apiProvider')}</label>
        <Select<ApiProviderId>
          ariaLabel={t('apiProvider')}
          value={provider}
          options={[
            { value: 'deepseek', label: t('apiProviderDeepSeek') },
            { value: 'openai', label: t('apiProviderOpenAI') },
          ]}
          onChange={(value) => {
            setFailure(null)
            setApiProvider(value)
          }}
        />
      </div>
      {provider === 'openai' ? (
        <label className={styles.configField}>
          <span>{t('openAIBaseUrl')}</span>
          <input
            type="url"
            value={baseUrl}
            placeholder="https://api.siliconflow.com/v1"
            autoComplete="url"
            spellCheck={false}
            onChange={(event) => setBaseUrl(event.target.value)}
          />
          {isHttpOpenAIBaseUrl(baseUrl) ? (
            <span className={styles.warning} role="alert">
              {t('openAIHttpWarning')}
            </span>
          ) : null}
        </label>
      ) : null}
      <label className={styles.configField}>
        <span>{t('apiKey')}</span>
        <input
          type="password"
          value={provider === 'deepseek' ? deepSeekKey : openAIKey}
          placeholder={key ? t('apiKeySavedPlaceholder') : t('apiKeyPlaceholder')}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) =>
            provider === 'deepseek'
              ? setDeepSeekKey(event.target.value)
              : setOpenAIKey(event.target.value)
          }
        />
      </label>
      {provider === 'openai' ? (
        <label className={styles.configField}>
          <span>{t('openAIModel')}</span>
          <input
            value={model}
            placeholder={t('openAIModelPlaceholder')}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => setModel(event.target.value)}
          />
        </label>
      ) : null}
      {failure ? (
        <div className={styles.error}>{describeFailure(failure, normalizedKey, t)}</div>
      ) : null}
      <div className={styles.providerActions}>
        <span className={styles.description}>{t('apiConfigLocalOnly')}</span>
        <Button size="m" disabled={!complete || verifying} onClick={() => void save()}>
          {t(verifying ? 'apiKeyVerifying' : 'confirm')}
        </Button>
      </div>
    </div>
  )
}
