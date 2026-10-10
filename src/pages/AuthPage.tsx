import { Alert, Button, Card, Form, Input, Tabs, message } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { isAxiosError } from 'axios'
import { emailLogin, passwordLogin, register, sendEmailCode } from '../api/auth'
import { setSession, useSession } from '../api/session'
import { Navigate, useNavigate } from 'react-router-dom'
import { PageMeta } from '../components/PageMeta'

type Values = { email: string; code: string; nickname?: string; password: string }
function errorMessage(error: unknown) {
  if (isAxiosError<{ message?: string }>(error)) return error.response?.data?.message ?? (import.meta.env.DEV
    ? '本地后端不可用或请求超时，流程已停止。请检查127.0.0.1:8080上的后端和本地PostgreSQL。'
    : '请求失败，请稍后重试')
  return error instanceof Error ? error.message : '操作失败，请重试'
}
function AuthForm({ mode }: { mode: 'login' | 'register' | 'password' }) {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm<Values>()
  const [sending, setSending] = useState(false)
  const [waiting, setWaiting] = useState(0)
  const cooldownUntil = useRef(0)
  const [sendResult, setSendResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const busy = useRef(false)
  useEffect(() => {
    if (!waiting) return
    const timer = window.setTimeout(() => setWaiting(Math.max(0, Math.ceil((cooldownUntil.current - Date.now()) / 1000))), 1000)
    return () => clearTimeout(timer)
  }, [waiting])
  const send = async () => {
    if (busy.current || waiting) return
    try { await form.validateFields(['email']) } catch { return }
    if (busy.current) return
    busy.current = true; setSending(true); setSendResult(null)
    cooldownUntil.current = Date.now() + 60000; setWaiting(60)
    try {
      await sendEmailCode(form.getFieldValue('email'))
      cooldownUntil.current = Date.now() + 60000; setWaiting(60)
      setSendResult({ type: 'success', text: '验证码发送请求已受理，请查收邮箱；若未收到，请检查垃圾邮件。' })
    } catch (error) { setSendResult({ type: 'error', text: errorMessage(error) }) }
    finally { busy.current = false; setSending(false) }
  }
  const submit = async (values: Values) => {
    setSubmitting(true)
    try {
      const response = mode === 'login' ? await emailLogin(values.email, values.code)
        : mode === 'password' ? await passwordLogin(values.email, values.password)
        : await register(values.email, values.code, values.nickname ?? '读者', values.password)
      setSession({ accessToken: '', user: response.data.data.user })
      message.success('登录成功'); navigate('/admin/posts')
    } catch (error) { message.error(errorMessage(error)) } finally { setSubmitting(false) }
  }
  return <Form form={form} layout="vertical" onFinish={submit}>
    <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}><Input placeholder="you@example.com" /></Form.Item>
    {mode === 'register' && <Form.Item name="nickname" label="昵称" rules={[{ required: true }]}><Input maxLength={80} /></Form.Item>}
    {mode !== 'login' && <Form.Item name="password" label="密码" rules={[{ required: true, min: 8, max: 72, message: '请输入8至72字符密码' }, { validator: (_, value) => !value || new TextEncoder().encode(value).length <= 72 ? Promise.resolve() : Promise.reject(new Error('密码不能超过72个UTF-8字节')) }]}><Input.Password autoComplete={mode === 'register' ? 'new-password' : 'current-password'} /></Form.Item>}
    {mode !== 'password' && <Form.Item label="邮箱验证码" htmlFor={`${mode}-code`} required>
      <div className="flex items-start gap-2">
        <Form.Item name="code" noStyle rules={[{ required: true, pattern: /^[0-9]{6}$/, message: '请输入 6 位验证码' }]}>
          <Input id={`${mode}-code`} className="min-w-0 flex-1" inputMode="numeric" autoComplete="one-time-code" maxLength={6} />
        </Form.Item>
        <Button className="shrink-0" loading={sending} disabled={sending || waiting > 0} onClick={() => void send()}>{waiting ? `${waiting}秒后重试` : '获取验证码'}</Button>
      </div>
    </Form.Item>}
    {mode !== 'password' && sendResult && <Alert className="mb-4" type={sendResult.type} showIcon message={sendResult.text} />}
    <Button htmlType="submit" loading={submitting} type="primary" block>{mode === 'register' ? '注册' : '登录'}</Button>
  </Form>
}
export function AuthPage() {
  const session = useSession()
  const [mode, setMode] = useState('password')
  if (session) return <Navigate to="/admin/posts" replace />
  return <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10"><PageMeta title="登录或注册" />
    {import.meta.env.DEV && <Alert className="mb-4" type="info" showIcon message="本地开发模式" description="密码登录只需本地后端和数据库。邮箱验证码与极验默认停用，验证码登录及注册会提示中止，不会模拟成功。" />}
    <Card title="欢迎来到 CXJ Blog"><p>登录状态保留 24 小时，公共设备使用后请退出登录。</p><Tabs activeKey={mode} onChange={setMode} items={[
      { key: 'password', label: '密码登录', children: <AuthForm mode="password" /> },
      { key: 'login', label: '验证码登录', children: <AuthForm mode="login" /> },
      { key: 'register', label: '注册', children: <AuthForm mode="register" /> },
    ]} />{mode !== 'password' && <Alert style={{ marginTop: 24 }} type="info" showIcon message={mode === 'register' ? '邮箱验证码注册' : '邮箱验证码登录'} description="获取验证码需先完成人机验证。验证时将加载极验第三方服务；请勿向他人透露邮箱验证码。" />}</Card>
  </section>
}
