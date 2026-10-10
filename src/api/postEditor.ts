export type EditablePost = {
  id: number; authorId: number; title: string; slug: string; contentMd: string
  summary?: string; status: string; categoryId?: number | null
  coverUrl?: string | null; isTop?: boolean
  tagIds?: number[]; publicStatus?: string; reviewReason?: string; hasSubmission?: boolean; publishedAt?: string
}

export function postPayload(values: EditablePost, existing?: EditablePost) {
  return {
    title: values.title, slug: values.slug, contentMd: values.contentMd,
    summary: values.summary, status: values.status,
    categoryId: values.categoryId !== undefined ? values.categoryId : existing?.categoryId ?? null,
    coverUrl: values.coverUrl !== undefined ? values.coverUrl : existing?.coverUrl ?? null,
    isTop: values.isTop !== undefined ? values.isTop : existing?.isTop ?? false,
    ...(values.tagIds !== undefined || existing?.tagIds !== undefined ? { tagIds: values.tagIds ?? existing?.tagIds ?? [] } : {}),
  }
}
