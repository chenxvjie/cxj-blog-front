import { Alert, Button, Form, Input, Select, Space, Table, Switch, message } from 'antd'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { isAxiosError } from 'axios'
import { PostActions } from '../components/PostActions'
import { canManagePost } from '../api/permissions'
import { client } from '../api/client'
import { getSession, setSession, useSession } from '../api/session'
import { imageMarkdown, uploadImage } from '../api/images'
import { postPayload, type EditablePost as Post } from '../api/postEditor'
import { ArticleMarkdown } from '../components/ArticleMarkdown'
import { ManagementLinks } from './PortalPages'
import { PageMeta } from '../components/PageMeta'

const labels: Record<string, string> = { DRAFT: '草稿', PENDING: '待审核', REJECTED: '已退回', PUBLISHED: '已发布', OFFLINE: '已下线' }

function reason(error: unknown) { return isAxiosError(error) ? error.response?.data?.message ?? '后端不可用，操作已停止' : error instanceof Error ? error.message : '操作失败，请重试' }
export function AdminPosts() {
  const session = useSession()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<string | undefined>()
  const query = useQuery({ queryKey: ['managed-posts', session?.user.id, page, status], enabled: !!session, queryFn: async () => (await client.get('/manage/posts', { params: { page, size: 10, status } })).data.data as { records: Post[]; total: number } })
  if (!session) return <Navigate to="/auth" replace />
  const logout = async () => { try { await client.post('/auth/logout'); setSession(null) } catch (error) { message.error(reason(error)) } }
  return <section><PageMeta title={session.user.role === 'ADMIN' ? '全部文章管理' : '我的投稿'} /><h1 className="mb-4 text-2xl">{session.user.role === 'ADMIN' ? '全部文章管理' : '我的投稿'}</h1>
    <ManagementLinks />
    <Select className="mb-4 min-w-36" placeholder="全部状态" allowClear value={status} onChange={v => { setStatus(v); setPage(1) }} options={Object.entries(labels).map(([value, label]) => ({ value, label }))} />
    <Space className="mb-4"><span>{session.user.nickname}</span><Link to="/admin/editor">新建文章</Link><Button onClick={() => void logout()}>退出登录</Button></Space>
    {query.isError && <Alert type="error" showIcon message={reason(query.error)} />}
    <Table rowKey="id" loading={query.isLoading} dataSource={query.data?.records ?? []} pagination={{ current: page, total: query.data?.total ?? 0, pageSize: 10, onChange: setPage }} columns={[
      { title: '标题', dataIndex: 'title' }, { title: '状态', render: (_, p: Post) => <span>{labels[p.status]}{p.publicStatus === 'PUBLISHED' && p.status !== 'PUBLISHED' ? '（原版仍公开）' : ''}{p.reviewReason && <p>退回原因：{p.reviewReason}</p>}</span> },
      { title: '操作', render: (_, post: Post) => <PostActions post={post} /> },
    ]} /></section>
}
export function EditorPage() {
  const session = useSession()
  const [params] = useSearchParams()
  const id = params.get('id')
  const navigate = useNavigate()
  const cache = useQueryClient()
  const [form] = Form.useForm<Post>()
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [preview, setPreview] = useState(false)
  const [reviewReason, setReviewReason] = useState('')
  const taxonomy = useQuery({ queryKey: ['taxonomy'], queryFn: async () => (await client.get('/taxonomy')).data.data as { categories: { id: number; name: string }[]; tags: { id: number; name: string }[] } })
  const content = Form.useWatch('contentMd', form)
  const fileInput = useRef<HTMLInputElement>(null)
  const uploadController = useRef<AbortController | null>(null)
  useEffect(() => () => { uploadController.current?.abort() }, [id, session])
  const query = useQuery({ queryKey: ['edit-post', session?.user.id, id], enabled: !!session && !!id, queryFn: async () => (await client.get(`/manage/posts/${id}`)).data.data as Post })
  useEffect(() => { if (query.data) form.setFieldsValue({ ...query.data, status: session?.user.role !== 'ADMIN' && ['PUBLISHED', 'REJECTED', 'OFFLINE'].includes(query.data.status) ? 'DRAFT' : query.data.status }); else form.resetFields() }, [query.data, form, session?.user.role])
  if (!session) return <Navigate to="/auth" replace />
  if (id && query.isError) return <Alert type="error" message={reason(query.error)} />
  if (id && query.isLoading) return <p>加载文章中…</p>
  if (id && !canManagePost(session.user, query.data)) return <Alert type="warning" showIcon message="无权编辑此文章" description="普通用户只能编辑自己的文章。" />
  const admin = session.user.role === 'ADMIN'
  const pending = query.data?.status === 'PENDING'
  const readOnly = pending || (admin && !!query.data?.hasSubmission)
  const action = async (path: string, body?: unknown) => { setSaving(true); try { await client.post(`/manage/posts/${id}/${path}`, body); await cache.invalidateQueries(); message.success('操作成功') } catch (e) { message.error(reason(e)) } finally { setSaving(false) } }
  const addImage = async (file: File) => {
    if (uploadController.current || saving) return
    const controller = new AbortController()
    uploadController.current = controller
    setUploading(true); setUploadError(null)
    try {
      const url = await uploadImage(file, controller.signal)
      if (controller.signal.aborted || getSession() !== session) return
      // Read the latest body so typing during an upload is preserved.
      const body = form.getFieldValue('contentMd') ?? ''
      form.setFieldValue('contentMd', `${body}${body ? '\n\n' : ''}${imageMarkdown(url)}\n`)
      message.success('图片已上传并插入正文')
    } catch (error) {
      if (!controller.signal.aborted) setUploadError(reason(error))
    } finally {
      if (uploadController.current === controller) { uploadController.current = null; setUploading(false) }
    }
  }
  const save = async (values: Post) => { if (uploading || readOnly) return; setSaving(true); try { const payload = postPayload(values, query.data); if (id) await client.put(`/manage/posts/${id}`, payload); else await client.post('/manage/posts', payload); await cache.invalidateQueries(); message.success('文章已保存'); navigate('/admin/posts') } catch (error) { message.error(reason(error)) } finally { setSaving(false) } }
  return <section><PageMeta title={id ? '编辑文章' : '新建投稿'} /><Link to="/admin/posts">返回文章管理</Link><h1 className="my-4 text-2xl">{id ? '编辑文章' : '新建文章'}</h1>
    {query.data?.reviewReason && <Alert type="warning" message={`退回原因：${query.data.reviewReason}`} />}
    {query.data?.publicStatus === 'PUBLISHED' && !admin && <Alert type="info" message="修改另存为投稿版本，审核通过后替换公开文章。撤稿请联系管理员。" />}
    {pending && <div className="my-4"><Alert type="info" message="投稿审核中，撤回后才能编辑。" /><Space className="my-3"><Button loading={saving} onClick={() => void action('withdraw')}>撤回为草稿</Button>{admin && <Button type="primary" loading={saving} onClick={() => void action('review', { approved: true })}>审核通过并发布</Button>}</Space>{admin && <Space><Input maxLength={1000} placeholder="退回原因（必填）" value={reviewReason} onChange={e => setReviewReason(e.target.value)} /><Button danger disabled={!reviewReason.trim()} loading={saving} onClick={() => void action('review', { approved: false, reason: reviewReason })}>退回</Button></Space>}</div>}
    {readOnly && !pending && <Alert type="info" message="作者仍有草稿或退回版本，请等待作者重新提交审核。" />}
    <Form form={form} layout="vertical" disabled={readOnly} initialValues={{ status: 'DRAFT' }} onFinish={save}>
    <Form.Item name="title" label="标题" rules={[{ required: true }]}><Input maxLength={200} /></Form.Item>
    <Form.Item name="slug" label="文章链接标识（发布后固定）" rules={[{ required: true }, { pattern: /^[a-zA-Z0-9_-]+$/, message: '仅使用字母、数字、下划线或短横线' }]}><Input maxLength={240} disabled={readOnly || !!query.data?.publishedAt} /></Form.Item>
    <Form.Item name="summary" label="摘要"><Input.TextArea maxLength={500} /></Form.Item>
    <Form.Item name="categoryId" label="分类"><Select allowClear options={taxonomy.data?.categories.map(t => ({ value: t.id, label: t.name }))} onClear={() => form.setFieldValue('categoryId', null)} /></Form.Item>
    <Form.Item name="tagIds" label="标签"><Select mode="multiple" maxCount={20} options={taxonomy.data?.tags.map(t => ({ value: t.id, label: t.name }))} /></Form.Item>
    <Form.Item name="coverUrl" label="封面图片 URL"><Input placeholder="上传图片后，可将正文中的 HTTPS 图片链接复制到这里" /></Form.Item>
    {admin && <Form.Item name="isTop" label="首页置顶" valuePropName="checked"><Switch /></Form.Item>}
    <div className="mb-3">
      <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={event => {
        const file = event.target.files?.[0]; event.target.value = ''; if (file) void addImage(file)
      }} />
      <Button htmlType="button" loading={uploading} disabled={saving || readOnly} onClick={() => fileInput.current?.click()}>上传图片</Button>
      <span className="ml-3 text-sm text-gray-500">PNG、JPEG、WebP、GIF，最大 5 MB；上传后插入正文末尾。图片链接可公开访问。</span>
      {uploadError && <Alert className="mt-2" type="error" showIcon message={uploadError} />}
    </div>
    <Form.Item name="contentMd" label="正文（Markdown）" rules={[{ required: true }]}><Input.TextArea rows={18} /></Form.Item>
    <Form.Item name="status" label="状态"><Select options={readOnly ? Object.entries(labels).map(([value, label]) => ({ value, label })) : admin ? [{ value: 'DRAFT', label: '草稿' }, { value: 'PUBLISHED', label: '发布' }, { value: 'OFFLINE', label: '下线' }] : [{ value: 'DRAFT', label: '草稿' }, { value: 'PENDING', label: '提交审核' }]} /></Form.Item>
    <Button htmlType="submit" type="primary" loading={saving} disabled={uploading || readOnly}>保存</Button>
  </Form><Button className="mt-4" onClick={() => setPreview(!preview)}>{preview ? '收起预览' : '预览正文'}</Button>{preview && <div className="prose mt-4"><ArticleMarkdown content={content ?? ''} /></div>}</section>
}
