// vitest spec for uv-lockfiles-are-current. The pure exported functions
// (isUvProject, hasExcludeNewer, inspectUvProject) from the shared uv-config
// module are exercised with temp fs fixtures; no git, network, or uv binary is
// needed. The check script itself has module-level side effects (git ls-files),
// so tests target the shared library it depends on directly.

import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, test } from 'vitest'

import {
  hasExcludeNewer,
  inspectUvProject,
  isUvProject,
  UV_EXCLUDE_NEWER_SOAK,
  UV_LOCKED_SYNC_CMD,
} from '../../../.claude/hooks/fleet/_shared/uv-config.mts'

// ---------------------------------------------------------------------------
// isUvProject
// ---------------------------------------------------------------------------

describe('isUvProject', () => {
  test('returns true when [tool.uv] table is present', () => {
    assert.equal(isUvProject('[tool.uv]\nexclude-newer = "7 days"\n'), true)
  })

  test('returns true for [tool.uv] with leading spaces on the line', () => {
    assert.equal(
      isUvProject('[build-system]\nrequires = ["setuptools"]\n\n[tool.uv]\n'),
      true,
    )
  })

  test('returns false for a plain pyproject with no [tool.uv]', () => {
    assert.equal(
      isUvProject('[project]\nname = "mypackage"\nversion = "0.1.0"\n'),
      false,
    )
  })

  test('returns false for a partial match that is not the exact table header', () => {
    // [tool.uv.sources] is a sub-table; should still trigger as having [tool.uv]
    // as a prefix, but [tool.uvx] should NOT match
    assert.equal(isUvProject('[tool.uvx]\nfoo = "bar"\n'), false)
  })
})

// ---------------------------------------------------------------------------
// hasExcludeNewer
// ---------------------------------------------------------------------------

describe('hasExcludeNewer', () => {
  test('returns true when exclude-newer is present', () => {
    assert.equal(hasExcludeNewer('[tool.uv]\nexclude-newer = "7 days"\n'), true)
  })

  test('returns true with extra spaces around the equals sign', () => {
    assert.equal(
      hasExcludeNewer('[tool.uv]\nexclude-newer  =  "7 days"\n'),
      true,
    )
  })

  test('returns false when exclude-newer is absent', () => {
    assert.equal(hasExcludeNewer('[tool.uv]\nfoo = "bar"\n'), false)
  })
})

// ---------------------------------------------------------------------------
// inspectUvProject — helper to create a temp pyproject.toml
// ---------------------------------------------------------------------------

function writePyproject(content: string, withLock = false): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'uv-check-'))
  const pyprojectPath = path.join(dir, 'pyproject.toml')
  writeFileSync(pyprojectPath, content, 'utf8')
  if (withLock) {
    writeFileSync(path.join(dir, 'uv.lock'), 'version = 1\n', 'utf8')
  }
  return pyprojectPath
}

describe('inspectUvProject', () => {
  test('non-uv pyproject returns ok:true with no issues (vacuous pass)', () => {
    const pyprojectPath = writePyproject(
      '[project]\nname = "plain"\nversion = "0.1.0"\n',
    )
    const status = inspectUvProject(pyprojectPath)
    assert.equal(status.ok, true)
    assert.equal(status.hasLock, false)
    assert.equal(status.hasExcludeNewer, false)
    assert.deepEqual(status.issues, [])
    assert.equal(status.pyprojectPath, pyprojectPath)
  })

  test('uv project with uv.lock + exclude-newer returns ok:true', () => {
    const pyprojectPath = writePyproject(
      '[project]\nname = "myapp"\n\n[tool.uv]\nexclude-newer = "7 days"\n',
      true,
    )
    const status = inspectUvProject(pyprojectPath)
    assert.equal(status.ok, true)
    assert.equal(status.hasLock, true)
    assert.equal(status.hasExcludeNewer, true)
    assert.deepEqual(status.issues, [])
  })

  test('uv project missing uv.lock returns ok:false with a lock issue', () => {
    const pyprojectPath = writePyproject(
      '[project]\nname = "myapp"\n\n[tool.uv]\nexclude-newer = "7 days"\n',
      false,
    )
    const status = inspectUvProject(pyprojectPath)
    assert.equal(status.ok, false)
    assert.equal(status.hasLock, false)
    assert.equal(status.hasExcludeNewer, true)
    assert.equal(status.issues.length, 1)
    assert.match(status.issues[0]!, /missing uv\.lock/)
    assert.match(
      status.issues[0]!,
      new RegExp(UV_LOCKED_SYNC_CMD.replace(/--/, '\\-\\-')),
    )
  })

  test('uv project missing exclude-newer returns ok:false with a soak-pin issue', () => {
    const pyprojectPath = writePyproject(
      '[project]\nname = "myapp"\n\n[tool.uv]\nfoo = "bar"\n',
      true,
    )
    const status = inspectUvProject(pyprojectPath)
    assert.equal(status.ok, false)
    assert.equal(status.hasLock, true)
    assert.equal(status.hasExcludeNewer, false)
    assert.equal(status.issues.length, 1)
    assert.match(status.issues[0]!, /exclude-newer/)
    assert.match(status.issues[0]!, new RegExp(UV_EXCLUDE_NEWER_SOAK))
  })

  test('uv project missing both uv.lock and exclude-newer returns two issues', () => {
    const pyprojectPath = writePyproject(
      '[project]\nname = "myapp"\n\n[tool.uv]\nfoo = "bar"\n',
      false,
    )
    const status = inspectUvProject(pyprojectPath)
    assert.equal(status.ok, false)
    assert.equal(status.hasLock, false)
    assert.equal(status.hasExcludeNewer, false)
    assert.equal(status.issues.length, 2)
    assert.match(status.issues[0]!, /missing uv\.lock/)
    assert.match(status.issues[1]!, /exclude-newer/)
  })

  test('unreadable path returns ok:false with a read-error issue', () => {
    const status = inspectUvProject('/nonexistent/path/pyproject.toml')
    assert.equal(status.ok, false)
    assert.equal(status.hasLock, false)
    assert.equal(status.hasExcludeNewer, false)
    assert.equal(status.issues.length, 1)
    assert.match(status.issues[0]!, /could not read/)
  })
})

// ---------------------------------------------------------------------------
// Exported constants are the canonical policy values
// ---------------------------------------------------------------------------

describe('UV policy constants', () => {
  test('UV_EXCLUDE_NEWER_SOAK matches the 7-day fleet soak window', () => {
    assert.equal(UV_EXCLUDE_NEWER_SOAK, '7 days')
  })

  test('UV_LOCKED_SYNC_CMD is the CI reproducibility command', () => {
    assert.equal(UV_LOCKED_SYNC_CMD, 'uv sync --locked')
  })
})
