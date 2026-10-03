import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { File } from 'node:buffer'
import { URL } from 'node:url'
import { moduleUrl } from './load-module.mjs'

const { Response, AbortController } = globalThis

const { uploadImage } = await import(moduleUrl(new URL('../src/api/images.ts', import.meta.url)))
const { client } = await import(moduleUrl(new URL('../src/api/client.ts', import.meta.url)))
const { setSession } = await import(moduleUrl(new URL('../src/api/session.ts', import.meta.url)))
const file = new File(['abc'], 'photo.png', { type: 'image/png' })

test('direct upload signs checksum, omits blog credentials and finalizes before returning CDN URL', async () => {
  const originalFetch = globalThis.fetch
  const originalAdapter = client.defaults.adapter
  const calls = []
  const cdn = 'https://img.example.test/images/uploads/8/a.png'
  setSession({ accessToken: 'private-blog-token', user: { id: 8, role: 'USER' } })
  try {
    client.defaults.adapter = async config => {
      calls.push(config.url)
      if (config.url.endsWith('upload-url')) {
        const body = JSON.parse(config.data)
        assert.equal(body.contentMd5, createHash('md5').update('abc').digest('base64'))
        assert.equal(body.size, 3)
        return { status: 200, config, data: { data: { uploadId: 'ticket', uploadUrl: 'https://cos.example.test/signed',
          headers: { 'Content-Type': 'image/png', 'Content-MD5': body.contentMd5, 'Content-Length': '3', 'x-cos-forbid-overwrite': 'true' } } } }
      }
      assert.deepEqual(JSON.parse(config.data), { uploadId: 'ticket' })
      return { status: 200, config, data: { data: { publicUrl: cdn } } }
    }
    globalThis.fetch = async (url, options) => {
      calls.push('cos')
      assert.equal(url, 'https://cos.example.test/signed')
      assert.equal(options.method, 'PUT')
      assert.equal(options.credentials, 'omit')
      assert.equal(options.headers.Authorization, undefined)
      assert.equal(options.headers['Content-Length'], undefined)
      assert.equal(options.headers['x-cos-forbid-overwrite'], 'true')
      assert.equal(options.body, file)
      return new Response(null, { status: 200 })
    }
    assert.equal(await uploadImage(file, new AbortController().signal), cdn)
    assert.deepEqual(calls, ['/manage/images/upload-url', 'cos', '/manage/images/complete'])
  } finally { client.defaults.adapter = originalAdapter; globalThis.fetch = originalFetch; setSession(null) }
})

test('COS failure does not finalize or report success', async () => {
  const originalFetch = globalThis.fetch
  const originalAdapter = client.defaults.adapter
  const calls = []
  try {
    client.defaults.adapter = async config => {
      calls.push(config.url)
      return { status: 200, config, data: { data: { uploadId: 'ticket', uploadUrl: 'https://cos.example.test/signed', headers: {} } } }
    }
    globalThis.fetch = async () => new Response(null, { status: 403 })
    await assert.rejects(uploadImage(file, new AbortController().signal), /图片上传失败/)
    assert.deepEqual(calls, ['/manage/images/upload-url'])
  } finally { client.defaults.adapter = originalAdapter; globalThis.fetch = originalFetch }
})

test('invalid image or cancelled request never requests an upload URL', async () => {
  const originalAdapter = client.defaults.adapter
  try {
    client.defaults.adapter = () => { throw new Error('network should not run') }
    await assert.rejects(uploadImage(new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' }), new AbortController().signal), /5 MB/)
    await assert.rejects(uploadImage(new File([], 'empty.png', { type: 'image/png' }), new AbortController().signal), /5 MB/)
    await assert.rejects(uploadImage(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' }), new AbortController().signal), /5 MB/)
    const aborted = new AbortController(); aborted.abort()
    await assert.rejects(uploadImage(file, aborted.signal), { name: 'AbortError' })
  } finally { client.defaults.adapter = originalAdapter }
})
