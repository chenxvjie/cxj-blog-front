import { test } from 'node:test'
import assert from 'node:assert/strict'
import { URL } from 'node:url'
import { moduleUrl } from './load-module.mjs'

const { createAnalytics, publicAnalyticsPath } = await import(moduleUrl(new URL('../src/api/analytics.ts', import.meta.url)))
const siteId = 'ee599e3ace5bd9241f2039baf24a2bc5'
test('business events require a ready SDK, public route and continued consent', () => {
  const f = fixture(); f.analytics.visit(visit()); f.analytics.event('article_open')
  assert.deepEqual(f.sent, [])
  f.ready(); f.analytics.event('article_open')
  assert.deepEqual(f.sent.at(-1), ['_trackEvent', 'blog', 'article_open'])
  f.choose('denied'); const count = f.sent.length; f.analytics.event('article_end')
  assert.equal(f.sent.length, count)
  f.choose('granted'); f.analytics.visit(visit('/admin/posts', 'private')); const privateCount = f.sent.length
  f.analytics.event('search'); assert.equal(f.sent.length, privateCount)
})
const visit = (pathname = '/', key = 'a', extras = {}) => ({ origin: 'https://chenxujie-bolg.cn', pathname, key, search: '', hash: '', ...extras })
function fixture(overrides = {}) {
  const loads = [], sent = [], enabled = []
  let consent = 'granted', ready, failed
  const analytics = createAnalytics({ production: true, siteId, consent: () => consent,
    load: (id, commands, onReady, onFailed) => { loads.push({ id, commands }); ready = onReady; failed = onFailed },
    send: command => sent.push(command), enabled: value => enabled.push(value), ...overrides })
  return { analytics, loads, sent, enabled, ready: () => ready(), fail: () => failed(),
    choose(value) { consent = value; analytics.consentChanged() } }
}

test('unselected and denied consent never load the SDK or queue public PV', () => {
  const f = fixture(); f.choose(null); f.analytics.visit(visit()); f.choose('denied')
  assert.deepEqual(f.loads, []); assert.deepEqual(f.sent, [])
})
test('production guard rejects development, foreign origin and invalid or empty ID', () => {
  for (const options of [{ production: false }, { siteId: '' }, { siteId: 'bad' }]) {
    const f = fixture(options); f.analytics.visit(visit()); assert.deepEqual(f.loads, [])
  }
  const f = fixture(); f.analytics.visit(visit('/', 'a', { origin: 'http://localhost:5173' })); assert.deepEqual(f.loads, [])
})
test('agreeing loads once with auto-PV and automatic click tracking disabled', () => {
  const f = fixture(); f.choose(null); f.analytics.visit(visit()); f.choose('granted')
  assert.deepEqual(f.loads, [{ id: siteId, commands: [['_setAutoPageview', false], ['_setAutoEventTracking', false]] }])
  assert.deepEqual(f.sent, []); f.ready(); assert.deepEqual(f.sent, [['_trackPageview', '/']])
})
test('strict mode repeats and identical route notifications do not duplicate PV', () => {
  const f = fixture(); f.analytics.visit(visit()); f.analytics.visit(visit()); f.ready(); f.analytics.visit(visit()); f.choose('granted')
  assert.equal(f.loads.length, 1); assert.deepEqual(f.sent, [['_trackPageview', '/']])
})
test('article navigation and back navigation each count once even if the history key repeats', () => {
  const f = fixture(); f.analytics.visit(visit()); f.ready()
  f.analytics.visit(visit('/posts/test', 'b')); f.analytics.visit(visit('/', 'a'))
  assert.deepEqual(f.sent, [['_trackPageview', '/'], ['_trackPageview', '/posts/test'], ['_trackPageview', '/']])
})
test('route changes before SDK load preserve permitted visits without loading twice', () => {
  const f = fixture(); f.analytics.visit(visit()); f.analytics.visit(visit('/archive', 'b')); f.ready()
  assert.equal(f.loads.length, 1); assert.deepEqual(f.sent, [['_trackPageview', '/'], ['_trackPageview', '/archive']])
})
test('direct login, management, search, unknown and parameterized routes never load', () => {
  for (const v of [visit('/auth'), visit('/admin/editor'), visit('/search'), visit('/not-found'),
    visit('/', 'a', { search: '?email=private@example.test' }), visit('/posts/test', 'a', { hash: '#private' })]) {
    const f = fixture(); f.analytics.visit(v); assert.deepEqual(f.loads, []); assert.equal(publicAnalyticsPath(v), null)
  }
})
test('private route disables loaded SDK; returning to public resumes with one PV', () => {
  const f = fixture(); f.analytics.visit(visit()); f.ready(); f.analytics.visit(visit('/admin/editor', 'b'))
  assert.deepEqual(f.enabled, [false]); assert.equal(f.sent.length, 1)
  f.analytics.visit(visit('/about', 'c')); assert.deepEqual(f.enabled, [false, true]); assert.equal(f.loads.length, 1)
  assert.deepEqual(f.sent.at(-1), ['_trackPageview', '/about'])
})
test('revoking consent prevents subsequent route reports, regrant counts only current page', () => {
  const f = fixture(); f.analytics.visit(visit()); f.ready(); f.choose('denied'); f.analytics.visit(visit('/about', 'b'))
  assert.deepEqual(f.enabled, [false]); assert.equal(f.sent.length, 1)
  f.choose('granted'); f.choose('granted'); assert.equal(f.sent.length, 2); assert.deepEqual(f.sent.at(-1), ['_trackPageview', '/about'])
})
test('revocation during load discards queued visits and late onload cannot send', () => {
  const f = fixture(); f.analytics.visit(visit()); f.choose('denied'); f.ready(); assert.deepEqual(f.sent, [])
  f.choose('granted'); assert.deepEqual(f.sent, [['_trackPageview', '/']]); assert.equal(f.loads.length, 1)
})
test('private navigation while loading prevents late callback from leaking any PV', () => {
  const f = fixture(); f.analytics.visit(visit()); f.analytics.visit(visit('/auth', 'b')); f.ready()
  assert.deepEqual(f.sent, []); assert.deepEqual(f.enabled, [false])
})
test('blocked third-party script does not cause retries or unhandled route errors', () => {
  const f = fixture(); f.analytics.visit(visit()); f.fail(); f.analytics.visit(visit('/about', 'b'))
  assert.equal(f.loads.length, 1); assert.deepEqual(f.sent, [])
})
