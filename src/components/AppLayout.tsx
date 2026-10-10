import { BookOutlined } from '@ant-design/icons'
import { Layout, Menu } from 'antd'
import { Link, Outlet } from 'react-router-dom'
import { useTheme } from './ThemeProvider'

import { useSession } from '../api/session'
import { AccountMenu } from './AccountMenu'
import { openAnalyticsPreferences } from '../api/baidu'

export function AppLayout() {
  const session = useSession()
  const { toggleTheme } = useTheme()
  return <Layout className="app-shell w-full bg-slate-50 dark:bg-slate-950"><header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-8"><Link className="shrink-0 text-xl font-bold text-slate-900 dark:text-white" to="/"><BookOutlined /> CXJ Blog</Link><div className="flex min-w-0 flex-1 items-center"><Menu className="header-navigation" style={{ flex: 1, minWidth: 0, paddingInline: 16 }} mode="horizontal" selectable={false} items={[{ key: 'home', label: <Link to="/">文章</Link> }, { key: 'tags', label: <Link to="/tags">分类与标签</Link> }, ...(session ? [{ key: 'manage', label: <Link to="/admin/posts">文章管理</Link> }] : []), ...(session?.user.role === 'ADMIN' ? [{ key: 'comments', label: <Link to="/admin/comments">评论审核</Link> }, { key: 'users', label: <Link to="/admin/users">用户管理</Link> }] : [])]} /><AccountMenu toggleTheme={toggleTheme} /></div></header><main className="app-main mx-auto w-full max-w-6xl px-4 pb-12 sm:px-8"><Outlet /></main><footer className="app-footer w-full border-t border-slate-200 py-6 text-center text-sm text-slate-500">© {new Date().getFullYear()} CXJ Blog · <Link to="/privacy">隐私政策</Link> · <button type="button" className="cursor-pointer underline" onClick={openAnalyticsPreferences}>统计偏好</button><div className="mt-2"><a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="hover:underline">浙ICP备2026082274号-1</a></div></footer></Layout>
}
