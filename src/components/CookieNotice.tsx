import { Button } from 'antd'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { analyticsConsent, setAnalyticsConsent, subscribeAnalyticsConsent, subscribeAnalyticsPreferences } from '../api/baidu'

export function CookieNotice() {
  const consent = useSyncExternalStore(subscribeAnalyticsConsent, analyticsConsent)
  const [opened, setOpened] = useState(false)
  useEffect(() => subscribeAnalyticsPreferences(() => setOpened(true)), [])
  if (consent !== null && !opened) return null
  const choose = (value: 'granted' | 'denied') => { setOpened(false); setAnalyticsConsent(value) }
  return <aside aria-label="访问统计偏好" className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-3xl flex-wrap items-center gap-4 rounded-xl bg-slate-900 p-4 text-sm text-white shadow-xl">
    <span className="flex-1">同意后，本站通过百度统计了解访问量、访客数与公开页面表现。拒绝不影响使用。<Link className="ml-2 underline" to="/privacy">隐私说明</Link></span>
    <Button size="small" onClick={() => choose('denied')}>拒绝</Button>
    <Button size="small" type="primary" onClick={() => choose('granted')}>同意</Button>
    {opened && <Button size="small" onClick={() => setOpened(false)}>关闭</Button>}
  </aside>
}
