import { Alert, Button, Card, Form, Input, Tabs, message } from 'antd'
import { useState } from 'react'
import { emailLogin, register, sendEmailCode } from '../api/auth'
import { PageMeta } from '../components/PageMeta'
import { FeatureUnavailable } from '../components/FeatureUnavailable'

type Values = { email: string; code: string; nickname?: string }
export function AuthPage() {
  const [sending, setSending] = useState(false); const [waiting, setWaiting] = useState(0)
  const send = async (email: string) => { setSending(true); try { await sendEmailCode(email); message.success('验证码已发送，请查收邮箱') } catch { message.warning('验证码服务尚未接入后端；请完成后端 auth 接口后重试') } finally { setSending(false); setWaiting(60); const timer = setInterval(() => setWaiting(v => { if (v <= 1) { clearInterval(timer); return 0 }; return v - 1 }), 1000) } }
  const submit = async (mode: 'login' | 'register', values: Values) => { try { mode === 'login' ? await emailLogin(values.email, values.code) : await register(values.email, values.code, values.nickname ?? '读者'); message.success('操作成功') } catch { message.error('认证后端接口尚不可用，操作未完成') } }
  const form = (mode: 'login' | 'register') => <Form layout="vertical" onFinish={(v: Values) => submit(mode, v)}><Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}><Input placeholder="you@example.com" /></Form.Item>{mode === 'register' && <Form.Item name="nickname" label="昵称" rules={[{ required: true }]}><Input maxLength={80} /></Form.Item>}<Form.Item name="code" label="邮箱验证码" rules={[{ required: true, len: 6, message: '请输入 6 位验证码' }]}><Input addonAfter={<Button type="link" disabled={sending || waiting > 0} onClick={() => { const email = (document.querySelector('input[placeholder="you@example.com"]') as HTMLInputElement)?.value; if (email) void send(email); else message.info('请先填写邮箱') }}>{waiting ? `${waiting}s` : '获取验证码'}</Button>} /></Form.Item><Button htmlType="submit" type="primary" block>{mode === 'login' ? '登录' : '注册'}</Button></Form>
  return <section className="mx-auto max-w-md"><PageMeta title="登录或注册" /><FeatureUnavailable feature="极验人机验证" detail="验证码发送前的极验组件等待极验 Site Key 与后端二次校验接口，当前不会绕过验证直接登录。" /><Card title="欢迎来到 CXJ Blog"><Tabs items={[{ key: 'login', label: '登录', children: form('login') }, { key: 'register', label: '注册', children: form('register') }]} /><Alert className="mt-4" type="info" showIcon message="邮箱验证码登录" description="不保存密码。正式上线前请接入验证码限流、极验服务端校验及 HttpOnly Cookie 会话。" /></Card></section>
}
