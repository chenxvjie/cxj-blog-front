import { Alert, Button, Form, Input, Select, Space, Table, message } from 'antd'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import { PostActions } from '../components/PostActions'
import { canManagePost } from '../api/permissions'
import { client } from '../api/client'
import { setSession, useSession } from '../api/session'
import { postPayload, type EditablePost as Post } from '../api/postEditor'

function reason(error: unknown) { return isAxiosError(error) ? error.response?.data?.message ?? '后端不可用，操作已停止' : '操作失败，请重试' }
export function AdminPosts() {
  const session = useSession()
  const [page, setPage] = useState(1)
  const query = useQuery({ queryKey: ['managed-posts', session?.user.id, page], enabled: !!session, queryFn: async () => (await client.get('/manage/posts', { params: { page, size: 10 } })).data.data as { records: Post[]; total: number } })
  if (!session) return <Navigate to="/auth" replace />
  const logout = async () => { try { await client.post('/auth/logout'); setSession(null) } catch (error) { message.error(reason(error)) } }
  return <section><h1 className="mb-4 text-2xl">{session.user.role === 'ADMIN' ? '全部文章管理' : '我的文章'}</h1>
    <Space className="mb-4"><span>{session.user.nickname}</span><Link to="/admin/editor">新建文章</Link><Button onClick={() => void logout()}>退出登录</Button></Space>
    {query.isError && <Alert type="error" showIcon message={reason(query.error)} />}
    <Table rowKey="id" loading={query.isLoading} dataSource={query.data?.records ?? []} pagination={{ current: page, total: query.data?.total ?? 0, pageSize: 10, onChange: setPage }} columns={[
      { title: '标题', dataIndex: 'title' }, { title: '状态', dataIndex: 'status' },
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
  const query = useQuery({ queryKey: ['edit-post', session?.user.id, id], enabled: !!session && !!id, queryFn: async () => (await client.get(`/manage/posts/${id}`)).data.data as Post })
  useEffect(() => { if (query.data) form.setFieldsValue(query.data); else form.resetFields() }, [query.data, form])
  if (!session) return <Navigate to="/auth" replace />
  if (id && query.isError) return <Alert type="error" message={reason(query.error)} />
  if (id && query.isLoading) return <p>加载文章中…</p>
  if (id && !canManagePost(session.user, query.data)) return <Alert type="warning" showIcon message="无权编辑此文章" description="普通用户只能编辑自己的文章。" />
  const save = async (values: Post) => { setSaving(true); try { const payload = postPayload(values, query.data); if (id) await client.put(`/manage/posts/${id}`, payload); else await client.post('/manage/posts', payload); await cache.invalidateQueries(); message.success('文章已保存'); navigate('/admin/posts') } catch (error) { message.error(reason(error)) } finally { setSaving(false) } }
  return <section><Link to="/admin/posts">返回文章管理</Link><h1 className="my-4 text-2xl">{id ? '编辑文章' : '新建文章'}</h1><Form form={form} layout="vertical" initialValues={{ status: 'DRAFT' }} onFinish={save}>
    <Form.Item name="title" label="标题" rules={[{ required: true }]}><Input maxLength={200} /></Form.Item>
    <Form.Item name="slug" label="文章链接标识" rules={[{ required: true }, { pattern: /^[a-zA-Z0-9_-]+$/, message: '仅使用字母、数字、下划线或短横线' }]}><Input maxLength={240} /></Form.Item>
    <Form.Item name="summary" label="摘要"><Input.TextArea maxLength={500} /></Form.Item>
    <Form.Item name="contentMd" label="正文（Markdown）" rules={[{ required: true }]}><Input.TextArea rows={18} /></Form.Item>
    <Form.Item name="status" label="状态"><Select options={[{ value: 'DRAFT', label: '草稿' }, { value: 'PUBLISHED', label: '发布' }, { value: 'OFFLINE', label: '下线' }]} /></Form.Item>
    <Button htmlType="submit" type="primary" loading={saving}>保存</Button>
  </Form></section>
}
