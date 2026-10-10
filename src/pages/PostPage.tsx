import { Alert, Button, List, Space, Spin, Tag } from 'antd'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { getPost } from '../api/posts'
import { client } from '../api/client'
import { ArticleMarkdown } from '../components/ArticleMarkdown'
import { Comments } from '../components/Comments'
import { PageMeta } from '../components/PageMeta'
import { tableOfContents } from '../api/markdown'
import { baidu } from '../api/baidu'
import type { BlogPost } from '../types/blog'

function Article({ post }: { post: BlogPost }) {
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { baidu.event('article_end'); observer.disconnect() }
    })
    if (end.current) observer.observe(end.current)
    return () => observer.disconnect()
  }, [post.id])
  const related = useQuery({ queryKey: ['related', post.id, post.categoryId], queryFn: async () => (await client.get('/posts', { params: { category: post.categoryId, size: 6 } })).data.data.records as BlogPost[] })
  const toc = tableOfContents(post.contentMd)
  return <article className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-sm sm:p-8"><PageMeta title={post.title} description={post.summary} /><Link to="/"><Button type="link" className="mb-4 px-0">← 返回文章列表</Button></Link><h1 className="text-3xl">{post.title}</h1><Space wrap className="my-4"><span>{post.publishedAt && new Date(post.publishedAt).toLocaleDateString()}</span><Link to={`/authors/${post.authorId}`}>{post.authorName ?? '作者'}</Link>{post.categoryName && <Link to={`/?category=${post.categoryId}`}><Tag>{post.categoryName}</Tag></Link>}{post.tags?.map(t => <Link key={t.id} to={`/?tag=${t.id}`}><Tag>{t.name}</Tag></Link>)}</Space>
    {toc.length > 0 && <nav aria-label="文章目录" className="my-5 rounded bg-slate-50 p-4"><h2>目录</h2>{toc.map(h => <a key={h.id} className="block" style={{ marginLeft: (h.level - 1) * 16 }} href={`#${h.id}`}>{h.title}</a>)}</nav>}
    <div className="prose mt-8 max-w-none leading-8 text-slate-700"><ArticleMarkdown content={post.contentMd} /></div><div ref={end} />
    <h2 className="mt-8 text-xl">继续阅读</h2><List dataSource={related.data?.filter(p => p.id !== post.id).slice(0, 5)} renderItem={p => <List.Item><Link to={`/posts/${p.slug}`}>{p.title}</Link></List.Item>} /><Comments postId={post.id} />
  </article>
}
export function PostPage() {
  const { slug = '' } = useParams()
  const q = useQuery({ queryKey: ['post', slug], queryFn: () => getPost(slug) })
  if (q.isLoading) return <div className="py-24 text-center"><Spin /></div>
  if (q.isError || !q.data) return <Alert type="error" message="文章不存在或无法加载" />
  return <Article key={q.data.id} post={q.data} />
}
