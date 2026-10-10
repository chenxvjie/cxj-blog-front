import { createAnalytics, type AnalyticsCommand, type Consent } from './analytics'

declare global {
  interface Window { _hmt?: { push: (command: AnalyticsCommand) => unknown } }
}
const consentKey = 'analytics-consent'
const changed = 'analytics-consent-changed'
const preferences = 'analytics-preferences-open'
let memoryConsent: Consent = null
let memoryOverride = false

export function analyticsConsent(): Consent {
  if (memoryOverride) return memoryConsent
  try {
    const value = localStorage.getItem(consentKey)
    return value === 'granted' || value === 'denied' ? value : null
  } catch { return memoryConsent }
}
export function subscribeAnalyticsConsent(listener: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key === consentKey || event.key === null) { memoryOverride = false; listener() }
  }
  window.addEventListener(changed, listener)
  window.addEventListener('storage', storage)
  return () => { window.removeEventListener(changed, listener); window.removeEventListener('storage', storage) }
}
export function setAnalyticsConsent(value: Exclude<Consent, null>) {
  memoryConsent = value
  try { localStorage.setItem(consentKey, value); memoryOverride = false } catch { memoryOverride = true }
  baidu.consentChanged()
  window.dispatchEvent(new Event(changed))
}
export function openAnalyticsPreferences() { window.dispatchEvent(new Event(preferences)) }
export function subscribeAnalyticsPreferences(listener: () => void) {
  window.addEventListener(preferences, listener)
  return () => window.removeEventListener(preferences, listener)
}

export const baidu = createAnalytics({
  production: !import.meta.env.DEV,
  siteId: import.meta.env.VITE_BAIDU_ANALYTICS_ID ?? '',
  consent: analyticsConsent,
  load(id, commands, ready, failed) {
    window._hmt = commands
    const script = document.createElement('script')
    script.id = 'baidu-analytics'
    script.async = true
    script.referrerPolicy = 'no-referrer'
    script.onload = ready
    script.onerror = () => { script.remove(); failed() }
    try {
      script.src = `https://hm.baidu.com/hm.js?${id}`
      document.head.appendChild(script)
    } catch { failed() }
  },
  send(command) { try { window._hmt?.push(command) } catch { /* Analytics must not break the blog. */ } },
  enabled(value) {
    // Disable SDK collection as well as our own PV calls. Clearing the pending
    // array also handles revocation while the third-party script is in flight.
    if (Array.isArray(window._hmt)) {
      window._hmt.length = 0
      window._hmt.push(['_setAutoPageview', false])
      window._hmt.push(['_setAutoEventTracking', false])
    }
    try { window._hmt?.push(['_setAutoTracking', value]) } catch { /* Do not affect editing or login. */ }
  },
})
