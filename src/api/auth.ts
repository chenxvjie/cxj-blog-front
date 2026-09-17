import { client } from './client'
export async function sendEmailCode(email: string, geetestToken?: string) { return client.post('/auth/email-code', { email, geetestToken, purpose: 'LOGIN' }) }
export async function emailLogin(email: string, code: string) { return client.post('/auth/email-login', { email, code }) }
export async function register(email: string, code: string, nickname: string) { return client.post('/auth/register', { email, code, nickname }) }
