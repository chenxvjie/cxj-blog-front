export type EditablePost = {
  id: number; authorId: number; title: string; slug: string; contentMd: string
  summary?: string; status: string; categoryId?: number | null
  coverUrl?: string | null; isTop?: boolean
}

export function postPayload(values: EditablePost, existing?: EditablePost) {
  return {
    title: values.title, slug: values.slug, contentMd: values.contentMd,
    summary: values.summary, status: values.status,
    categoryId: existing?.categoryId ?? null,
    coverUrl: existing?.coverUrl ?? null,
    isTop: existing?.isTop ?? false,
  }
}
