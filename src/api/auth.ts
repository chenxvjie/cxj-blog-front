import { client } from './client'
import { verifyHuman } from './geetest'
export async function sendEmailCode(email: string) {
  const captcha = await verifyHuman()
  return client.post('/auth/email-code', { email, captcha }, { timeout: 25000 })
}
export async function emailLogin(email: string, code: string) { return client.post('/auth/email-login', { email, code }) }
export async function register(email: string, code: string, nickname: string) { return client.post('/auth/register', { email, code, nickname }) }
