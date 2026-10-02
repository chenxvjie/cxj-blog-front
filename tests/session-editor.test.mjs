import { test } from 'node:test'
import assert from 'node:assert/strict'
import { URL } from 'node:url'
import { moduleUrl } from './load-module.mjs'

const { postPayload } = await import(moduleUrl(new URL('../src/api/postEditor.ts', import.meta.url)))
const { setSession, getSession } = await import(moduleUrl(new URL('../src/api/session.ts', import.meta.url)))
const { queryClient } = await import(moduleUrl(new URL('../src/api/queryClient.ts', import.meta.url)))
const { client } = await import(moduleUrl(new URL('../src/api/client.ts', import.meta.url)))
const values = { title: 'Updated', slug: 'updated', contentMd: 'Body', summary: '', status: 'PUBLISHED' }

test('editing preserves fields absent from the form and excludes server-owned fields', () => {
  const payload = postPayload(values, { categoryId: 9, coverUrl: '/cover.png', isTop: true, authorId: 7, id: 3 })
  assert.deepEqual(payload, { ...values, categoryId: 9, coverUrl: '/cover.png', isTop: true })
})
test('new posts have explicit metadata defaults', () => {
  assert.deepEqual(postPayload(values), { ...values, categoryId: null, coverUrl: null, isTop: false })
})
test('account changes and expiration discard private query data', () => {
  setSession({ accessToken: 'a', user: { id: 1, role: 'ADMIN' } })
  queryClient.setQueryData(['edit-post', 1, 3], { contentMd: 'private draft' })
  setSession({ accessToken: 'b', user: { id: 2, role: 'USER' } })
  assert.equal(queryClient.getQueryCache().getAll().length, 0)
  queryClient.setQueryData(['managed-posts', 2], ['draft'])
  setSession(null)
  assert.equal(queryClient.getQueryCache().getAll().length, 0)
})
test('late 401 from a previous token cannot invalidate the new session', async () => {
  setSession({ accessToken: 'old', user: { id: 1, role: 'USER' } })
  let fail
  let started
  const ready = new Promise(resolve => { started = resolve })
  const pending = client.get('/manage/posts', { adapter: config => new Promise((_, reject) => {
    fail = () => reject({ config, response: { status: 401 } }); started()
  }) })
  await ready
  setSession({ accessToken: 'new', user: { id: 2, role: 'USER' } })
  fail()
  await assert.rejects(pending)
  assert.equal(getSession().accessToken, 'new')
  await assert.rejects(client.get('/manage/posts', { adapter: config => Promise.reject({ config, response: { status: 401 } }) }))
  assert.equal(getSession(), null)
})
