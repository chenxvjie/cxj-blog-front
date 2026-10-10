import { Alert, Button, Card, Form, Input, List, Modal, Pagination, Popconfirm, Space, Table, Tabs, Tag, message } from 'antd'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { PageMeta } from '../components/PageMeta'
import { errorText } from '../api/errors'
import { client } from '../api/client'
import { useSession } from '../api/session'
import { uploadImage } from '../api/images'

export function ManagementLinks() {
  const location = useLocation(); const navigate = useNavigate()
  return <><PageMeta title="文章管理" /><h1 className="mb-6 text-3xl">文章管理</h1><Tabs activeKey={location.pathname} onChange={key => navigate(key)} items={[{ key: '/admin/posts', label: '文章与投稿' }, { key: '/admin/media', label: '我的图片' }, { key: '/admin/editor', label: '新建文章' }]} /></>
}
export function Guard({ children, admin = false }: { children: React.ReactNode; admin?: boolean }) {
  const session = useSession()
  if (!session) return <Navigate to="/auth" replace />
  if (admin && session.user.role !== 'ADMIN') return <Alert type="warning" message="仅管理员可访问" />
  return <>{children}</>
}
export function MediaPage() { return <Guard><section className="page-fill"><ManagementLinks /><MediaLibrary /></section></Guard> }
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
  return <section className="page-fill"><p>图片链接可公开访问。为避免文章图片失效，暂不提供删除入口。</p><input hidden ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void upload(f) }} /><Button loading={busy} onClick={() => input.current?.click()}>上传图片</Button>{q.isError && <Alert type="error" message={errorText(q.error)} />}<List className="flex-1" loading={q.isLoading} dataSource={q.data?.records} renderItem={f => <List.Item><Space wrap><img className="h-20 w-24 object-contain" src={f.publicUrl} alt={f.originalName} /><span>{f.originalName} · {Math.ceil(f.sizeBytes / 1024)} KB</span><a href={f.publicUrl} target="_blank" rel="noreferrer">查看图片</a><Button onClick={() => void navigator.clipboard.writeText(f.publicUrl).then(() => message.success('链接已复制'), () => message.error('复制失败，请从图片地址栏复制'))}>复制链接</Button></Space></List.Item>} /><Pagination current={page} total={q.data?.total} pageSize={20} onChange={setPage} /></section>
}
type Term = { id: number; name: string; slug: string; count: number }
export function TaxonomyPage() { return <TaxonomyView /> }
export function TaxonomyView() {
  const session = useSession(); const admin = session?.user.role === 'ADMIN'
  const cache = useQueryClient()
  const [editing, setEditing] = useState<{ kind: string; term?: Term } | null>(null)
  const [pages, setPages] = useState({ categories: 1, tags: 1 })
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const q = useQuery({ queryKey: ['taxonomy'], queryFn: async () => (await client.get('/taxonomy')).data.data as Record<'categories' | 'tags', Term[]> })
  return <section className="page-fill taxonomy-page"><h1 className="mb-8 text-3xl">分类与标签</h1>{q.isError && <Alert type="error" message={errorText(q.error)} />}<div className="taxonomy-panels">{(['categories', 'tags'] as const).map(kind => <Card key={kind} className="taxonomy-panel" title={kind === 'categories' ? '分类' : '标签'}><Table className="fill-table" rowKey="id" loading={q.isLoading} dataSource={q.data?.[kind]} pagination={{ current: pages[kind], onChange: page => setPages(v => ({ ...v, [kind]: page })), pageSize: 5, showSizeChanger: false, position: ['bottomRight'] }} scroll={{ x: 450 }} columns={[
    { title: '序号', width: 70, render: (_, __, index) => (pages[kind] - 1) * 5 + index + 1 }, { title: '名称', dataIndex: 'name', render: (name, t: Term) => <Link to={`/?${kind === 'categories' ? 'category' : 'tag'}=${t.id}`}>{name}</Link> }, { title: '使用次数', dataIndex: 'count' }, { title: '操作', render: (_, t: Term) => admin ? <Space><Button size="small" onClick={() => { setEditing({ kind, term: t }); form.setFieldsValue(t) }}>编辑</Button><Popconfirm title="删除后不再展示此项？" onConfirm={async () => { try { await client.delete(`/admin/taxonomy/${kind}/${t.id}`); await cache.invalidateQueries() } catch (e) { message.error(errorText(e)) } }}><Button size="small" danger>删除</Button></Popconfirm></Space> : <Link to={`/?${kind === 'categories' ? 'category' : 'tag'}=${t.id}`}>查看文章</Link> }
  ]} />{admin && <Button className="mt-5" type="dashed" block onClick={() => { setEditing({ kind }); form.resetFields() }}>新增{kind === 'categories' ? '分类' : '标签'}</Button>}</Card>)}</div>
    <Modal open={!!editing} title={`${editing?.term ? '编辑' : '新增'}${editing?.kind === 'categories' ? '分类' : '标签'}`} footer={null} onCancel={() => setEditing(null)} destroyOnHidden><Form form={form} layout="vertical" onFinish={async v => { if (!editing) return; setSaving(true); try { const path = `/admin/taxonomy/${editing.kind}`; if (editing.term) await client.put(`${path}/${editing.term.id}`, v); else await client.post(path, v); await cache.invalidateQueries(); setEditing(null); setPages(v => ({ ...v, [editing.kind]: 1 })); message.success('已保存') } catch (e) { message.error(errorText(e)) } finally { setSaving(false) } }}><Form.Item name="name" label="名称" rules={[{ required: true }]}><Input maxLength={80} /></Form.Item><Form.Item name="slug" label="链接标识" rules={[{ required: true, pattern: /^[A-Za-z0-9_-]+$/ }]}><Input maxLength={120} placeholder="例如 spring-boot" /></Form.Item><Button htmlType="submit" type="primary" loading={saving}>保存</Button></Form></Modal>
  </section>
}
export function UsersPage() { return <Guard admin><Users /></Guard> }
function Users() {
  const [page, setPage] = useState(1)
  const cache = useQueryClient()
  const q = useQuery({ queryKey: ['users', page], queryFn: async () => (await client.get('/admin/users', { params: { page } })).data.data as { id: number; email: string; nickname: string; role: string; status: string }[] })
  return <section className="page-fill"><PageMeta title="用户管理" /><h1 className="mb-6 text-3xl">用户管理</h1><p>管理员由服务器维护，此处只能启用或停用普通用户。</p>{q.isError && <Alert type="error" message={errorText(q.error)} />}<Table className="flex-1" rowKey="id" scroll={{ x: 650 }} pagination={false} dataSource={q.data} columns={[{ title: '昵称', dataIndex: 'nickname' }, { title: '邮箱', dataIndex: 'email' }, { title: '角色', dataIndex: 'role' }, { title: '状态', dataIndex: 'status' }, { title: '操作', render: (_, u: { id: number; role: string; status: string }) => u.role !== 'ADMIN' && <Popconfirm title={u.status === 'ACTIVE' ? '停用账号并撤销其登录会话？' : '重新启用账号？'} onConfirm={async () => { try { await client.put(`/admin/users/${u.id}/status`, { active: u.status !== 'ACTIVE' }); await cache.invalidateQueries() } catch (e) { message.error(errorText(e)) } }}><Button>{u.status === 'ACTIVE' ? '停用' : '启用'}</Button></Popconfirm> }]} /><Space className="mt-4"><Button disabled={page === 1} onClick={() => setPage(page - 1)}>上一页</Button><span>{page}</span><Button disabled={(q.data?.length ?? 0) < 50} onClick={() => setPage(page + 1)}>下一页</Button></Space></section>
}
export function ModerationPage() { return <Guard admin><Moderation /></Guard> }
function Moderation() {
  const [page, setPage] = useState(1)
  const cache = useQueryClient()
  const q = useQuery({ queryKey: ['comments-admin', page], queryFn: async () => (await client.get('/admin/comments', { params: { page } })).data.data as { id: number; post_id: number; nickname: string; content: string; status: string; reports: number }[] })
  return <section className="page-fill"><PageMeta title="评论审核" /><h1 className="mb-6 text-3xl">评论审核与举报</h1>{q.isError && <Alert type="error" message={errorText(q.error)} />}<List className="flex-1" loading={q.isLoading} dataSource={q.data} renderItem={c => <List.Item><Card className="w-full" title={`${c.nickname} · 文章 ${c.post_id} · ${c.status === 'APPROVED' ? '公开' : c.status === 'PENDING' ? '历史待审核' : '已下架'}`}><p className="whitespace-pre-wrap">{c.content}</p>{Number(c.reports) > 0 && <Tag color="red" className="mb-4">被举报 · {c.reports} 条</Tag>}<Space wrap>{[true, false].map(approved => <Button key={String(approved)} onClick={async () => { try { await client.post(`/admin/comments/${c.id}/review`, { approved }); await cache.invalidateQueries() } catch (e) { message.error(errorText(e)) } }}>{approved ? '恢复／保留公开' : '下架评论'}</Button>)}{Number(c.reports) > 0 && <><Button onClick={async () => { try { const r = await client.get(`/admin/comments/${c.id}/reports`); message.info(r.data.data.map((v: { reason: string }) => v.reason).join('；'), 10) } catch (e) { message.error(errorText(e)) } }}>查看 {c.reports} 条举报</Button><Popconfirm title="消除当前举报标记？评论公开状态不变。" onConfirm={async () => { try { await client.post(`/admin/comments/${c.id}/reports/resolve`); await cache.invalidateQueries(); message.success('举报已消除') } catch (e) { message.error(errorText(e)) } }}><Button>消除举报</Button></Popconfirm></>}</Space></Card></List.Item>} /><Space><Button disabled={page === 1} onClick={() => setPage(page - 1)}>上一页</Button><span>{page}</span><Button disabled={(q.data?.length ?? 0) < 50} onClick={() => setPage(page + 1)}>下一页</Button></Space></section>
}
