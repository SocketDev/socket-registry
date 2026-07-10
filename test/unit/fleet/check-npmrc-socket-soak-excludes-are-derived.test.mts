// vitest specs for scripts/fleet/check/npmrc-socket-soak-excludes-are-derived.mts.
// Covers the pure `deriveNpmrcSocketBlock` function and the `runCheck`
// entrypoint against temp fixture dirs. No real repo or network is needed.
// Importing the module executes main() (unguarded try{main()}), which reads the
// live template/base/.npmrc; it returns exitCode 0 in a healthy checkout and
// does not kill the test runner.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, test } from 'vitest'

import {
  deriveNpmrcSocketBlock,
  runCheck,
} from '../../../scripts/fleet/check/npmrc-socket-soak-excludes-are-derived.mts'
import { npmrcSocketSoakExcludeLines } from '../../../scripts/fleet/constants/socket-scopes.mts'

const LINES = npmrcSocketSoakExcludeLines()

function makeNpmrc(dir: string, content: string, relPath = '.npmrc'): string {
  const full = path.join(dir, relPath)
  mkdirSync(path.dirname(full), { recursive: true })
  writeFileSync(full, content)
  return full
}

function tmp(): string {
  return mkdtempSync(path.join(os.tmpdir(), 'npmrc-soak-'))
}

function canonicalNpmrc(): string {
  return [
    'auto-install-peers=true',
    '# BEGIN socket-soak-excludes',
    ...LINES,
    '# END socket-soak-excludes',
    'some-other=setting',
  ].join('\n')
}

describe('deriveNpmrcSocketBlock — pure function', () => {
  test('returns markersOk=false when BEGIN marker is absent', () => {
    const npmrc = 'auto-install-peers=true\nno markers here\n'
    const result = deriveNpmrcSocketBlock(npmrc, LINES)
    assert.equal(result.markersOk, false)
    assert.equal(result.changed, false)
    assert.equal(result.next, npmrc)
  })

  test('returns markersOk=false when END marker is absent', () => {
    const npmrc =
      '# BEGIN socket-soak-excludes\nmin-release-age-exclude[]=@old/*\n'
    const result = deriveNpmrcSocketBlock(npmrc, LINES)
    assert.equal(result.markersOk, false)
    assert.equal(result.next, npmrc)
  })

  test('returns markersOk=false when END appears before BEGIN (reversed)', () => {
    const npmrc =
      '# END socket-soak-excludes\nfoo\n# BEGIN socket-soak-excludes\n'
    const result = deriveNpmrcSocketBlock(npmrc, LINES)
    assert.equal(result.markersOk, false)
    assert.equal(result.next, npmrc)
  })

  test('returns changed=false and markersOk=true when block is already in sync', () => {
    const npmrc = canonicalNpmrc()
    const result = deriveNpmrcSocketBlock(npmrc, LINES)
    assert.equal(result.markersOk, true)
    assert.equal(result.changed, false)
    assert.equal(result.next, npmrc)
  })

  test('returns changed=true and replaces only the lines between the markers', () => {
    const npmrc = [
      'auto-install-peers=true',
      '# BEGIN socket-soak-excludes',
      'min-release-age-exclude[]=@old/*',
      '# END socket-soak-excludes',
      'some-other=setting',
    ].join('\n')
    const result = deriveNpmrcSocketBlock(npmrc, LINES)
    assert.equal(result.markersOk, true)
    assert.equal(result.changed, true)
    assert.ok(result.next.includes('auto-install-peers=true'))
    assert.ok(result.next.includes('some-other=setting'))
    assert.ok(!result.next.includes('min-release-age-exclude[]=@old/*'))
    for (const line of LINES) {
      assert.ok(result.next.includes(line), `expected ${line} in output`)
    }
  })

  test('preserves lines outside the marked block byte-for-byte', () => {
    const before = 'before=1\n'
    const after = '\nafter=2'
    const npmrc = [
      before.trimEnd(),
      '# BEGIN socket-soak-excludes',
      'min-release-age-exclude[]=@stale/*',
      '# END socket-soak-excludes',
      after.trimStart(),
    ].join('\n')
    const result = deriveNpmrcSocketBlock(npmrc, LINES)
    assert.ok(result.next.startsWith('before=1'))
    assert.ok(result.next.endsWith('after=2'))
  })

  test('replaces with an empty lines array, leaving markers adjacent', () => {
    const npmrc = [
      '# BEGIN socket-soak-excludes',
      'min-release-age-exclude[]=@socketsecurity/*',
      '# END socket-soak-excludes',
    ].join('\n')
    const result = deriveNpmrcSocketBlock(npmrc, [])
    assert.equal(result.markersOk, true)
    assert.equal(result.changed, true)
    assert.ok(!result.next.includes('min-release-age-exclude'))
    assert.ok(result.next.includes('# BEGIN socket-soak-excludes'))
    assert.ok(result.next.includes('# END socket-soak-excludes'))
  })
})

describe('runCheck — fixture-dir integration', () => {
  test('returns 0 when no .npmrc exists (inert no-op)', () => {
    const dir = tmp()
    assert.equal(runCheck(dir), 0)
  })

  test('returns 0 when .npmrc block is already derived correctly', () => {
    const dir = tmp()
    makeNpmrc(dir, canonicalNpmrc())
    assert.equal(runCheck(dir), 0)
  })

  test('returns 1 when .npmrc block has drifted (missing markers)', () => {
    const dir = tmp()
    makeNpmrc(
      dir,
      'auto-install-peers=true\nmin-release-age-exclude[]=@socketsecurity/*\n',
    )
    assert.equal(runCheck(dir), 1)
  })

  test('returns 1 when .npmrc block has drifted (stale content between markers)', () => {
    const dir = tmp()
    const stale = [
      '# BEGIN socket-soak-excludes',
      'min-release-age-exclude[]=@stale/*',
      '# END socket-soak-excludes',
    ].join('\n')
    makeNpmrc(dir, stale)
    assert.equal(runCheck(dir), 1)
  })

  test('fix=true rewrites .npmrc and returns 0', () => {
    const dir = tmp()
    const drifted = [
      'auto-install-peers=true',
      '# BEGIN socket-soak-excludes',
      'min-release-age-exclude[]=@old/*',
      '# END socket-soak-excludes',
    ].join('\n')
    makeNpmrc(dir, drifted)
    assert.equal(runCheck(dir, { fix: true }), 0)
    const fixed = readFileSync(path.join(dir, '.npmrc'), 'utf8')
    assert.ok(fixed.includes(LINES[0]!))
    assert.ok(!fixed.includes('min-release-age-exclude[]=@old/*'))
  })

  test('fix=true is a no-op (returns 0) when already in sync', () => {
    const dir = tmp()
    const content = canonicalNpmrc()
    makeNpmrc(dir, content)
    assert.equal(runCheck(dir, { fix: true }), 0)
    assert.equal(readFileSync(path.join(dir, '.npmrc'), 'utf8'), content)
  })

  test('uses template/base/.npmrc when present (wheelhouse mode)', () => {
    const dir = tmp()
    // Live .npmrc is drifted — should be ignored.
    makeNpmrc(
      dir,
      '# BEGIN socket-soak-excludes\nmin-release-age-exclude[]=@wrong/*\n# END socket-soak-excludes\n',
    )
    // Template copy is in sync — check passes.
    const templateContent = [
      '# BEGIN socket-soak-excludes',
      ...LINES,
      '# END socket-soak-excludes',
    ].join('\n')
    makeNpmrc(dir, templateContent, path.join('template', 'base', '.npmrc'))
    assert.equal(runCheck(dir), 0)
  })

  test('template/base/.npmrc drift still fails in wheelhouse mode', () => {
    const dir = tmp()
    // Template is drifted.
    makeNpmrc(
      dir,
      '# BEGIN socket-soak-excludes\nmin-release-age-exclude[]=@wrong/*\n# END socket-soak-excludes\n',
      path.join('template', 'base', '.npmrc'),
    )
    assert.equal(runCheck(dir), 1)
  })
})
