import { Capacitor } from '@capacitor/core'

/** 生产环境注册 PWA。开发环境保持无 Service Worker，避免缓存干扰热更新。 */
export const registerServiceWorker = (): void => {
  if (
    Capacitor.isNativePlatform() ||
    !__PWA_ENABLED__ ||
    typeof navigator === 'undefined' ||
    !('serviceWorker' in navigator)
  ) {
    return
  }

  window.addEventListener('load', () => {
    const serviceWorkerUrl = new URL(
      `sw.js?v=${encodeURIComponent(__APP_VERSION__)}`,
      document.baseURI
    )
    void navigator.serviceWorker.register(serviceWorkerUrl, { scope: './' }).catch(() => undefined)
  })
}
