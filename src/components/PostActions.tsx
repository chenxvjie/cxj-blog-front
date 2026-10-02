import { Button, Popconfirm, Space, message } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { isAxiosError } from 'axios'
import { client } from '../api/client'
import { getSession, useSession } from '../api/session'
import { canManagePost } from '../api/permissions'

export function PostActions({ post, returnHome = false }: { post: { id: number; authorId?: number | string }; returnHome?: boolean }) {
  const session = useSession()
  const cache = useQueryClient()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
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
  return <Space className="my-3"><Link to={`/admin/editor?id=${post.id}`}>编辑</Link><Popconfirm title="确定删除这篇文章？" onConfirm={remove}><Button danger loading={deleting}>删除</Button></Popconfirm></Space>
}
