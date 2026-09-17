import { BookOutlined, GithubOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons'
import { Button, Layout, Menu } from 'antd'
import { Link, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'

export function AppLayout() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark'); useEffect(() => { document.documentElement.classList.toggle('dark', dark); localStorage.setItem('theme', dark ? 'dark' : 'light') }, [dark])
  return <Layout className="app-shell w-full bg-slate-50 dark:bg-slate-950"><header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-5 sm:px-8"><Link className="text-xl font-bold text-slate-900 dark:text-white" to="/"><BookOutlined /> CXJ Blog</Link><div className="flex items-center"><Menu mode="horizontal" selectable={false} items={[{ key: 'home', label: <Link to="/">文章</Link> }, { key: 'archive', label: <Link to="/archive">归档</Link> }, { key: 'tags', label: <Link to="/tags">标签</Link> }, { key: 'about', label: <Link to="/about">关于</Link> }, { key: 'login', label: <Link to="/auth">登录</Link> }, { key: 'github', icon: <GithubOutlined />, label: 'GitHub' }]} /><Button type="text" aria-label="切换主题" icon={dark ? <SunOutlined /> : <MoonOutlined />} onClick={() => setDark(!dark)} /></div></header><main className="app-main mx-auto w-full max-w-6xl px-4 pb-12 sm:px-8"><Outlet /></main><footer className="app-footer w-full border-t border-slate-200 py-6 text-center text-sm text-slate-500">© {new Date().getFullYear()} CXJ Blog · <Link to="/privacy">隐私政策</Link></footer></Layout>
}
