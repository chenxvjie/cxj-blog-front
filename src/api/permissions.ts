import type { User } from './session'

export function canManagePost(user: User | null | undefined, post: { authorId?: number | string } | null | undefined): boolean {
  if (!user || !post) return false
  if (user.role === 'ADMIN') return true
  return user.role === 'USER' && post.authorId != null && String(post.authorId) === String(user.id)
}
