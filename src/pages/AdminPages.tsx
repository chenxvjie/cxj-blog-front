import { FileTextOutlined, PictureOutlined, SettingOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Form, Input, Layout, Menu, Progress } from 'antd'
import { Link, Navigate } from 'react-router-dom'
import { useSession } from '../api/session'
import { FeatureUnavailable } from '../components/FeatureUnavailable'
import { PageMeta } from '../components/PageMeta'

const menu = [{ key: 'posts', icon: <FileTextOutlined />, label: <Link to='/admin/posts'>文章管理</Link> }, { key: 'media', icon: <PictureOutlined />, label: <Link to='/admin/media'>媒体库</Link> }, { key: 'settings', icon: <SettingOutlined />, label: <Link to='/admin/settings'>站点设置</Link> }]
function Shell({ section, children }: { section: string; children: React.ReactNode }) { const session = useSession(); if (!session) return <Navigate to="/auth" replace />; if (session.user.role !== 'ADMIN') return <Alert type="warning" message="仅管理员可访问此页面" />; return <Layout className="min-h-[640px] overflow-hidden rounded-xl border border-slate-200 bg-white"><Layout.Sider width={180} breakpoint="md"><Menu theme="dark" mode="inline" selectedKeys={[section]} items={menu} /></Layout.Sider><Layout.Content className="p-6">{children}</Layout.Content></Layout> }
export function MediaPage() { return <section><PageMeta title="媒体库" /><Shell section="media"><h1 className="text-2xl font-bold">媒体库</h1><FeatureUnavailable feature="腾讯云 COS 直传" detail="需要后端预签名 URL、文件类型/大小校验和 COS/CDN 凭证。当前不会上传文件到未知位置。" /><Card><Button disabled>选择文件上传</Button><Progress className="mt-5" percent={0} /></Card></Shell></section> }
export function SettingsPage() { return <section><PageMeta title="站点设置" /><Shell section="settings"><h1 className="text-2xl font-bold">站点设置</h1><Form layout="vertical" className="max-w-xl"><Form.Item label="站点名称"><Input defaultValue="CXJ Blog" /></Form.Item><Form.Item label="站点描述"><Input.TextArea defaultValue="记录思考，也分享实践。" /></Form.Item><Form.Item label="社交链接"><Input placeholder="https://github.com/..." /></Form.Item><Button type="primary" disabled>保存设置</Button></Form><p className="mt-3 text-sm text-slate-500">保存功能等待站点设置 API 与管理员权限接入。</p></Shell></section> }
