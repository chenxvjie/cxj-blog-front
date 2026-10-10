import { Alert, Button, Input, List, Pagination, Popconfirm, Space, message } from 'antd'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { client } from '../api/client'
import { useSession } from '../api/session'
import { errorText } from '../api/errors'
type Comment = { id: number; authorId: number; nickname: string; content: string; parentId?: number; createdAt: string }
export function Comments({ postId }: { postId: number }) {
  const session = useSession()
  const cache = useQueryClient()
  const [page, setPage] = useState(1)
  const [content, setContent] = useState('')
  const [parentId, setParent] = useState<number | undefined>()
  const [busy, setBusy] = useState(false)
  const [reportId, setReport] = useState<number | null>(null)
  const [reason, setReason] = useState('')
  const q = useQuery({ queryKey: ['comments', postId, page], queryFn: async () => (await client.get(`/posts/${postId}/comments`, { params: { page } })).data.data as Comment[] })
  const submit = async () => { setBusy(true); try { await client.post(`/manage/posts/${postId}/comments`, { content, parentId }); setContent(''); setParent(undefined); await cache.invalidateQueries({ queryKey: ['comments'] }); message.success('评论已发布') } catch (e) { message.error(errorText(e)) } finally { setBusy(false) } }
  return <section className="mt-12 border-t pt-6"><h2>评论</h2>{q.isError && <Alert type="error" message={errorText(q.error)} />}<List loading={q.isLoading} dataSource={q.data} locale={{ emptyText: '暂无评论' }} renderItem={c => <List.Item className="!block"><Space><Link to={`/authors/${c.authorId}`}>{c.nickname}</Link><span>{new Date(c.createdAt).toLocaleString()}</span>{c.parentId && <span>回复 #{c.parentId}</span>}</Space><p className="whitespace-pre-wrap">{c.content}</p>{session && <Space><Button size="small" onClick={() => setParent(c.id)}>回复</Button><Button size="small" onClick={() => setReport(c.id)}>举报</Button>{(session.user.id === c.authorId || session.user.role === 'ADMIN') && <Popconfirm title="删除这条评论？" onConfirm={async () => { try { await client.delete(`/manage/comments/${c.id}`); await cache.invalidateQueries({ queryKey: ['comments'] }) } catch (e) { message.error(errorText(e)) } }}><Button danger size="small">删除</Button></Popconfirm>}</Space>}</List.Item>} />
    <Pagination hideOnSinglePage simple current={page} pageSize={50} total={(page - 1) * 50 + (q.data?.length ?? 0) + ((q.data?.length ?? 0) === 50 ? 1 : 0)} onChange={setPage} />
    {session ? <div className="mt-5">{parentId && <p>正在回复 #{parentId} <Button size="small" onClick={() => setParent(undefined)}>取消回复</Button></p>}<Input.TextArea maxLength={2000} rows={4} value={content} onChange={e => setContent(e.target.value)} placeholder="友善交流，发送后公开展示" /><Button className="mt-3" type="primary" loading={busy} disabled={!content.trim()} onClick={() => void submit()}>提交评论</Button></div> : <p><Link to="/auth">登录后参与评论</Link></p>}
    {reportId && <div className="mt-4"><Input.TextArea value={reason} maxLength={500} onChange={e => setReason(e.target.value)} placeholder="请说明举报原因" /><Space className="mt-2"><Button disabled={!reason.trim()} onClick={async () => { try { await client.post(`/manage/comments/${reportId}/report`, { reason }); setReport(null); setReason(''); message.success('举报已提交') } catch (e) { message.error(errorText(e)) } }}>提交举报</Button><Button onClick={() => setReport(null)}>取消</Button></Space></div>}
  </section>
}
