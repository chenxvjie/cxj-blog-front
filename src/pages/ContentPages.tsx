import { Alert, Card, Empty, Input, List, Pagination, Select, Space, Tag } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { client } from '../api/client'
import { PageMeta } from '../components/PageMeta'
import { TaxonomyView } from './PortalPages'
import { errorText } from '../api/errors'
import type { BlogPost, Page } from '../types/blog'
import { baidu } from '../api/baidu'

type Term = { id: number; name: string; slug: string; count: number }
function useTaxonomy() { return useQuery({ queryKey: ['taxonomy'], queryFn: async () => (await client.get('/taxonomy')).data.data as { categories: Term[]; tags: Term[] } }) }
export function PublicPosts({ author }: { author?: string }) {
  const [params, setParams] = useSearchParams()
  const taxonomy = useTaxonomy()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const q = params.get('q') ?? ''
  const category = params.get('category') ?? undefined
  const tag = params.get('tag') ?? undefined
  const posts = useQuery({ queryKey: ['posts', page, q, category, tag, author], queryFn: async () => (await client.get('/posts', { params: { page, size: 20, q, category, tag, author } })).data.data as Page<BlogPost> })
  const change = (key: string, value?: string | number) => { if (key !== 'page') baidu.event(key === 'q' ? 'search' : 'taxonomy_filter'); const next = new URLSearchParams(params); next.delete('page'); if (value) next.set(key, String(value)); else next.delete(key); setParams(next) }
  return <div className="page-fill"><Space wrap className="my-5"><Input.Search key={q} defaultValue={q} maxLength={100} placeholder="搜索标题或正文" onSearch={v => change('q', v.trim())} allowClear /><Select className="min-w-36" placeholder="全部分类" value={category ? Number(category) : undefined} allowClear options={taxonomy.data?.categories.map(t => ({ value: t.id, label: t.name }))} onChange={v => change('category', v)} /><Select className="min-w-36" placeholder="全部标签" value={tag ? Number(tag) : undefined} allowClear options={taxonomy.data?.tags.map(t => ({ value: t.id, label: t.name }))} onChange={v => change('tag', v)} /></Space>
    {posts.isError ? <Alert type="error" message={errorText(posts.error)} /> : <List className="flex-1" loading={posts.isLoading} dataSource={posts.data?.records} locale={{ emptyText: <Empty description="没有匹配的已发布文章" /> }} renderItem={p => <List.Item className="!block"><Card cover={p.coverUrl ? <img className="max-h-72 object-cover" loading="lazy" src={p.coverUrl} alt={p.title} /> : undefined}><Space wrap>{p.isTop && <Tag color="gold">置顶</Tag>}{p.categoryName && <Link to={`/?category=${p.categoryId}`}><Tag>{p.categoryName}</Tag></Link>}{p.tags?.map(t => <Link key={t.id} to={`/?tag=${t.id}`}><Tag>{t.name}</Tag></Link>)}</Space><Link to={`/posts/${p.slug}`} onClick={() => baidu.event('article_open')}><h2 className="my-3 text-xl">{p.title}</h2></Link><p>{p.summary}</p><Space><span>{p.publishedAt && new Date(p.publishedAt).toLocaleDateString()}</span><Link to={`/authors/${p.authorId}`}>{p.authorName ?? '作者'}</Link></Space></Card></List.Item>} />}
    <Pagination className="mt-auto pt-6" current={page} total={posts.data?.total ?? 0} pageSize={20} showSizeChanger={false} onChange={v => change('page', v)} />
  </div>
}
export function HomePage() {
  const site = useQuery({ queryKey: ['site'], queryFn: async () => (await client.get('/site')).data.data as { title: string; description: string } })
  return <section className="page-fill"><PageMeta title="首页" /><div className="overflow-hidden rounded-3xl bg-slate-900 text-white"><div className="px-8 py-14 sm:py-16"><h1 className="mb-6 text-4xl">{site.data?.title ?? 'CXJ Blog'}</h1><p className="mb-7 leading-8">{site.data?.description || '记录思考，也分享实践。'}</p><Link className="text-sky-300" to="/admin/editor">分享你的实践，提交一篇投稿 →</Link></div></div><PublicPosts /></section>
}
export function TagPage() { return <><PageMeta title="分类与标签" /><TaxonomyView /></> }
export function AuthorPage() {
  const { id } = useParams()
  const q = useQuery({ queryKey: ['author', id], queryFn: async () => (await client.get(`/authors/${id}`)).data.data as { nickname: string; avatarUrl?: string; bio?: string } })
  return <section>{q.isError ? <Alert type="error" message={errorText(q.error)} /> : <><h1 className="text-3xl">{q.data?.nickname ?? '作者'}</h1>{q.data?.avatarUrl && <img className="h-20 w-20 rounded-full" src={q.data.avatarUrl} alt="头像" />}<p>{q.data?.bio}</p><PublicPosts author={id} /></>}</section>
}
