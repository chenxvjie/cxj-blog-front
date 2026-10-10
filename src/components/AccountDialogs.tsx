import { Alert, Avatar, Button, Form, Input, Modal, Upload, message } from 'antd'
import { UserOutlined, UploadOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { client } from '../api/client'
import { getSession, setSession, useSession } from '../api/session'
import { uploadImage } from '../api/images'
import { errorText } from '../api/errors'

type Profile = { nickname: string; avatarUrl?: string; bio?: string }
export default function AccountDialogs({ dialog, onClose }: { dialog: string; onClose: () => void }) {
  const session = useSession()
  return <Modal open title={dialog === 'profile' ? '个人资料' : dialog === 'password' ? '修改密码' : '站点设置'} footer={null} onCancel={onClose} destroyOnHidden>
    {dialog === 'profile' && session && <ProfileForm onDone={onClose} />}{dialog === 'password' && session && <PasswordForm />}{dialog === 'settings' && session?.user.role === 'ADMIN' && <SettingsForm onDone={onClose} />}
  </Modal>
}
function ProfileForm({ onDone }: { onDone: () => void }) {
  const session = useSession()!
  const cache = useQueryClient()
  const [form] = Form.useForm<Profile>()
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const task = useRef<AbortController | null>(null)
  const avatar = Form.useWatch('avatarUrl', form)
  const q = useQuery({ queryKey: ['profile', session.user.id], queryFn: async () => (await client.get('/manage/profile')).data.data as Profile })
  useEffect(() => { if (q.data) form.setFieldsValue(q.data) }, [q.data, form])
  useEffect(() => () => task.current?.abort(), [session])
  return <Form form={form} layout="vertical" onFinish={async values => { setSaving(true); try { await client.put('/manage/profile', { ...values, avatarUrl: values.avatarUrl ?? '', bio: values.bio ?? '' }); setSession({ ...session, user: { ...session.user, nickname: values.nickname } }); await cache.invalidateQueries(); message.success('资料已保存'); onDone() } catch (e) { message.error(errorText(e)) } finally { setSaving(false) } }}>
    {q.isError && <Alert className="mb-4" type="error" message={errorText(q.error)} />}<Form.Item name="avatarUrl" hidden><Input /></Form.Item><Form.Item label="头像"><div className="flex items-center gap-5"><Avatar size={72} src={avatar} icon={<UserOutlined />} /><Upload accept="image/png,image/jpeg,image/webp,image/gif" showUploadList={false} disabled={uploading || saving} beforeUpload={async file => {
      const controller = new AbortController(); task.current = controller; setUploading(true)
      try { const url = await uploadImage(file, controller.signal); if (!controller.signal.aborted && getSession() === session) form.setFieldValue('avatarUrl', url) } catch (e) { if (!controller.signal.aborted) message.error(errorText(e)) } finally { task.current = null; setUploading(false) }
      return Upload.LIST_IGNORE
    }}><Button icon={<UploadOutlined />} loading={uploading}>上传头像</Button></Upload></div></Form.Item>
    <Form.Item name="nickname" label="昵称" rules={[{ required: true }]}><Input maxLength={80} /></Form.Item><Form.Item name="bio" label="个人简介"><Input.TextArea rows={4} maxLength={500} /></Form.Item><Button htmlType="submit" type="primary" disabled={uploading || q.isLoading || q.isError} loading={saving}>保存资料</Button>
  </Form>
}
function PasswordForm() {
  const [saving, setSaving] = useState(false)
  return <Form layout="vertical" onFinish={async v => { setSaving(true); try { await client.put('/manage/password', v); setSession(null); message.success('密码已修改，请重新登录') } catch (e) { message.error(errorText(e)) } finally { setSaving(false) } }}>
    <Form.Item name="currentPassword" label="当前密码" rules={[{ required: true }]}><Input.Password autoComplete="current-password" /></Form.Item><Form.Item name="newPassword" label="新密码" rules={[{ required: true, min: 8 }, { validator: (_, value) => !value || new TextEncoder().encode(value).length <= 72 ? Promise.resolve() : Promise.reject(new Error('密码不能超过72个UTF-8字节')) }]}><Input.Password autoComplete="new-password" maxLength={72} /></Form.Item><Button htmlType="submit" type="primary" loading={saving}>修改密码并退出登录</Button>
  </Form>
}
function SettingsForm({ onDone }: { onDone: () => void }) {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const cache = useQueryClient()
  const q = useQuery({ queryKey: ['site'], queryFn: async () => (await client.get('/site')).data.data })
  useEffect(() => { if (q.data) form.setFieldsValue(q.data) }, [q.data, form])
  return <Form form={form} layout="vertical" onFinish={async v => { setSaving(true); try { await client.put('/admin/site', { description: '', about: '', contact: '', ...v }); await cache.invalidateQueries({ queryKey: ['site'] }); message.success('站点设置已保存'); onDone() } catch (e) { message.error(errorText(e)) } finally { setSaving(false) } }}><Form.Item name="title" label="站点名称" rules={[{ required: true }]}><Input maxLength={100} /></Form.Item><Form.Item name="description" label="站点介绍"><Input.TextArea maxLength={500} /></Form.Item><Form.Item name="contact" label="联系方式"><Input maxLength={320} /></Form.Item><Form.Item name="about" hidden><Input /></Form.Item><Button htmlType="submit" type="primary" loading={saving} disabled={q.isLoading || q.isError}>保存</Button></Form>
}
