export type BlogPost = { id: number; title: string; slug: string; summary?: string; contentMd: string; coverUrl?: string; publishedAt?: string; createdAt?: string; viewCount: number }
export type Page<T> = { records: T[]; total: number; current: number; size: number }
export type ApiResponse<T> = { code: number; message: string; data: T }
