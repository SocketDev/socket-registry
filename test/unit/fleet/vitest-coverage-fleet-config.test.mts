import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, test } from 'vitest'

import {
  baseFleetCoverageConfig,
  readRepoCoverageOverlay,
  resolveCoverageConfig,
} from '../../../.config/fleet/vitest.coverage.fleet.config.mts'

const tmpDirs: string[] = []

function writeOverlay(content: string): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'coverage-overlay-'))
  tmpDirs.push(dir)
  const overlayPath = path.join(dir, 'coverage.json')
  writeFileSync(overlayPath, content)
  return overlayPath
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    rmSync(dir, { force: true, recursive: true })
  }
})

test('no overlay file falls through to the fleet base untouched', () => {
  const resolved = resolveCoverageConfig({
    overlayPath: path.join(os.tmpdir(), 'coverage-overlay-none', 'nope.json'),
  })
  assert.deepEqual(resolved.include, baseFleetCoverageConfig.include)
  assert.deepEqual(resolved.exclude, baseFleetCoverageConfig.exclude)
})

test('overlay include REPLACES the base include set', () => {
  const overlayPath = writeOverlay(
    JSON.stringify({ include: ['template/base/scripts/**/*.mts'] }),
  )
  const resolved = resolveCoverageConfig({ overlayPath })
  assert.deepEqual(resolved.include, ['template/base/scripts/**/*.mts'])
})

test('overlay exclude.remove filters base entries; exclude.add appends', () => {
  const overlayPath = writeOverlay(
    JSON.stringify({
      exclude: {
        add: ['template/base/scripts/**/test/**'],
        remove: ['scripts/**', '**/[.]**'],
      },
    }),
  )
  const resolved = resolveCoverageConfig({ overlayPath })
  assert.ok(!resolved.exclude!.includes('scripts/**'))
  assert.ok(!resolved.exclude!.includes('**/[.]**'))
  assert.ok(resolved.exclude!.includes('template/base/scripts/**/test/**'))
  assert.ok(resolved.exclude!.includes('**/node_modules/**'))
})

test('an empty overlay include keeps the base include', () => {
  const overlayPath = writeOverlay(JSON.stringify({ include: [] }))
  const resolved = resolveCoverageConfig({ overlayPath })
  assert.deepEqual(resolved.include, baseFleetCoverageConfig.include)
})

test('a torn overlay file fails soft to the fleet base', () => {
  const overlayPath = writeOverlay('{ not json')
  assert.deepEqual(readRepoCoverageOverlay({ overlayPath }), {})
  const resolved = resolveCoverageConfig({ overlayPath })
  assert.deepEqual(resolved.exclude, baseFleetCoverageConfig.exclude)
})

test('the resolver never mutates the base config arrays', () => {
  const overlayPath = writeOverlay(
    JSON.stringify({ exclude: { add: ['extra/**'] } }),
  )
  const before = [...baseFleetCoverageConfig.exclude!]
  resolveCoverageConfig({ overlayPath })
  assert.deepEqual(baseFleetCoverageConfig.exclude, before)
})
