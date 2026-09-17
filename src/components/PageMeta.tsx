import { useEffect } from 'react'
export function PageMeta({ title, description }: { title: string; description?: string }) {
  useEffect(() => { document.title = `${title} · CXJ Blog`; let tag = document.querySelector('meta[name="description"]'); if (!tag) { tag = document.createElement('meta'); tag.setAttribute('name', 'description'); document.head.appendChild(tag) }; tag.setAttribute('content', description ?? '个人技术博客') }, [title, description])
  return null
}
