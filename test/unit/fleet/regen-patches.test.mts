// vitest specs for the regenerating-patches plumbing pure helpers:
// parsePatch / normalizeDiffPaths / restampHeader / resolvePatchPath /
// pinForPatch. The gh/http-backed functions (fetchPristine, patchDryRun,
// classifyPatch) need a network / a patch binary and are exercised at the
// integration layer; these specs lock the deterministic parsing + rewriting.

import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { test } from 'vitest'

import {
  normalizeDiffPaths,
  parsePatch,
  pinForPatch,
  resolvePatchPath,
  restampHeader,
} from '../../../.claude/skills/fleet/regenerating-patches/lib/regen-patches.mts'

import type { PluginPin } from '../../../.claude/skills/fleet/regenerating-patches/lib/regen-patches.mts'

const PIN: PluginPin = {
  name: 'my-plugin',
  owner: 'SocketDev',
  path: 'plugins/my-plugin',
  repo: 'socket-marketplace',
  sha: 'cafebabecafebabecafebabecafebabecafebabe',
}

const PATCH = [
  '# @plugin: my-plugin',
  '# @sha: deadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
  '# @plugin-version: 1.0.0',
  '',
  '--- a/src/index.js',
  '+++ b/src/index.js',
  '@@ -1,1 +1,1 @@',
  '-const a = 1',
  '+const a = 2',
  '',
].join('\n')

test('parsePatch splits header from body and reads the plugin + target paths', () => {
  const parsed = parsePatch(PATCH)
  assert.equal(parsed.plugin, 'my-plugin')
  assert.deepEqual([...parsed.targetPaths], ['src/index.js'])
  assert.ok(parsed.header.includes('# @plugin: my-plugin'))
  assert.ok(parsed.header.includes('# @sha:'))
  // The body begins at the first `--- ` line and excludes header lines.
  assert.ok(parsed.body.startsWith('--- a/src/index.js'))
  assert.ok(!parsed.body.includes('# @plugin:'))
})

test('parsePatch yields an empty plugin when no @plugin header is present', () => {
  const parsed = parsePatch('--- a/x\n+++ b/x\n')
  assert.equal(parsed.plugin, '')
  assert.deepEqual([...parsed.targetPaths], ['x'])
})

test('restampHeader rewrites @sha and (optionally) @plugin-version only', () => {
  const { header } = parsePatch(PATCH)
  const stamped = restampHeader({ header, pin: PIN, version: '2.0.0' })
  assert.ok(stamped.includes(`# @sha: ${PIN.sha}`))
  assert.ok(stamped.includes('# @plugin-version: 2.0.0'))
  // The @plugin line is untouched.
  assert.ok(stamped.includes('# @plugin: my-plugin'))
})

test('restampHeader leaves @plugin-version verbatim when no version passed', () => {
  const { header } = parsePatch(PATCH)
  const stamped = restampHeader({ header, pin: PIN })
  assert.ok(stamped.includes(`# @sha: ${PIN.sha}`))
  assert.ok(stamped.includes('# @plugin-version: 1.0.0'))
})

test('normalizeDiffPaths rewrites a/ + b/ headers and strips timestamps', () => {
  const raw = [
    '--- /tmp/stage/old.js\t2026-06-01 12:00:00.000 +0000',
    '+++ /tmp/stage/new.js\t2026-06-01 12:00:01.000 +0000',
    '@@ -1 +1 @@',
    '-a',
    '+b',
  ].join('\n')
  const out = normalizeDiffPaths({
    aPath: '/tmp/stage/old.js',
    bPath: '/tmp/stage/new.js',
    file: 'src/index.js',
    raw,
  })
  assert.ok(out.includes('--- a/src/index.js'))
  assert.ok(out.includes('+++ b/src/index.js'))
  // Timestamps after the tab are stripped.
  assert.ok(!out.includes('2026-06-01'))
})

test('pinForPatch matches by the @plugin header', () => {
  const parsed = parsePatch(PATCH)
  const pin = pinForPatch({ patch: parsed, pins: [PIN] })
  assert.equal(pin.name, 'my-plugin')
})

test('pinForPatch throws when no marketplace pin matches', () => {
  const parsed = parsePatch(PATCH)
  assert.throws(
    () => pinForPatch({ patch: parsed, pins: [] }),
    /no marketplace pin for plugin my-plugin/,
  )
})

test('resolvePatchPath accepts an absolute path and rejects a missing one', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'regen-patches-'))
  const file = path.join(dir, 'present.patch')
  writeFileSync(file, PATCH)
  assert.equal(resolvePatchPath(file), file)
  assert.throws(
    () => resolvePatchPath(path.join(dir, 'absent.patch')),
    /patch not found/,
  )
})
