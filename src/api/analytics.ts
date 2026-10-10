export type AnalyticsCommand = [string, ...unknown[]]
export type AnalyticsVisit = { origin: string; pathname: string; search: string; hash: string; key: string }
export type Consent = 'granted' | 'denied' | null
export type AnalyticsPort = {
  production: boolean
  siteId: string
  consent: () => Consent
  load: (id: string, commands: AnalyticsCommand[], ready: () => void, failed: () => void) => void
  send: (command: AnalyticsCommand) => void
  enabled: (value: boolean) => void
}

export function publicAnalyticsPath(visit: AnalyticsVisit): string | null {
  if (visit.origin !== 'https://chenxujie-bolg.cn' || visit.search || visit.hash) return null
  if (['/', '/about', '/archive', '/tags', '/privacy'].includes(visit.pathname)) return visit.pathname
  return /^\/posts\/[a-zA-Z0-9_-]+$/.test(visit.pathname) ? visit.pathname : null
}

export function createAnalytics(port: AnalyticsPort) {
  let state: 'idle' | 'loading' | 'ready' | 'failed' = 'idle'
  let active = false
  let current: AnalyticsVisit | null = null
  let lastVisit: string | null = null
  let pending: string[] = []
  const eligible = () => port.production && /^[a-f0-9]{32}$/.test(port.siteId)
    && port.consent() === 'granted' && current !== null && publicAnalyticsPath(current) !== null
  function stop() {
    pending = []
    if (active) {
      active = false
      lastVisit = null
      port.enabled(false)
    }
  }
  function sync() {
    if (!eligible()) { stop(); return }
    if (state === 'failed') return
    if (!active) {
      active = true
      if (state !== 'idle') port.enabled(true)
    }
    const path = publicAnalyticsPath(current!)!
    const identity = `${current!.key}:${path}`
    if (identity === lastVisit) return
    lastVisit = identity
    if (state === 'ready') { port.send(['_trackPageview', path]); return }
    pending.push(path)
    if (state === 'loading') return
    state = 'loading'
    port.load(port.siteId, [['_setAutoPageview', false], ['_setAutoEventTracking', false]], () => {
      if (state !== 'loading') return
      state = 'ready'
      if (!eligible()) { stop(); return }
      for (const page of pending) port.send(['_trackPageview', page])
      pending = []
    }, () => { if (state === 'loading') { state = 'failed'; pending = [] } })
  }
  return {
    visit(visit: AnalyticsVisit) { current = visit; sync() },
    consentChanged() { sync() },
  }
}
