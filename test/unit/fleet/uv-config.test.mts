// vitest specs for the uv-config policy lib: isUvProject (detect [tool.uv]),
// hasExcludeNewer (detect the soak pin), and inspectUvProject's verdict on a
// temp pyproject.toml +/- a sibling uv.lock. The pinned version + soak constant
// guard against silent drift.

import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { test } from 'vitest'

import {
  hasExcludeNewer,
  inspectUvProject,
  isUvProject,
  UV_EXCLUDE_NEWER_SOAK,
  UV_LOCKED_SYNC_CMD,
  UV_PINNED_VERSION,
} from '../../../.claude/hooks/fleet/_shared/uv-config.mts'

// ── pinned policy constants ─────────────────────────────────────

test('uv is pinned to the fleet version', () => {
  assert.equal(UV_PINNED_VERSION, '0.11.21')
})

test('the soak pin matches the 7-day minimumReleaseAge window', () => {
  assert.equal(UV_EXCLUDE_NEWER_SOAK, '7 days')
})

test('the CI sync command is the locked (frozen) form', () => {
  assert.equal(UV_LOCKED_SYNC_CMD, 'uv sync --locked')
})

// ── isUvProject ─────────────────────────────────────────────────

test('isUvProject true for a [tool.uv] table', () => {
  assert.equal(isUvProject('[project]\nname="x"\n\n[tool.uv]\n'), true)
})

test('isUvProject false for a plain pyproject (no [tool.uv])', () => {
  assert.equal(isUvProject('[build-system]\nrequires = ["hatchling"]\n'), false)
})

// ── hasExcludeNewer ─────────────────────────────────────────────

test('hasExcludeNewer true when the soak pin is present', () => {
  assert.equal(hasExcludeNewer('[tool.uv]\nexclude-newer = "7 days"\n'), true)
})

test('hasExcludeNewer false when [tool.uv] omits it', () => {
  assert.equal(hasExcludeNewer('[tool.uv]\nmanaged = true\n'), false)
})

// ── inspectUvProject (temp dir, real FS) ────────────────────────

function withTempProject(
  options: { pyproject: string; withLock: boolean },
  fn: (pyprojectPath: string) => void,
): void {
  const { pyproject, withLock } = options
  const dir = mkdtempSync(path.join(os.tmpdir(), 'uv-config-test-'))
  try {
    const pyprojectPath = path.join(dir, 'pyproject.toml')
    writeFileSync(pyprojectPath, pyproject)
    if (withLock) {
      writeFileSync(path.join(dir, 'uv.lock'), 'version = 1\n')
    }
    fn(pyprojectPath)
  } finally {
    rmSync(dir, { force: true, recursive: true })
  }
}

test('a non-uv pyproject is not applicable (ok, no issues)', () => {
  withTempProject(
    { pyproject: '[build-system]\nrequires = []\n', withLock: false },
    p => {
      const s = inspectUvProject(p)
      assert.equal(s.ok, true)
      assert.deepEqual([...s.issues], [])
    },
  )
})

test('a compliant uv project (lock + soak) passes', () => {
  withTempProject(
    { pyproject: '[tool.uv]\nexclude-newer = "7 days"\n', withLock: true },
    p => {
      const s = inspectUvProject(p)
      assert.equal(s.ok, true)
      assert.equal(s.hasLock, true)
      assert.equal(s.hasExcludeNewer, true)
    },
  )
})

test('a uv project missing the lock fails with a uv.lock issue', () => {
  withTempProject(
    { pyproject: '[tool.uv]\nexclude-newer = "7 days"\n', withLock: false },
    p => {
      const s = inspectUvProject(p)
      assert.equal(s.ok, false)
      assert.equal(s.hasLock, false)
      assert.ok(s.issues.some(i => i.includes('uv.lock')))
    },
  )
})

test('a uv project missing the soak pin fails with an exclude-newer issue', () => {
  withTempProject(
    { pyproject: '[tool.uv]\nmanaged = true\n', withLock: true },
    p => {
      const s = inspectUvProject(p)
      assert.equal(s.ok, false)
      assert.equal(s.hasExcludeNewer, false)
      assert.ok(s.issues.some(i => i.includes('exclude-newer')))
    },
  )
})
