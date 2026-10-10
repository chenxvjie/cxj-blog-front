import { BookOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons'
import { Button, Layout, Menu } from 'antd'
import { Link, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'

import { useSession } from '../api/session'
import { openAnalyticsPreferences } from '../api/baidu'

export function AppLayout() {
  const session = useSession()
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark'); useEffect(() => { document.documentElement.classList.toggle('dark', dark); localStorage.setItem('theme', dark ? 'dark' : 'light') }, [dark])
  return <Layout className="app-shell w-full bg-slate-50 dark:bg-slate-950"><header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-8"><Link className="shrink-0 text-xl font-bold text-slate-900 dark:text-white" to="/"><BookOutlined /> CXJ Blog</Link><div className="flex min-w-0 flex-1 items-center"><Menu style={{ flex: 1, minWidth: 0 }} mode="horizontal" selectable={false} items={[{ key: 'home', label: <Link to="/">文章</Link> }, { key: 'archive', label: <Link to="/archive">归档</Link> }, { key: 'tags', label: <Link to="/tags">分类标签</Link> }, { key: 'about', label: <Link to="/about">关于</Link> }, { key: 'login', label: session ? <Link to="/admin/posts">{session.user.role === 'ADMIN' ? '全部文章管理' : '我的投稿'}</Link> : <Link to="/auth">登录</Link> }, { key: 'submit', label: <Link to="/admin/editor">投稿</Link> }, { key: 'search', label: <Link to="/search">搜索</Link> }]} /><Button type="text" aria-label="切换主题" icon={dark ? <SunOutlined /> : <MoonOutlined />} onClick={() => setDark(!dark)} /></div></header><main className="app-main mx-auto w-full max-w-6xl px-4 pb-12 sm:px-8"><Outlet /></main><footer className="app-footer w-full border-t border-slate-200 py-6 text-center text-sm text-slate-500">© {new Date().getFullYear()} CXJ Blog · <Link to="/privacy">隐私政策</Link> · <button type="button" className="cursor-pointer underline" onClick={openAnalyticsPreferences}>统计偏好</button><div className="mt-2"><a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="hover:underline">浙ICP备2026082274号-1</a></div></footer></Layout>
}
