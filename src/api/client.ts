import axios from 'axios'
import { getSession, setSession } from './session'
// Development never inherits a production API URL from .env.
export const client = axios.create({ baseURL: import.meta.env.DEV ? '/api/v1' : (import.meta.env.VITE_API_BASE_URL || '/api/v1'), timeout: 10000 })
client.interceptors.request.use(config => { const session = getSession(); if (session) config.headers.Authorization = `Bearer ${session.accessToken}`; return config })
client.interceptors.response.use(response => response, error => {
  const session = getSession()
  // An old account's delayed response must not sign out the current account.
  if (error.response?.status === 401 && session &&
    error.config?.headers?.Authorization === `Bearer ${session.accessToken}` &&
    !error.config?.url?.includes('login')) setSession(null)
  return Promise.reject(error)
})
