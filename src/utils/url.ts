export type SafeHttpUrlOptions = {
  /** Markdown previously accepted bare domains; API-provided URLs must leave this disabled. */
  assumeHttps?: boolean
}

/** Returns an absolute HTTP(S) URL, or undefined for invalid and unsafe protocols. */
export const safeHttpUrl = (
  value: string,
  { assumeHttps = false }: SafeHttpUrlOptions = {}
): string | undefined => {
  const input = value.trim()
  if (!input) {
    return undefined
  }

  try {
    const url = new URL(assumeHttps && !/^[a-z][a-z\d+.-]*:/i.test(input) ? `https://${input}` : input)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined
  } catch {
    return undefined
  }
}

/** Opens only validated external HTTP(S) URLs in an isolated tab. */
export const openExternalUrl = (value: string): boolean => {
  const url = safeHttpUrl(value)
  if (!url) {
    return false
  }
  window.open(url, '_blank', 'noopener,noreferrer')
  return true
}
