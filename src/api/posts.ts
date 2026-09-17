import { client } from './client'
import type { ApiResponse, BlogPost, Page } from '../types/blog'
export async function getPosts() { return (await client.get<ApiResponse<Page<BlogPost>>>('/posts')).data.data }
export async function getPost(slug: string) { return (await client.get<ApiResponse<BlogPost>>(`/posts/${slug}`)).data.data }
