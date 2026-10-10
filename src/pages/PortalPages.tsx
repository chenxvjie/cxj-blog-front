import { Alert, Button, Card, Form, Input, List, Pagination, Popconfirm, Select, Space, Table, message } from 'antd'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { errorText } from '../api/errors'
import { client } from '../api/client'
import { setSession, useSession } from '../api/session'
import { uploadImage } from '../api/images'

export function ManagementLinks() {
  const session = useSession()
  return <Space wrap className="mb-5"><Link to="/admin/posts">文章与投稿</Link><Link to="/profile">个人资料</Link><Link to="/admin/media">我的图片</Link>{session?.user.role === 'ADMIN' && <><Link to="/admin/taxonomy">分类标签</Link><Link to="/admin/comments">评论审核</Link><Link to="/admin/users">用户管理</Link><Link to="/admin/settings">站点设置</Link></>}</Space>
}
export function Guard({ children, admin = false }: { children: React.ReactNode; admin?: boolean }) {
  const session = useSession()
  if (!session) return <Navigate to="/auth" replace />
  if (admin && session.user.role !== 'ADMIN') return <Alert type="warning" message="仅管理员可访问" />
  return <><ManagementLinks />{children}</>
}
export function ProfilePage() { return <Guard><ProfileForm /></Guard> }
function ProfileForm() {
  const session = useSession()!
  const [form] = Form.useForm()
  const [busy, setBusy] = useState(false)
  const q = useQuery({ queryKey: ['profile', session.user.id], queryFn: async () => (await client.get('/manage/profile')).data.data })
  useEffect(() => { if (q.data) form.setFieldsValue(q.data) }, [q.data, form])
  const save = async (v: { nickname: string; avatarUrl?: string; bio?: string }) => {
    setBusy(true); try { await client.put('/manage/profile', v); setSession({ ...session, user: { ...session.user, nickname: v.nickname } }); message.success('资料已保存') } catch (e) { message.error(errorText(e)) } finally { setBusy(false) }
  }
  return <section className="max-w-xl"><h1 className="text-2xl">个人资料</h1>{q.isError && <Alert type="error" message={errorText(q.error)} />}<Form form={form} layout="vertical" onFinish={save}>
    <Form.Item name="nickname" label="昵称" rules={[{ required: true }]}><Input maxLength={80} /></Form.Item>
    <Form.Item name="avatarUrl" label="头像 HTTPS 地址" rules={[{ pattern: /^$|^https:\/\/\S+$/, message: '请输入 HTTPS 图片地址' }]}><Input maxLength={1024} /></Form.Item>
    <Form.Item name="bio" label="个人简介"><Input.TextArea maxLength={500} /></Form.Item><Button htmlType="submit" type="primary" loading={busy}>保存资料</Button>
  </Form><h2 className="mt-8 text-xl">修改密码</h2><Form layout="vertical" onFinish={async v => {
    try { await client.put('/manage/password', v); setSession(null); message.success('密码已修改，所有会话已退出，请重新登录') } catch (e) { message.error(errorText(e)) }
  }}><Form.Item name="currentPassword" label="当前密码" rules={[{ required: true }]}><Input.Password autoComplete="current-password" /></Form.Item><Form.Item name="newPassword" label="新密码" rules={[{ required: true, min: 8 }]}><Input.Password autoComplete="new-password" maxLength={72} /></Form.Item><Button htmlType="submit">修改密码并退出登录</Button></Form></section>
}
export function MediaPage() { return <Guard><MediaLibrary /></Guard> }
function MediaLibrary() {
  const session = useSession()!
  const [page, setPage] = useState(1)
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [session])
  const cache = useQueryClient()
  const q = useQuery({ queryKey: ['images', session.user.id, page], queryFn: async () => (await client.get('/manage/images', { params: { page } })).data.data as { records: { id: number; publicUrl: string; originalName: string; sizeBytes: number }[]; total: number } })
  const upload = async (file: File) => {
    if (controller.current) return
    const task = new AbortController(); controller.current = task; setBusy(true)
    try { await uploadImage(file, task.signal); await cache.invalidateQueries({ queryKey: ['images'] }); message.success('图片上传成功') } catch (e) { if (!task.signal.aborted) message.error(errorText(e)) } finally { controller.current = null; setBusy(false) }
  }
  return <section><h1 className="text-2xl">我的图片</h1><p>图片链接可公开访问。为避免文章图片失效，暂不提供删除入口。</p><input hidden ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void upload(f) }} /><Button loading={busy} onClick={() => input.current?.click()}>上传图片</Button>{q.isError && <Alert type="error" message={errorText(q.error)} />}<List loading={q.isLoading} dataSource={q.data?.records} renderItem={f => <List.Item><Space wrap><img className="h-20 w-24 object-contain" src={f.publicUrl} alt={f.originalName} /><span>{f.originalName} · {Math.ceil(f.sizeBytes / 1024)} KB</span><a href={f.publicUrl} target="_blank" rel="noreferrer">查看图片</a><Button onClick={() => void navigator.clipboard.writeText(f.publicUrl).then(() => message.success('链接已复制'), () => message.error('复制失败，请从图片地址栏复制'))}>复制链接</Button></Space></List.Item>} /><Pagination current={page} total={q.data?.total} pageSize={20} onChange={setPage} /></section>
}
type Term = { id: number; name: string; slug: string }
export function TaxonomyPage() { return <Guard admin><Taxonomy /></Guard> }
function Taxonomy() {
  const [kind, setKind] = useState<'categories' | 'tags'>('categories')
  const [editing, setEditing] = useState<number | null>(null)
  const [form] = Form.useForm()
  const cache = useQueryClient()
  const q = useQuery({ queryKey: ['taxonomy'], queryFn: async () => (await client.get('/taxonomy')).data.data as Record<'categories' | 'tags', Term[]> })
  return <section><h1 className="text-2xl">分类与标签</h1><Select value={kind} options={[{ value: 'categories', label: '分类' }, { value: 'tags', label: '标签' }]} onChange={v => { setKind(v); setEditing(null); form.resetFields() }} />{q.isError && <Alert type="error" message={errorText(q.error)} />}<Form form={form} layout="inline" className="my-5" onFinish={async v => { try { if (editing) await client.put(`/admin/taxonomy/${kind}/${editing}`, v); else await client.post(`/admin/taxonomy/${kind}`, v); setEditing(null); form.resetFields(); await cache.invalidateQueries(); message.success('已保存') } catch (e) { message.error(errorText(e)) } }}><Form.Item name="name" rules={[{ required: true }]}><Input placeholder="名称" maxLength={80} /></Form.Item><Form.Item name="slug" rules={[{ required: true, pattern: /^[A-Za-z0-9_-]+$/ }]}><Input placeholder="链接标识" maxLength={120} /></Form.Item><Button htmlType="submit" type="primary">{editing ? '保存修改' : '创建'}</Button>{editing && <Button onClick={() => { setEditing(null); form.resetFields() }}>取消</Button>}</Form><Table rowKey="id" dataSource={q.data?.[kind]} columns={[{ title: '名称', dataIndex: 'name' }, { title: '链接标识', dataIndex: 'slug' }, { title: '操作', render: (_, t: Term) => <Space><Button onClick={() => { setEditing(t.id); form.setFieldsValue(t) }}>编辑</Button><Popconfirm title="删除后不再展示此分类或标签？" onConfirm={async () => { try { await client.delete(`/admin/taxonomy/${kind}/${t.id}`); await cache.invalidateQueries() } catch (e) { message.error(errorText(e)) } }}><Button danger>删除</Button></Popconfirm></Space> }]} /></section>
}
export function SettingsPage() { return <Guard admin><Settings /></Guard> }
function Settings() {
  const [form] = Form.useForm()
  const cache = useQueryClient()
  const q = useQuery({ queryKey: ['site'], queryFn: async () => (await client.get('/site')).data.data })
  useEffect(() => { if (q.data) form.setFieldsValue(q.data) }, [q.data, form])
  return <section className="max-w-xl"><h1 className="text-2xl">站点设置</h1>{q.isError && <Alert type="error" message={errorText(q.error)} />}<Form form={form} layout="vertical" onFinish={async v => { try { await client.put('/admin/site', v); await cache.invalidateQueries({ queryKey: ['site'] }); message.success('站点设置已保存') } catch (e) { message.error(errorText(e)) } }}><Form.Item name="title" label="站点名称" rules={[{ required: true }]}><Input maxLength={100} /></Form.Item><Form.Item name="description" label="站点介绍"><Input.TextArea maxLength={500} /></Form.Item><Form.Item name="about" label="关于页面（Markdown）"><Input.TextArea rows={12} maxLength={20000} /></Form.Item><Form.Item name="contact" label="联系方式（公开展示）"><Input maxLength={320} /></Form.Item><Button htmlType="submit" type="primary">保存</Button></Form></section>
}
export function UsersPage() { return <Guard admin><Users /></Guard> }
function Users() {
  const [page, setPage] = useState(1)
  const cache = useQueryClient()
  const q = useQuery({ queryKey: ['users', page], queryFn: async () => (await client.get('/admin/users', { params: { page } })).data.data as { id: number; email: string; nickname: string; role: string; status: string }[] })
  return <section><h1 className="text-2xl">用户管理</h1><p>管理员由服务器维护，此处只能启用或停用普通用户。</p>{q.isError && <Alert type="error" message={errorText(q.error)} />}<Table rowKey="id" pagination={false} dataSource={q.data} columns={[{ title: '昵称', dataIndex: 'nickname' }, { title: '邮箱', dataIndex: 'email' }, { title: '角色', dataIndex: 'role' }, { title: '状态', dataIndex: 'status' }, { title: '操作', render: (_, u: { id: number; role: string; status: string }) => u.role !== 'ADMIN' && <Popconfirm title={u.status === 'ACTIVE' ? '停用账号并撤销其登录会话？' : '重新启用账号？'} onConfirm={async () => { try { await client.put(`/admin/users/${u.id}/status`, { active: u.status !== 'ACTIVE' }); await cache.invalidateQueries() } catch (e) { message.error(errorText(e)) } }}><Button>{u.status === 'ACTIVE' ? '停用' : '启用'}</Button></Popconfirm> }]} /><Space className="mt-4"><Button disabled={page === 1} onClick={() => setPage(page - 1)}>上一页</Button><span>{page}</span><Button disabled={(q.data?.length ?? 0) < 50} onClick={() => setPage(page + 1)}>下一页</Button></Space></section>
}
export function ModerationPage() { return <Guard admin><Moderation /></Guard> }
function Moderation() {
  const [page, setPage] = useState(1)
  const cache = useQueryClient()
  const q = useQuery({ queryKey: ['comments-admin', page], queryFn: async () => (await client.get('/admin/comments', { params: { page } })).data.data as { id: number; post_id: number; nickname: string; content: string; status: string; reports: number }[] })
  return <section><h1 className="text-2xl">评论审核与举报</h1>{q.isError && <Alert type="error" message={errorText(q.error)} />}<List loading={q.isLoading} dataSource={q.data} renderItem={c => <List.Item><Card className="w-full" title={`${c.nickname} · 文章 ${c.post_id} · ${c.status}`}><p className="whitespace-pre-wrap">{c.content}</p><Space wrap>{[true, false].map(approved => <Button key={String(approved)} onClick={async () => { try { await client.post(`/admin/comments/${c.id}/review`, { approved }); await cache.invalidateQueries() } catch (e) { message.error(errorText(e)) } }}>{approved ? '通过／保留' : '拒绝／隐藏'}</Button>)}{Number(c.reports) > 0 && <Button onClick={async () => { try { const r = await client.get(`/admin/comments/${c.id}/reports`); message.info(r.data.data.map((v: { reason: string }) => v.reason).join('；'), 10) } catch (e) { message.error(errorText(e)) } }}>查看 {c.reports} 条举报</Button>}</Space></Card></List.Item>} /><Space><Button disabled={page === 1} onClick={() => setPage(page - 1)}>上一页</Button><span>{page}</span><Button disabled={(q.data?.length ?? 0) < 50} onClick={() => setPage(page + 1)}>下一页</Button></Space></section>
}
