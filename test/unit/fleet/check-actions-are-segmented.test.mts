/**
 * @file Unit tests for scripts/fleet/check/actions-are-segmented.mts —
 *   `.github/actions/` must contain only the `fleet/` + `repo/` segment dirs;
 *   a flat action dir or stray file is a violation; dotfiles are markers, not
 *   actions; a repo without local actions passes.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterAll, describe, expect, test } from 'vitest'

import { findUnsegmentedEntries } from '../../../scripts/fleet/check/actions-are-segmented.mts'

const tmpDirs: string[] = []

function makeActionsDir(): string {
  const d = mkdtempSync(path.join(os.tmpdir(), 'actions-segmented-test-'))
  tmpDirs.push(d)
  return path.join(d, '.github', 'actions')
}

afterAll(() => {
  for (let i = 0, { length } = tmpDirs; i < length; i += 1) {
    rmSync(tmpDirs[i]!, { recursive: true, force: true })
  }
})

describe('findUnsegmentedEntries', () => {
  test('missing .github/actions/ passes (repos without local actions)', () => {
    const actionsDir = makeActionsDir()
    expect(findUnsegmentedEntries(actionsDir)).toEqual([])
  })

  test('fleet/ + repo/ only is clean', () => {
    const actionsDir = makeActionsDir()
    mkdirSync(path.join(actionsDir, 'fleet', 'setup'), { recursive: true })
    mkdirSync(path.join(actionsDir, 'repo'), { recursive: true })
    expect(findUnsegmentedEntries(actionsDir)).toEqual([])
  })

  test('a flat action dir is a violation', () => {
    const actionsDir = makeActionsDir()
    mkdirSync(path.join(actionsDir, 'fleet'), { recursive: true })
    mkdirSync(path.join(actionsDir, 'setup-and-install'), { recursive: true })
    expect(findUnsegmentedEntries(actionsDir)).toEqual(['setup-and-install'])
  })

  test('a stray file is a violation (never a valid composite action)', () => {
    const actionsDir = makeActionsDir()
    mkdirSync(actionsDir, { recursive: true })
    writeFileSync(path.join(actionsDir, 'action.yml'), 'name: stray\n')
    expect(findUnsegmentedEntries(actionsDir)).toEqual(['action.yml'])
  })

  test('a file named fleet is a violation (segments are directories)', () => {
    const actionsDir = makeActionsDir()
    mkdirSync(actionsDir, { recursive: true })
    writeFileSync(path.join(actionsDir, 'fleet'), 'not a dir\n')
    expect(findUnsegmentedEntries(actionsDir)).toEqual(['fleet'])
  })

  test('dotfiles are markers, not violations', () => {
    const actionsDir = makeActionsDir()
    mkdirSync(path.join(actionsDir, 'fleet'), { recursive: true })
    writeFileSync(path.join(actionsDir, '.gitkeep'), '')
    writeFileSync(path.join(actionsDir, '.DS_Store'), '')
    expect(findUnsegmentedEntries(actionsDir)).toEqual([])
  })

  test('violations are sorted for deterministic output', () => {
    const actionsDir = makeActionsDir()
    mkdirSync(path.join(actionsDir, 'zeta'), { recursive: true })
    mkdirSync(path.join(actionsDir, 'alpha'), { recursive: true })
    expect(findUnsegmentedEntries(actionsDir)).toEqual(['alpha', 'zeta'])
  })
})

describe('the wheelhouse itself', () => {
  test('the live .github/actions/ is segmented', () => {
    // scripts/fleet/check/actions-are-segmented.mts → repo root is 4 up from
    // this test file's dir (test/unit/fleet/ → root), template-aware: when run
    // from template/base (FLEET_TEST_TEMPLATE) the live root is 2 further up.
    const here = path.dirname(new URL(import.meta.url).pathname)
    let root = path.resolve(here, '..', '..', '..')
    if (path.basename(path.dirname(root)) === 'template') {
      root = path.resolve(root, '..', '..')
    }
    const actionsDir = path.join(root, '.github', 'actions')
    expect(findUnsegmentedEntries(actionsDir)).toEqual([])
  })
})
