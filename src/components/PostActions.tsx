import { Button, Input, Modal, Popconfirm, Space, message } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { isAxiosError } from 'axios'
import { client } from '../api/client'
import { getSession, useSession } from '../api/session'
import { canManagePost } from '../api/permissions'

export function PostActions({ post, returnHome = false }: { post: { id: number; authorId?: number | string; status?: string; hasSubmission?: boolean }; returnHome?: boolean }) {
  const session = useSession()
  const cache = useQueryClient()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<string>()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  if (!canManagePost(session?.user, post)) return null
  const remove = async () => {
    if (!canManagePost(getSession()?.user, post)) { message.warning('当前账号无权删除此文章'); return }
    setDeleting(true)
    try {
      await client.delete(`/manage/posts/${post.id}`)
      await cache.invalidateQueries()
      message.success('文章已删除')
      if (returnHome) navigate('/')
    } catch (error) { message.error(isAxiosError(error) ? error.response?.data?.message ?? '删除失败，操作已停止' : '删除失败') }
    finally { setDeleting(false) }
  }
  const admin = session?.user.role === 'ADMIN'
  const pending = post.status === 'PENDING'
  const options = pending ? [{ value: 'DRAFT', label: '撤回为草稿' }, ...(admin ? [{ value: 'PUBLISHED', label: '审核通过并发布' }, { value: 'REJECTED', label: '退回作者' }] : [])] : admin ? (post.hasSubmission ? [] : [{ value: 'DRAFT', label: '转为草稿' }, { value: 'PUBLISHED', label: '发布' }, { value: 'OFFLINE', label: '下架' }]) : post.hasSubmission ? [{ value: 'PENDING', label: '提交投稿' }] : []
  const available = options.filter(option => option.value !== post.status)
  const changeStatus = async (target: string) => {
    setBusy(true)
    try {
      if (pending && ['PUBLISHED', 'REJECTED'].includes(target)) await client.post(`/manage/posts/${post.id}/review`, { approved: target === 'PUBLISHED', reason })
      else await client.put(`/manage/posts/${post.id}/status`, { status: target })
      await cache.invalidateQueries()
      setOpen(false)
      message.success('状态已更新')
    } catch (e) { message.error(isAxiosError(e) ? e.response?.data?.message ?? '修改失败' : '修改失败') }
    finally { setBusy(false) }
  }
  return <><Space className="my-3" wrap><Link to={`/admin/editor?id=${post.id}`}>编辑</Link>{available.map(option => option.value === 'REJECTED'
    ? <Button key={option.value} disabled={busy || deleting} onClick={() => { setStatus(option.value); setReason(''); setOpen(true) }}>{option.label}</Button>
    : <Popconfirm key={option.value} title={`确认${option.label}？`} onConfirm={() => changeStatus(option.value)} disabled={busy || deleting}><Button disabled={busy || deleting}>{option.label}</Button></Popconfirm>)}<Popconfirm title="确定删除这篇文章？" onConfirm={remove}><Button danger loading={deleting} disabled={busy}>删除</Button></Popconfirm></Space>
    <Modal open={open} title="退回作者" onCancel={() => setOpen(false)} confirmLoading={busy} okButtonProps={{ disabled: !reason.trim() }} onOk={() => changeStatus(status!)}><Input.TextArea placeholder="请填写退回原因" maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></Modal>
  </>
}
