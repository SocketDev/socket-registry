import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { expect, test } from 'vitest'

import { discoverRepoChecks } from '../../../scripts/fleet/_shared/repo-checks.mts'

function makeRepo(): string {
  return mkdtempSync(path.join(os.tmpdir(), 'repo-checks-'))
}

test('absent scripts/repo/check dir is the vacuous pass — empty list', () => {
  const root = makeRepo()
  expect(discoverRepoChecks(root)).toEqual([])
})

test('empty scripts/repo/check dir yields an empty list', () => {
  const root = makeRepo()
  mkdirSync(path.join(root, 'scripts', 'repo', 'check'), { recursive: true })
  expect(discoverRepoChecks(root)).toEqual([])
})

test('discovers only .mts files, ASCII-sorted, as repo-root-relative paths', () => {
  const root = makeRepo()
  const dir = path.join(root, 'scripts', 'repo', 'check')
  mkdirSync(dir, { recursive: true })
  writeFileSync(path.join(dir, 'zeta-is-checked.mts'), '')
  writeFileSync(path.join(dir, 'alpha-is-checked.mts'), '')
  writeFileSync(path.join(dir, 'notes.md'), '')
  writeFileSync(path.join(dir, 'helper.js'), '')
  expect(discoverRepoChecks(root)).toEqual([
    'scripts/repo/check/alpha-is-checked.mts',
    'scripts/repo/check/zeta-is-checked.mts',
  ])
})
