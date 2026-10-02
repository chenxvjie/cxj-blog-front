import { Alert, Button, Spin } from 'antd'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getPost } from '../api/posts'
import { ArticleMarkdown } from '../components/ArticleMarkdown'
import { PostActions } from '../components/PostActions'
import { PageMeta } from '../components/PageMeta'

export function PostPage() { const { slug = '' } = useParams(); const q = useQuery({ queryKey: ['post', slug], queryFn: () => getPost(slug) }); if (q.isLoading) return <div className="py-24 text-center"><Spin /></div>; if (q.isError || !q.data) return <Alert type="error" message="文章不存在或无法加载" />; const post = q.data; return <article className="prose mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm"><PageMeta title={post.title} description={post.summary} /><Link to="/"><Button type="link" className="mb-4 px-0">← 返回文章列表</Button></Link><h1>{post.title}</h1><PostActions post={post} returnHome /><p className="text-sm text-slate-400">{post.publishedAt && new Date(post.publishedAt).toLocaleDateString()} · {post.viewCount} 阅读</p><div className="mt-8 leading-8 text-slate-700"><ArticleMarkdown content={post.contentMd} /></div></article> }
