import { Alert, Card, Empty, Input, List, Pagination, Select, Space, Tag } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { client } from '../api/client'
import { PageMeta } from '../components/PageMeta'
import { PostActions } from '../components/PostActions'
import { ArticleMarkdown } from '../components/ArticleMarkdown'
import { errorText } from '../api/errors'
import type { BlogPost, Page } from '../types/blog'
import { baidu } from '../api/baidu'

type Term = { id: number; name: string; slug: string; count: number }
function useTaxonomy() { return useQuery({ queryKey: ['taxonomy'], queryFn: async () => (await client.get('/taxonomy')).data.data as { categories: Term[]; tags: Term[] } }) }
export function PublicPosts({ archive = false, author }: { archive?: boolean; author?: string }) {
  const [params, setParams] = useSearchParams()
  const taxonomy = useTaxonomy()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const q = params.get('q') ?? ''
  const category = params.get('category') ?? undefined
  const tag = params.get('tag') ?? undefined
  const month = params.get('month') ?? undefined
  const months = useQuery({ queryKey: ['archive'], enabled: archive, queryFn: async () => (await client.get('/archive')).data.data as { month: string; count: number }[] })
  const posts = useQuery({ queryKey: ['posts', page, q, category, tag, author, month], queryFn: async () => (await client.get('/posts', { params: { page, size: 20, q, category, tag, author, month } })).data.data as Page<BlogPost> })
  const change = (key: string, value?: string | number) => { if (key !== 'page') baidu.event(key === 'q' ? 'search' : 'taxonomy_filter'); const next = new URLSearchParams(params); next.delete('page'); if (value) next.set(key, String(value)); else next.delete(key); setParams(next) }
  return <><Space wrap className="my-5"><Input.Search key={q} defaultValue={q} maxLength={100} placeholder="搜索标题或正文" onSearch={v => change('q', v.trim())} allowClear /><Select className="min-w-36" placeholder="全部分类" value={category ? Number(category) : undefined} allowClear options={taxonomy.data?.categories.map(t => ({ value: t.id, label: t.name }))} onChange={v => change('category', v)} /><Select className="min-w-36" placeholder="全部标签" value={tag ? Number(tag) : undefined} allowClear options={taxonomy.data?.tags.map(t => ({ value: t.id, label: t.name }))} onChange={v => change('tag', v)} /></Space>
    {archive && <Select className="ml-3 min-w-40" placeholder="全部月份" value={month} allowClear options={months.data?.map(m => ({ value: m.month, label: `${m.month}（${m.count} 篇）` }))} onChange={v => change('month', v)} />}
    {posts.isError ? <Alert type="error" message={errorText(posts.error)} /> : <List loading={posts.isLoading} dataSource={posts.data?.records} locale={{ emptyText: <Empty description="没有匹配的已发布文章" /> }} renderItem={p => <List.Item className="!block"><Card cover={!archive && p.coverUrl ? <img className="max-h-72 object-cover" loading="lazy" src={p.coverUrl} alt={p.title} /> : undefined}><Space wrap>{p.isTop && <Tag color="gold">置顶</Tag>}{p.categoryName && <Link to={`/?category=${p.categoryId}`}><Tag>{p.categoryName}</Tag></Link>}{p.tags?.map(t => <Link key={t.id} to={`/?tag=${t.id}`}><Tag>{t.name}</Tag></Link>)}</Space><Link to={`/posts/${p.slug}`} onClick={() => baidu.event('article_open')}><h2 className="my-3 text-xl">{p.title}</h2></Link><p>{p.summary}</p><Space><span>{p.publishedAt && new Date(p.publishedAt).toLocaleDateString()}</span><Link to={`/authors/${p.authorId}`}>{p.authorName ?? '作者'}</Link></Space><div><PostActions post={p} /></div></Card></List.Item>} />}
    <Pagination className="mt-6" current={page} total={posts.data?.total ?? 0} pageSize={20} showSizeChanger={false} onChange={v => change('page', v)} />
  </>
}
export function HomePage() {
  const site = useQuery({ queryKey: ['site'], queryFn: async () => (await client.get('/site')).data.data as { title: string; description: string } })
  return <section><PageMeta title="首页" /><div className="rounded-3xl bg-slate-900 px-8 py-12 text-white"><h1 className="text-4xl">{site.data?.title ?? 'CXJ Blog'}</h1><p>{site.data?.description || '记录思考，也分享实践。'}</p><Link className="text-sky-300" to="/admin/editor">分享你的实践，提交一篇投稿 →</Link></div><PublicPosts /></section>
}
export function ArchivePage() { return <section><PageMeta title="归档" /><h1 className="text-3xl">文章归档</h1><p>按置顶和发布时间排列，可通过分类、标签与关键词筛选。</p><PublicPosts archive /></section> }
export function SearchPage() { return <section><PageMeta title="搜索" /><h1 className="text-3xl">搜索文章</h1><PublicPosts /></section> }
export function TagPage() {
  const q = useTaxonomy()
  return <section><PageMeta title="分类与标签" /><h1 className="text-3xl">分类与标签</h1>{q.isError && <Alert type="error" message={errorText(q.error)} />}{(['categories', 'tags'] as const).map(kind => <Card className="mt-5" key={kind} title={kind === 'categories' ? '分类' : '标签'}><Space wrap>{q.data?.[kind].map(t => <Link key={t.id} to={`/?${kind === 'categories' ? 'category' : 'tag'}=${t.id}`}><Tag>{t.name}（{t.count}）</Tag></Link>)}</Space>{q.data?.[kind].length === 0 && <Empty description="暂无内容" />}</Card>)}</section>
}
export function AuthorPage() {
  const { id } = useParams()
  const q = useQuery({ queryKey: ['author', id], queryFn: async () => (await client.get(`/authors/${id}`)).data.data as { nickname: string; avatarUrl?: string; bio?: string } })
  return <section>{q.isError ? <Alert type="error" message={errorText(q.error)} /> : <><h1 className="text-3xl">{q.data?.nickname ?? '作者'}</h1>{q.data?.avatarUrl && <img className="h-20 w-20 rounded-full" src={q.data.avatarUrl} alt="头像" />}<p>{q.data?.bio}</p><PublicPosts author={id} /></>}</section>
}
export function AboutPage() {
  const q = useQuery({ queryKey: ['site'], queryFn: async () => (await client.get('/site')).data.data as { title: string; about?: string; contact?: string } })
  return <section className="prose max-w-3xl"><PageMeta title="关于" /><h1>关于 {q.data?.title ?? 'CXJ Blog'}</h1>{q.isError && <Alert type="error" message={errorText(q.error)} />}<ArticleMarkdown content={q.data?.about || '这里记录个人思考与实践，也欢迎读者投稿。'} />{q.data?.contact && <p>联系：{q.data.contact}</p>}</section>
}
