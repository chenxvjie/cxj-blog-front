import { Alert, Button, Card, Form, Input, Tabs, message } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { isAxiosError } from 'axios'
import { emailLogin, register, sendEmailCode } from '../api/auth'
import { PageMeta } from '../components/PageMeta'

type Values = { email: string; code: string; nickname?: string }
function errorMessage(error: unknown) {
  if (isAxiosError<{ message?: string }>(error)) return error.response?.data?.message ?? '请求失败，请稍后重试'
  return error instanceof Error ? error.message : '操作失败，请重试'
}
function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const [form] = Form.useForm<Values>()
  const [sending, setSending] = useState(false)
  const [waiting, setWaiting] = useState(0)
  const busy = useRef(false)
  useEffect(() => {
    if (!waiting) return
    const timer = window.setTimeout(() => setWaiting(waiting - 1), 1000)
    return () => clearTimeout(timer)
  }, [waiting])
  const send = async () => {
    if (busy.current || waiting) return
    try { await form.validateFields(['email']) } catch { return }
    if (busy.current) return
    busy.current = true; setSending(true)
    try {
      await sendEmailCode(form.getFieldValue('email'))
      message.success('验证码已发送，请查收邮箱'); setWaiting(60)
    } catch (error) { message.warning(errorMessage(error)) }
    finally { busy.current = false; setSending(false) }
  }
  const submit = async (values: Values) => {
    try {
      if (mode === 'login') await emailLogin(values.email, values.code)
      else await register(values.email, values.code, values.nickname ?? '读者')
      message.success('操作成功')
    } catch (error) { message.error(errorMessage(error)) }
  }
  return <Form form={form} layout="vertical" onFinish={submit}>
    <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}><Input placeholder="you@example.com" /></Form.Item>
    {mode === 'register' && <Form.Item name="nickname" label="昵称" rules={[{ required: true }]}><Input maxLength={80} /></Form.Item>}
    <Form.Item name="code" label="邮箱验证码" rules={[{ required: true, pattern: /^[0-9]{6}$/, message: '请输入 6 位验证码' }]}>
      <Input addonAfter={<Button type="link" loading={sending} disabled={sending || waiting > 0} onClick={() => void send()}>{waiting ? `${waiting}s` : '获取验证码'}</Button>} />
    </Form.Item>
    <Button htmlType="submit" type="primary" block>{mode === 'login' ? '登录' : '注册'}</Button>
  </Form>
}
export function AuthPage() {
  return <section className="mx-auto max-w-md"><PageMeta title="登录或注册" />
    <Card title="欢迎来到 CXJ Blog"><Tabs items={[
      { key: 'login', label: '登录', children: <AuthForm mode="login" /> },
      { key: 'register', label: '注册', children: <AuthForm mode="register" /> },
    ]} /><Alert className="mt-4" type="info" showIcon message="邮箱验证码登录" description="获取验证码需先完成人机验证。验证时将加载极验第三方服务；请勿向他人透露邮箱验证码。" /></Card>
  </section>
}
