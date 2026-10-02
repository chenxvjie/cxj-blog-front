import { useSyncExternalStore } from 'react'
import { queryClient } from './queryClient'
export type User = { id: number; email: string; nickname: string; role: 'ADMIN' | 'USER' }
export type Session = { accessToken: string; user: User }
let session: Session | null = null
const listeners = new Set<() => void>()
export function setSession(value: Session | null) {
  if (session === value) return
  session = value
  queryClient.clear()
  listeners.forEach(listener => listener())
}
export function getSession() { return session }
export function useSession() { return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener) } }, getSession) }
