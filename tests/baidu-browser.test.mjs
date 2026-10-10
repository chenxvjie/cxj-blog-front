import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { Buffer } from 'node:buffer'
import { URL } from 'node:url'
import ts from 'typescript'
import { moduleUrl } from './load-module.mjs'

let sequence = 0
const { EventTarget, Event } = globalThis
async function browserFixture() {
  const original = { window: globalThis.window, document: globalThis.document, localStorage: globalThis.localStorage }
  const storage = new Map(), scripts = []
  const window = new EventTarget()
  globalThis.window = window
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }
  globalThis.document = {
    createElement: () => ({ remove() { this.removed = true } }),
    head: { appendChild: script => scripts.push(script) },
  }
  const analyticsUrl = moduleUrl(new URL('../src/api/analytics.ts', import.meta.url))
  const source = readFileSync(new URL('../src/api/baidu.ts', import.meta.url), 'utf8')
    .replace("'./analytics'", JSON.stringify(analyticsUrl))
    .replace('!import.meta.env.DEV', 'true')
    .replace('import.meta.env.VITE_BAIDU_ANALYTICS_ID', "'ee599e3ace5bd9241f2039baf24a2bc5'")
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
  const api = await import(`data:text/javascript;base64,${Buffer.from(outputText + `\n// fixture ${sequence++}`).toString('base64')}`)
  return { api, window, storage, scripts, restore() {
    for (const [name, value] of Object.entries(original)) {
      if (value === undefined) delete globalThis[name]; else globalThis[name] = value
    }
  } }
}
const visit = { origin: 'https://chenxujie-bolg.cn', pathname: '/', key: 'a', search: '', hash: '' }

test('browser adapter waits for consent and only creates one HTTPS async script', async () => {
  const f = await browserFixture()
  try {
    f.api.baidu.visit(visit); assert.equal(f.scripts.length, 0)
    f.api.setAnalyticsConsent('granted')
    assert.equal(f.scripts.length, 1)
    assert.equal(f.scripts[0].src, 'https://hm.baidu.com/hm.js?ee599e3ace5bd9241f2039baf24a2bc5')
    assert.equal(f.scripts[0].async, true); assert.equal(f.scripts[0].referrerPolicy, 'no-referrer')
    assert.deepEqual(f.window._hmt, [['_setAutoPageview', false], ['_setAutoEventTracking', false]])
    f.scripts[0].onload(); f.api.baidu.visit(visit)
    assert.equal(f.scripts.length, 1)
    assert.deepEqual(f.window._hmt.at(-1), ['_trackPageview', '/'])
  } finally { f.restore() }
})
test('revoking while downloading clears the queue and disables SDK before late load', async () => {
  const f = await browserFixture()
  try {
    f.api.baidu.visit(visit); f.api.setAnalyticsConsent('granted'); f.api.setAnalyticsConsent('denied')
    assert.deepEqual(f.window._hmt, [['_setAutoPageview', false], ['_setAutoEventTracking', false], ['_setAutoTracking', false]])
    f.scripts[0].onload()
    assert.equal(f.window._hmt.some(command => command[0] === '_trackPageview'), false)
  } finally { f.restore() }
})
test('storage write failure still applies rejection immediately even with a saved grant', async () => {
  const f = await browserFixture()
  try {
    f.storage.set('analytics-consent', 'granted'); f.api.baidu.visit(visit)
    globalThis.localStorage.setItem = () => { throw new Error('storage quota') }
    f.api.setAnalyticsConsent('denied')
    assert.equal(f.api.analyticsConsent(), 'denied')
    f.scripts[0].onload()
    assert.equal(f.window._hmt.some(command => command[0] === '_trackPageview'), false)
  } finally { f.restore() }
})
test('cross-tab storage updates stop tracking and privacy preference listeners clean up', async () => {
  const f = await browserFixture()
  try {
    const unsubscribe = f.api.subscribeAnalyticsConsent(() => f.api.baidu.consentChanged())
    f.api.baidu.visit(visit); f.api.setAnalyticsConsent('granted'); f.scripts[0].onload()
    f.storage.set('analytics-consent', 'denied')
    const event = new Event('storage'); Object.defineProperty(event, 'key', { value: 'analytics-consent' })
    f.window.dispatchEvent(event)
    assert.deepEqual(f.window._hmt.at(-1), ['_setAutoTracking', false])
    let opened = 0
    const close = f.api.subscribeAnalyticsPreferences(() => { opened++ })
    f.api.openAnalyticsPreferences(); close(); f.api.openAnalyticsPreferences(); unsubscribe()
    assert.equal(opened, 1)
  } finally { f.restore() }
})
