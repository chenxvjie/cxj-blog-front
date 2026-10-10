import { useEffect, useState, type ReactNode } from 'react'
import { Alert, Button } from 'antd'
import { isAxiosError } from 'axios'
import { client } from '../api/client'
import { getSession, setSession } from '../api/session'

let restoration: Promise<void> | null = null
function restore() {
  return restoration ??= client.get('/auth/me').then(response => {
    if (!getSession()) setSession({ accessToken: '', user: response.data.data })
  }).catch(error => {
    if (!isAxiosError(error) || error.response?.status !== 401) { restoration = null; throw error }
  })
}
export function SessionBootstrap({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    void restore().then(() => { if (active) setState('ready') }, () => { if (active) setState('error') })
    return () => { active = false }
  }, [attempt])
  if (state === 'loading') return <p className="p-12 text-center">正在恢复登录状态…</p>
  if (state === 'error') return <><Alert type="warning" message="登录状态暂时无法恢复，可以继续浏览或重试" action={<Button onClick={() => { setState('loading'); setAttempt(v => v + 1) }}>重试</Button>} />{children}</>
  return children
}
