import axios from 'axios'
import { getSession, setSession } from './session'
// Development never inherits a production API URL from .env.
export const client = axios.create({ baseURL: import.meta.env.DEV ? '/api/v1' : (import.meta.env.VITE_API_BASE_URL || '/api/v1'), timeout: 10000, withCredentials: true })
const owners = new WeakMap<object, ReturnType<typeof getSession>>()
client.interceptors.request.use(config => {
  const session = getSession(); owners.set(config, session)
  if (session?.accessToken) config.headers.Authorization = `Bearer ${session.accessToken}`
  config.headers['X-Blog-Request'] = '1'
  return config
})
client.interceptors.response.use(response => response, error => {
  const session = getSession()
  // An old account's delayed response must not sign out the current account.
  if (error.response?.status === 401 && session &&
    owners.get(error.config) === session &&
    !error.config?.url?.includes('login')) setSession(null)
  return Promise.reject(error)
})
