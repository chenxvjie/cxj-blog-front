import { Alert, Card, Empty, Input, Spin, Tag } from 'antd'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getPosts } from '../api/posts'
import { PostActions } from '../components/PostActions'
import { PageMeta } from '../components/PageMeta'

export function HomePage() {
  const query = useQuery({ queryKey: ['posts'], queryFn: getPosts })
  if (query.isLoading) return <div className="py-24 text-center"><Spin size="large" /></div>
  if (query.isError) return <Alert type="warning" showIcon message="暂时无法加载文章" description="请确认后端服务与数据库已启动。" />
  const posts = query.data?.records ?? []
  return <section><PageMeta title="首页" /><div className="mb-8 rounded-3xl bg-slate-900 px-8 py-12 text-white"><p className="mb-2 text-sm text-sky-300">PERSONAL NOTES</p><h1 className="m-0 text-4xl font-bold">记录思考，也分享实践。</h1><Input.Search className="mt-6 max-w-lg" placeholder="搜索文章" onSearch={value => { location.href = `/search?q=${encodeURIComponent(value)}` }} /></div><div className="mb-5 flex gap-2"><Tag>全部文章</Tag><Tag>分类待接入</Tag><Tag>标签待接入</Tag></div>{posts.length === 0 ? <Empty description="还没有已发布的文章" /> : <div className="grid gap-4">{posts.map(post => <Card key={post.id} className="shadow-sm" cover={post.coverUrl ? <img loading="lazy" alt="文章封面" src={post.coverUrl} /> : undefined}><Tag color="blue">文章</Tag><Link to={`/posts/${post.slug}`}><h2 className="mt-3 text-xl font-semibold text-slate-900">{post.title}</h2></Link><p className="mb-0 text-slate-600">{post.summary || '暂无摘要'}</p><PostActions post={post} /></Card>)}</div>}</section>
}
