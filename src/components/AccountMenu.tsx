import { Avatar, Button, Dropdown, message } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { client } from '../api/client'
import { setSession, useSession } from '../api/session'
import { errorText } from '../api/errors'

const AccountDialogs = lazy(() => import('./AccountDialogs'))
type Profile = { nickname: string; avatarUrl?: string; bio?: string }
export function AccountMenu({ toggleTheme }: { toggleTheme: () => void }) {
  const session = useSession()
  const navigate = useNavigate()
  const [dialog, setDialog] = useState<string | null>(null)
  const profile = useQuery({ queryKey: ['profile', session?.user.id], enabled: !!session, queryFn: async () => (await client.get('/manage/profile')).data.data as Profile })
  useEffect(() => { setDialog(null) }, [session?.user.id])
  if (!session) return <Link to="/auth"><Button className="header-account-trigger" aria-label="登录" type="text" icon={<Avatar icon={<UserOutlined />} />} /></Link>
  const items = [{ key: 'profile', label: '个人资料' }, { key: 'password', label: '修改密码' }, { key: 'theme', label: '主题切换' }, ...(session.user.role === 'ADMIN' ? [{ key: 'settings', label: '站点设置' }] : []), { key: 'logout', label: '退出登录', danger: true }]
  return <><Dropdown trigger={['hover', 'click']} menu={{ items, onClick: async ({ key }) => {
    if (key === 'theme') toggleTheme()
    else if (key === 'logout') { try { await client.post('/auth/logout'); setSession(null); navigate('/auth', { replace: true }) } catch (e) { message.error(errorText(e)) } }
    else setDialog(key)
  } }}><Button className="header-account-trigger" type="text" aria-label="用户菜单"><Avatar src={profile.data?.avatarUrl} icon={<UserOutlined />} /></Button></Dropdown>
    {dialog && <Suspense fallback={null}><AccountDialogs dialog={dialog} onClose={() => setDialog(null)} /></Suspense>}</>
}
