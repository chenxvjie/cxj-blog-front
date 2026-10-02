import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import { Buffer } from 'node:buffer'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'

const source = readFileSync(new URL('../src/api/permissions.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const { canManagePost } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
const user = { id: 7, role: 'USER' }
test('visitors cannot manage articles', () => assert.equal(canManagePost(null, { authorId: 7 }), false))
test('users can manage their own articles', () => assert.equal(canManagePost(user, { authorId: 7 }), true))
test('users cannot manage other authors articles', () => assert.equal(canManagePost(user, { authorId: 8 }), false))
test('administrators can manage all authors articles', () => assert.equal(canManagePost({ id: 1, role: 'ADMIN' }, { authorId: 8 }), true))
test('missing author does not grant user access', () => assert.equal(canManagePost(user, {}), false))
test('unloaded articles do not grant access', () => assert.equal(canManagePost({ id: 1, role: 'ADMIN' }, null), false))
test('string author identifiers are supported', () => assert.equal(canManagePost(user, { authorId: '7' }), true))
test('unknown roles do not grant access', () => assert.equal(canManagePost({ id: 7, role: 'UNKNOWN' }, { authorId: 7 }), false))
