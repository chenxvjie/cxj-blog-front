import SparkMD5 from 'spark-md5'
import { client } from './client'

const types = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
export const maxImageBytes = 5 * 1024 * 1024
type Prepared = { uploadId: string; uploadUrl: string; headers: Record<string, string> }

export async function uploadImage(file: File, signal: AbortSignal): Promise<string> {
  if (!types.has(file.type) || file.size < 1 || file.size > maxImageBytes) {
    throw new Error('请选择不超过 5 MB 的 PNG、JPEG、WebP 或 GIF 图片')
  }
  const bytes = await file.arrayBuffer()
  signal.throwIfAborted()
  const contentMd5 = btoa(SparkMD5.ArrayBuffer.hash(bytes, true))
  const { data } = await client.post('/manage/images/upload-url', {
    filename: file.name, contentType: file.type, size: file.size, contentMd5,
  }, { signal })
  const prepared = data.data as Prepared
  // Never forward the blog Bearer token to COS. The signed URL carries upload authorization.
  const headers = { ...prepared.headers }
  // Fetch forbids setting Content-Length: the browser derives it from the Blob.
  delete headers['Content-Length']
  const response = await fetch(prepared.uploadUrl, {
    method: 'PUT', headers, body: file, credentials: 'omit', signal,
  })
  if (!response.ok) throw new Error('图片上传失败，请检查网络或稍后重试')
  const completed = await client.post('/manage/images/complete', { uploadId: prepared.uploadId }, { signal })
  return completed.data.data.publicUrl as string
}

export function imageMarkdown(url: string): string { return `![图片](${url})` }
