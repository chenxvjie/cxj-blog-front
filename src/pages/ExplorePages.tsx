import { Button } from 'antd'
import { PageMeta } from '../components/PageMeta'
import { openAnalyticsPreferences } from '../api/baidu'
export { ArchivePage, TagPage, SearchPage } from './ContentPages'

export function PrivacyPage() { return <article className="prose max-w-3xl"><PageMeta title="隐私政策" /><h1>隐私政策</h1>
  <h2>访问统计</h2><p>经你同意，本站使用百度统计了解浏览量（PV）、访客数（UV）、访问来源和公开页面的访问情况。百度统计可能使用 Cookie 等标识，并处理访问页面、来源、浏览器和设备信息、网络 IP 等数据。详情请参阅<a href="https://tongji.baidu.com/web/help/article?id=330&type=0" target="_blank" rel="noopener noreferrer">百度统计隐私政策</a>。</p>
  <p>本站仅在正式域名的公开页面启用统计，不主动向统计服务提交账号邮箱、密码、验证码、文章编辑内容或搜索关键词。登录、管理、搜索和未知页面不纳入本次 PV 统计；带查询参数或片段标识的页面也不纳入。</p>
  <p>你可以拒绝统计，继续使用本站；也可以通过页脚“统计偏好”随时修改选择。撤回后本站停止后续采集，已发送的数据不会因此自动删除。偏好保存在当前浏览器中，清除浏览器数据后需要重新选择。</p>
  <Button onClick={openAnalyticsPreferences}>修改统计偏好</Button>
  <h2>账号与文章</h2><p>注册和登录需要处理邮箱、昵称、密码校验信息及验证码，以提供账号验证和文章管理功能。密码以哈希形式存储。必要的 HttpOnly 登录 Cookie 用于恢复登录，有效期为登录后 24 小时，退出登录或修改密码会撤销会话；它不受访问统计授权开关影响。昵称、头像、简介以及审核通过的评论会公开展示，投稿正文由管理员审核。已发布的文章和通过图片 CDN 分享的图片可公开访问，草稿中的图片链接也可能被持有链接的人访问。</p>
  <p>本页面更新于 2026 年 10 月 10 日。</p>
</article> }
