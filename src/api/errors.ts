import { isAxiosError } from 'axios'
export function errorText(error: unknown) {
  return isAxiosError(error) ? error.response?.data?.message ?? '请求失败，请稍后重试' : error instanceof Error ? error.message : '操作失败'
}
