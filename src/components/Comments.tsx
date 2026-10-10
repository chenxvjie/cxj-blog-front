import { paginationOptions } from '../api/pagination'
import { Alert, Avatar, Button, Input, List, Modal, Pagination, Popconfirm, Space, message } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { client } from '../api/client'
import { useSession } from '../api/session'
import { errorText } from '../api/errors'
type Comment = { id: number; authorId: number; nickname: string; avatarUrl?: string; content: string; parentId?: number; createdAt: string }
export function Comments({ postId }: { postId: number }) {
  const session = useSession()
  const cache = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [content, setContent] = useState('')
  const [parentId, setParent] = useState<number | undefined>()
  const [busy, setBusy] = useState(false)
  const [reportId, setReport] = useState<number | null>(null)
  const [reason, setReason] = useState('')
  const [reporting, setReporting] = useState(false)
  const q = useQuery({ queryKey: ['comments', postId, page, pageSize], queryFn: async () => (await client.get(`/posts/${postId}/comments`, { params: { page, size: pageSize, paginated: true } })).data.data as { records: Comment[]; total: number } })
  const submit = async () => { setBusy(true); try { await client.post(`/manage/posts/${postId}/comments`, { content, parentId }); setContent(''); setParent(undefined); await cache.invalidateQueries({ queryKey: ['comments'] }); message.success('评论已发布') } catch (e) { message.error(errorText(e)) } finally { setBusy(false) } }
  return <section className="mt-12"><h2 className="text-xl">评论</h2>{q.isError && <Alert type="error" message={errorText(q.error)} />}<List loading={q.isLoading} dataSource={q.data?.records} locale={{ emptyText: '暂无评论' }} renderItem={(c, index) => <List.Item className="!block"><Space wrap><span className="text-gray-500">第 {(page - 1) * pageSize + index + 1} 条</span><Link to={`/authors/${c.authorId}`} aria-label={`${c.nickname}的个人主页`}><Avatar size={32} src={c.avatarUrl} icon={<UserOutlined />} /></Link><Link to={`/authors/${c.authorId}`}>{c.nickname}</Link><span>{new Date(c.createdAt).toLocaleString()}</span>{c.parentId && <span>回复 #{c.parentId}</span>}</Space><p className="whitespace-pre-wrap">{c.content}</p>{session && <div className="mt-3 flex justify-end"><Space wrap><Button type="link" size="small" onClick={() => setParent(c.id)}>回复</Button><Button type="link" size="small" onClick={() => { setReason(''); setReport(c.id) }}>举报</Button>{(session.user.id === c.authorId || session.user.role === 'ADMIN') && <Popconfirm title={session.user.id === c.authorId ? "确认撤回这条评论？撤回后不再公开显示。" : "确认删除这条评论？"} onConfirm={async () => { try { await client.delete(`/manage/comments/${c.id}`); await cache.invalidateQueries({ queryKey: ['comments'] }) } catch (e) { message.error(errorText(e)) } }}><Button type="link" danger size="small">{session.user.id === c.authorId ? '撤回' : '删除'}</Button></Popconfirm>}</Space></div>}</List.Item>} />
    <Pagination {...paginationOptions} current={page} pageSize={pageSize} total={q.data?.total ?? 0} onChange={(v, size) => { setPageSize(size); setPage(size === pageSize ? v : 1) }} />
    {session ? <div className="mt-5">{parentId && <p>正在回复 #{parentId} <Button size="small" onClick={() => setParent(undefined)}>取消回复</Button></p>}<Input.TextArea maxLength={2000} rows={4} value={content} onChange={e => setContent(e.target.value)} placeholder="友善交流，发送后公开展示" /><Button className="mt-3" type="primary" loading={busy} disabled={!content.trim()} onClick={() => void submit()}>提交评论</Button></div> : <p><Link to="/auth">登录后参与评论</Link></p>}
    <Modal open={reportId !== null} title="举报评论" okText="确认" cancelText="取消" confirmLoading={reporting} okButtonProps={{ disabled: !reason.trim() }} cancelButtonProps={{ disabled: reporting }} closable={!reporting} maskClosable={!reporting} onCancel={() => { if (!reporting) { setReport(null); setReason('') } }} onOk={async () => {
      if (reportId === null || !reason.trim() || reporting) return
      setReporting(true)
      try { await client.post(`/manage/comments/${reportId}/report`, { reason: reason.trim() }); setReport(null); setReason(''); message.success('举报已提交') }
      catch (e) { message.error(errorText(e)) }
      finally { setReporting(false) }
    }}><Input.TextArea aria-label="举报原因" value={reason} maxLength={500} showCount rows={4} disabled={reporting} onChange={e => setReason(e.target.value)} placeholder="请说明举报原因（必填）" /></Modal>
  </section>
}
