import { Card, Empty, Input, List, Tag } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { getPosts } from '../api/posts'
import { PageMeta } from '../components/PageMeta'
import type { BlogPost } from '../types/blog'

export function ArchivePage() { const q = useQuery({ queryKey: ['posts'], queryFn: getPosts }); const groups = (q.data?.records ?? []).reduce<Record<string, BlogPost[]>>((m, post) => { const year = post.publishedAt?.slice(0, 4) ?? '草稿'; (m[year] ??= []).push(post); return m }, {}); return <section><PageMeta title="归档" /><h1 className="text-3xl font-bold">文章归档</h1>{Object.keys(groups).length ? Object.entries(groups).map(([year, posts]) => <Card key={year} title={year} className="mt-4"><List dataSource={posts} renderItem={p => <List.Item><Link to={`/posts/${p.slug}`}>{p.title}</Link></List.Item>} /></Card>) : <Empty className="mt-12" description="暂无归档文章" />}</section> }
export function TagPage() { return <section><PageMeta title="标签" /><h1 className="text-3xl font-bold">标签</h1><p className="text-slate-500">标签 API 接入后会显示文章数量与筛选结果。</p><div className="mt-6 flex gap-2"><Tag>待接入</Tag><Tag>React</Tag><Tag>Java</Tag></div></section> }
export function SearchPage() { const [params, setParams] = useSearchParams(); const q = params.get('q') ?? ''; const posts = useQuery({ queryKey: ['posts'], queryFn: getPosts }).data?.records ?? []; const result = posts.filter(x => `${x.title} ${x.summary ?? ''} ${x.contentMd}`.toLowerCase().includes(q.toLowerCase())); return <section><PageMeta title="搜索" /><h1 className="text-3xl font-bold">搜索文章</h1><Input.Search className="mt-5 max-w-xl" defaultValue={q} placeholder="输入标题或正文关键词" enterButton onSearch={v => setParams(v ? { q: v } : {})} />{q && <List className="mt-6" bordered dataSource={result} locale={{ emptyText: '未找到匹配文章' }} renderItem={p => <List.Item><Link to={`/posts/${p.slug}`}>{p.title}</Link></List.Item>} />}</section> }
export function PrivacyPage() { return <article className="prose max-w-3xl"><PageMeta title="隐私政策" /><h1>隐私政策</h1><p>本站仅在获得同意后加载访问统计。站内事件应使用匿名访客标识，不保存明文 IP。</p><p>账号功能上线后，将在此补充数据处理、删除账号和联系渠道说明。</p></article> }
