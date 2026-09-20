import { client } from './client'
export type CaptchaProof = { lot_number: string; captcha_output: string; pass_token: string; gen_time: string }
type Captcha = {
  onReady(fn: () => void): Captcha
  onSuccess(fn: () => void): Captcha
  onError(fn: () => void): Captcha
  onClose(fn: () => void): Captcha
  showCaptcha(): void
  getValidate(): CaptchaProof | false
  destroy(): void
}
declare global {
  interface Window {
    initGeetest4?: (options: { captchaId: string; product: string; protocol: string; onError: () => void }, callback: (captcha: Captcha) => void) => void
  }
}
let scriptLoading: Promise<void> | undefined
function loadScript() {
  if (window.initGeetest4) return Promise.resolve()
  if (!scriptLoading) scriptLoading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    const timer = window.setTimeout(() => { script.remove(); reject(new Error('人机验证加载超时，请重试')) }, 15000)
    script.src = 'https://static.geetest.com/v4/gt4.js'
    script.async = true
    script.onload = () => {
      clearTimeout(timer)
      if (window.initGeetest4) resolve()
      else reject(new Error('人机验证加载失败'))
    }
    script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error('人机验证加载失败，请检查网络')) }
    document.head.appendChild(script)
  }).catch((error: unknown) => { scriptLoading = undefined; throw error })
  return scriptLoading
}
export async function verifyHuman(): Promise<CaptchaProof> {
  const { data } = await client.get<{ data: { enabled: boolean; captchaId?: string } }>('/auth/captcha-config')
  if (!data.data.enabled || !data.data.captchaId) throw new Error('人机验证服务尚未配置，暂时不能发送验证码')
  await loadScript()
  return new Promise<CaptchaProof>((resolve, reject) => {
    let instance: Captcha | undefined
    let settled = false
    const finish = (proof?: CaptchaProof, error = '人机验证未完成，请重试') => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      instance?.destroy()
      if (proof) resolve(proof); else reject(new Error(error))
    }
    const timer = window.setTimeout(() => finish(undefined, '人机验证超时，请重试'), 120000)
    try {
      window.initGeetest4!({ captchaId: data.data.captchaId!, product: 'bind', protocol: 'https://', onError: () => finish() }, captcha => {
        if (settled) { captcha.destroy(); return }
        instance = captcha
        captcha.onReady(() => { if (!settled) captcha.showCaptcha() })
          .onSuccess(() => {
            const proof = captcha.getValidate()
            if (proof && proof.lot_number && proof.captcha_output && proof.pass_token && proof.gen_time) finish(proof)
            else finish(undefined, '未取得有效的人机验证结果')
          }).onError(() => finish()).onClose(() => finish(undefined, '已取消人机验证'))
      })
    } catch { finish() }
  })
}
