import { paginationOptions } from '../api/pagination'
import { Alert, Button, Card, Checkbox, Form, Input, List, Modal, Pagination, Popconfirm, Space, Table, Tabs, Tag, message } from 'antd'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { PageMeta } from '../components/PageMeta'
import { errorText } from '../api/errors'
import { client } from '../api/client'
import { getSession, useSession } from '../api/session'
import { uploadImage } from '../api/images'

export function ManagementLinks() {
  const session = useSession()
  const location = useLocation(); const navigate = useNavigate()
  return <><PageMeta title="文章管理" /><h1 className="mb-6 text-3xl">文章管理</h1><Tabs activeKey={location.pathname} onChange={key => navigate(key)} items={[{ key: '/admin/posts', label: '文章与投稿' }, { key: '/admin/media', label: session?.user.role === 'ADMIN' ? '图片管理' : '我的图片' }, { key: '/admin/editor', label: '新建文章' }]} /></>
}
export function Guard({ children, admin = false }: { children: React.ReactNode; admin?: boolean }) {
  const session = useSession()
  if (!session) return <Navigate to="/auth" replace />
  if (admin && session.user.role !== 'ADMIN') return <Alert type="warning" message="仅管理员可访问" />
  return <>{children}</>
}
export function MediaPage() { const session = useSession(); return <Guard><section className="page-fill"><ManagementLinks /><MediaLibrary key={`${session?.user.id}-${session?.user.role}`} /></section></Guard> }
function MediaLibrary() {
  const session = useSession()!
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [selected, setSelected] = useState<number[]>([])
  const [deleting, setDeleting] = useState(false)
  const [deleteErrors, setDeleteErrors] = useState<string[]>([])
  const deleteLock = useRef(false)
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [session])
  const cache = useQueryClient()
  const q = useQuery({ queryKey: ['images', session.user.id, page, pageSize], queryFn: async () => (await client.get('/manage/images', { params: { page, size: pageSize, paginated: true } })).data.data as { records: { id: number; publicUrl: string; originalName: string; sizeBytes: number; uploaderName?: string }[]; total: number } })
  const upload = async (file: File) => {
    if (controller.current) return
    const task = new AbortController(); controller.current = task; setBusy(true)
    try { await uploadImage(file, task.signal); await cache.invalidateQueries({ queryKey: ['images'] }); message.success('图片上传成功') } catch (e) { if (!task.signal.aborted) message.error(errorText(e)) } finally { controller.current = null; setBusy(false) }
  }
  const records = q.data?.records ?? []
  const chosen = records.filter(f => selected.includes(f.id))
  const removeSelected = async () => {
    if (deleteLock.current || !chosen.length) return
    deleteLock.current = true; setDeleting(true); setDeleteErrors([])
    const failed: number[] = []; const errors: string[] = []; let removed = 0
    try {
      for (const file of chosen) {
        const current = getSession()
        if (current?.user.id !== session.user.id || current.user.role !== 'ADMIN') { errors.push('登录身份已变化，已停止删除'); break }
        try { await client.delete(`/manage/images/${file.id}`); removed++ }
        catch (e) { failed.push(file.id); errors.push(`${file.originalName}：${errorText(e)}`) }
      }
      setSelected(failed); setDeleteErrors(errors)
      if (removed) {
        message.success(`已删除 ${removed} 张图片`)
        const lastPage = Math.max(1, Math.ceil(((q.data?.total ?? 0) - removed) / pageSize))
        if (page > lastPage) setPage(lastPage)
        await cache.invalidateQueries({ queryKey: ['images'] })
      }
    } finally { deleteLock.current = false; setDeleting(false) }
  }
  return <section className="page-fill"><p>{session.user.role === 'ADMIN' ? '查看全部用户上传的图片；正在被文章、投稿或头像使用的图片需先解除引用再删除。' : '图片链接可公开访问，此处展示你上传的图片。'}</p><input hidden ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void upload(f) }} /><Button className="self-start" disabled={deleting} loading={busy} onClick={() => input.current?.click()}>上传图片</Button>{session.user.role === 'ADMIN' && <Space wrap className="my-3"><Checkbox disabled={deleting || q.isFetching || !records.length} checked={!!records.length && chosen.length === records.length} indeterminate={chosen.length > 0 && chosen.length < records.length} onChange={e => setSelected(e.target.checked ? records.map(f => f.id) : [])}>全选当前页</Checkbox><span>已选 {chosen.length} 张</span><Popconfirm title={`确认删除选中的 ${chosen.length} 张图片？`} description="将删除存储中的原图，此操作无法撤销；被引用的图片会保留。" disabled={deleting || !chosen.length} onConfirm={removeSelected}><Button type="link" danger loading={deleting} disabled={!chosen.length || busy || q.isFetching}>删除选中</Button></Popconfirm></Space>}{deleteErrors.length > 0 && <Alert className="mb-3" type="warning" message="部分图片未删除" description={<ul>{deleteErrors.map((error, index) => <li key={index}>{error}</li>)}</ul>} closable onClose={() => setDeleteErrors([])} />}{q.isError && <Alert type="error" message={errorText(q.error)} />}<List className="viewport-list flex-1" loading={q.isLoading} dataSource={q.data?.records} renderItem={f => <List.Item><Space wrap>{session.user.role === 'ADMIN' && <Checkbox aria-label={`选择图片 ${f.originalName}`} checked={selected.includes(f.id)} disabled={deleting || q.isFetching} onChange={e => setSelected(ids => e.target.checked ? [...ids, f.id] : ids.filter(id => id !== f.id))} />}<img className="h-20 w-24 object-contain" src={f.publicUrl} alt={f.originalName} /><span>{f.originalName} · {Math.ceil(f.sizeBytes / 1024)} KB{session.user.role === 'ADMIN' && ` · 上传者：${f.uploaderName ?? '未知用户'}`}</span><a href={f.publicUrl} target="_blank" rel="noreferrer">查看图片</a><Button type="link" onClick={() => void navigator.clipboard.writeText(f.publicUrl).then(() => message.success('链接已复制'), () => message.error('复制失败，请从图片地址栏复制'))}>复制链接</Button>{session.user.role === 'ADMIN' && <Popconfirm disabled={deleting} title="确认删除图片？" description="将删除存储中的原图，CDN缓存可能延迟失效，此操作无法撤销。" onConfirm={async () => { try { await client.delete(`/manage/images/${f.id}`); if (q.data?.records.length === 1 && page > 1) setPage(page - 1); await cache.invalidateQueries({ queryKey: ['images'] }); message.success('图片已删除') } catch (e) { message.error(errorText(e)) } }}><Button type="link" danger disabled={deleting}>删除</Button></Popconfirm>}</Space></List.Item>} /><Pagination disabled={deleting} current={page} total={q.data?.total} {...paginationOptions} pageSize={pageSize} onChange={(v, size) => { setSelected([]); setDeleteErrors([]); setPageSize(size); setPage(size === pageSize ? v : 1) }} /></section>
}
type Term = { id: number; name: string; slug: string; count: number }
export function TaxonomyPage() { return <TaxonomyView /> }
export function TaxonomyView() {
  const session = useSession(); const admin = session?.user.role === 'ADMIN'
  const cache = useQueryClient()
  const [editing, setEditing] = useState<{ kind: string; term?: Term } | null>(null)
  const [sizes, setSizes] = useState({ categories: 5, tags: 5 })
  const [pages, setPages] = useState({ categories: 1, tags: 1 })
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const q = useQuery({ queryKey: ['taxonomy'], queryFn: async () => (await client.get('/taxonomy')).data.data as Record<'categories' | 'tags', Term[]> })
  return <section className="page-fill taxonomy-page"><h1 className="mb-8 text-3xl">分类与标签</h1>{q.isError && <Alert type="error" message={errorText(q.error)} />}<div className="taxonomy-panels">{(['categories', 'tags'] as const).map(kind => <Card key={kind} className="taxonomy-panel" title={kind === 'categories' ? '分类' : '标签'}><Table className="fill-table" rowKey="id" loading={q.isLoading} dataSource={q.data?.[kind]} pagination={{ current: pages[kind], ...paginationOptions, pageSizeOptions: [5, 10, 20, 50], onChange: (page, size) => { setPages(v => ({ ...v, [kind]: size === sizes[kind] ? page : 1 })); setSizes(v => ({ ...v, [kind]: size })) }, pageSize: sizes[kind], position: ['bottomRight'] }} scroll={{ x: 450 }} columns={[
    { title: '序号', width: 70, render: (_, __, index) => (pages[kind] - 1) * sizes[kind] + index + 1 }, { title: '名称', dataIndex: 'name', render: (name, t: Term) => <Link to={`/?${kind === 'categories' ? 'category' : 'tag'}=${t.id}`}>{name}</Link> }, { title: '使用次数', dataIndex: 'count' }, { title: '操作', width: 180, render: (_, t: Term) => admin ? <Space><Button type="link" size="small" onClick={() => { setEditing({ kind, term: t }); form.setFieldsValue(t) }}>编辑</Button><Popconfirm title="删除后不再展示此项？" onConfirm={async () => { try { await client.delete(`/admin/taxonomy/${kind}/${t.id}`); await cache.invalidateQueries() } catch (e) { message.error(errorText(e)) } }}><Button type="link" size="small" danger>删除</Button></Popconfirm></Space> : <Link to={`/?${kind === 'categories' ? 'category' : 'tag'}=${t.id}`}>查看文章</Link> }
  ]} />{admin && <Button className="mt-5" type="dashed" block onClick={() => { setEditing({ kind }); form.resetFields() }}>新增{kind === 'categories' ? '分类' : '标签'}</Button>}</Card>)}</div>
    <Modal open={!!editing} title={`${editing?.term ? '编辑' : '新增'}${editing?.kind === 'categories' ? '分类' : '标签'}`} footer={null} onCancel={() => setEditing(null)} destroyOnHidden><Form form={form} layout="vertical" onFinish={async v => { if (!editing) return; setSaving(true); try { const path = `/admin/taxonomy/${editing.kind}`; if (editing.term) await client.put(`${path}/${editing.term.id}`, v); else await client.post(path, v); await cache.invalidateQueries(); setEditing(null); setPages(v => ({ ...v, [editing.kind]: 1 })); message.success('已保存') } catch (e) { message.error(errorText(e)) } finally { setSaving(false) } }}><Form.Item name="name" label="名称" rules={[{ required: true }]}><Input maxLength={80} /></Form.Item><Form.Item name="slug" label="链接标识" rules={[{ required: true, pattern: /^[A-Za-z0-9_-]+$/ }]}><Input maxLength={120} placeholder="例如 spring-boot" /></Form.Item><Button htmlType="submit" type="primary" loading={saving}>保存</Button></Form></Modal>
  </section>
}
export function UsersPage() { return <Guard admin><Users /></Guard> }
function Users() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const cache = useQueryClient()
  const q = useQuery({ queryKey: ['users', page, pageSize], queryFn: async () => (await client.get('/admin/users', { params: { page, size: pageSize, paginated: true } })).data.data as { records: { id: number; email: string; nickname: string; role: string; status: string }[]; total: number } })
  return <section className="page-fill"><PageMeta title="用户管理" /><h1 className="mb-6 text-3xl">用户管理</h1><p>管理员由服务器维护，此处只能启用或停用普通用户。</p>{q.isError && <Alert type="error" message={errorText(q.error)} />}<Table className="fill-table flex-1" rowKey="id" scroll={{ x: 650 }} pagination={false} dataSource={q.data?.records} columns={[{ title: '昵称', dataIndex: 'nickname' }, { title: '邮箱', dataIndex: 'email' }, { title: '角色', dataIndex: 'role', render: (role: string) => ({ ADMIN: '管理员', USER: '普通用户' }[role] ?? '未知角色') }, { title: '状态', dataIndex: 'status', render: (status: string) => ({ ACTIVE: '正常', DISABLED: '已停用' }[status] ?? '未知状态') }, { title: '操作', width: 120, render: (_, u: { id: number; role: string; status: string }) => u.role !== 'ADMIN' && <Popconfirm title={u.status === 'ACTIVE' ? '停用账号并撤销其登录会话？' : '重新启用账号？'} onConfirm={async () => { try { await client.put(`/admin/users/${u.id}/status`, { active: u.status !== 'ACTIVE' }); await cache.invalidateQueries() } catch (e) { message.error(errorText(e)) } }}><Button type="link">{u.status === 'ACTIVE' ? '停用' : '启用'}</Button></Popconfirm> }]} /><Pagination {...paginationOptions} current={page} pageSize={pageSize} total={q.data?.total ?? 0} onChange={(v, size) => { setPageSize(size); setPage(size === pageSize ? v : 1) }} /></section>
}
export function ModerationPage() { return <Guard admin><Moderation /></Guard> }
function Moderation() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [reportComment, setReportComment] = useState<number | null>(null)
  const [changing, setChanging] = useState<number | null>(null)
  const cache = useQueryClient()
  const q = useQuery({ queryKey: ['comments-admin', page, pageSize, search], queryFn: async () => (await client.get('/admin/comments', { params: { page, size: pageSize, paginated: true, q: search } })).data.data as { records: { id: number; post_id: number; nickname: string; content: string; status: string; reports: number }[]; total: number } })
  const reports = useQuery({ queryKey: ['comment-reports', reportComment], enabled: reportComment !== null, queryFn: async () => (await client.get(`/admin/comments/${reportComment}/reports`)).data.data as { reason: string; created_at: string }[] })
  return <section className="page-fill"><PageMeta title="评论审核" /><h1 className="mb-6 text-3xl">评论审核与举报</h1><div className="mb-5"><Input.Search className="max-w-md" aria-label="搜索评论内容或用户昵称" placeholder="搜索评论内容或用户昵称" maxLength={100} allowClear onSearch={value => { setSearch(value.trim()); setPage(1) }} /></div>{q.isError && <Alert type="error" message={errorText(q.error)} />}<List className="viewport-list flex-1" loading={q.isLoading} dataSource={q.data?.records} renderItem={c => <List.Item><Card className="w-full" extra={Number(c.reports) > 0 ? <Tag color="red" style={{ marginInlineEnd: 0 }}>被举报</Tag> : null} title={`${c.nickname} · 文章 ${c.post_id} · ${c.status === 'APPROVED' ? '公开' : c.status === 'PENDING' ? '历史待审核' : '已下架'}`}>
    <p className="whitespace-pre-wrap break-words">{c.content}</p>
    <div className="mt-4 flex justify-end"><Space wrap><Button type="link" loading={changing === c.id} disabled={changing !== null && changing !== c.id} onClick={async () => { setChanging(c.id); try { await client.post(`/admin/comments/${c.id}/review`, { approved: c.status !== 'APPROVED' }); await cache.invalidateQueries() } catch (e) { message.error(errorText(e)) } finally { setChanging(null) } }}>{c.status === 'APPROVED' ? '下架评论' : c.status === 'PENDING' ? '审核通过' : '取消下架'}</Button>{Number(c.reports) > 0 && <><Button type="link" onClick={() => setReportComment(c.id)}>查看 {c.reports} 条举报</Button><Popconfirm title="消除当前举报标记？评论公开状态不变。" onConfirm={async () => { try { await client.post(`/admin/comments/${c.id}/reports/resolve`); await cache.invalidateQueries(); message.success('举报已消除') } catch (e) { message.error(errorText(e)) } }}><Button type="link">消除举报</Button></Popconfirm></>}</Space></div>
  </Card></List.Item>} /><Pagination {...paginationOptions} current={page} pageSize={pageSize} total={q.data?.total ?? 0} onChange={(v, size) => { setPageSize(size); setPage(size === pageSize ? v : 1) }} />
    <Modal open={reportComment !== null} title="举报详情" footer={<Button onClick={() => setReportComment(null)}>关闭</Button>} onCancel={() => setReportComment(null)}>
      {reports.isError ? <Alert type="error" message={errorText(reports.error)} action={<Button onClick={() => void reports.refetch()}>重试</Button>} /> : <List loading={reports.isFetching} dataSource={reports.data} locale={{ emptyText: '暂无未处理举报' }} renderItem={(r, index) => <List.Item className="!block"><p className="mb-2 text-sm text-gray-500">举报 {index + 1} · {new Date(r.created_at).toLocaleString()}</p><p className="whitespace-pre-wrap break-words">{r.reason}</p></List.Item>} />}
    </Modal>
  </section>
}
