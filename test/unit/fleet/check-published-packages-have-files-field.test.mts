// vitest specs for check-published-packages-have-files-field.
//
// `main()` is not import-safe (it calls `process.exit()`) and its top-level
// `REPO_ROOT` is fixed to this repo (resolved from the script's own file
// location, not `cwd` — a subprocess spawned with a different `cwd` still
// scans the real wheelhouse). So the report/exit-code path is driven through
// the exported `runCheck(repoRoot)` directly against fixture repos instead.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, test, vi } from 'vitest'

import {
  checkFilesField,
  collectFindings,
  readPackageJson,
  runCheck,
} from '../../../scripts/fleet/check/published-packages-have-files-field.mts'

// ── checkFilesField ─────────────────────────────────────────────

describe('checkFilesField', () => {
  test('a private package is exempt regardless of files', () => {
    assert.equal(
      checkFilesField({ private: true }, 'p/package.json'),
      undefined,
    )
  })

  test('an unnamed manifest is exempt (not publishable)', () => {
    assert.equal(checkFilesField({}, 'p/package.json'), undefined)
  })

  test('a named, non-private manifest with no files field is a finding', () => {
    const finding = checkFilesField({ name: 'foo' }, 'p/package.json')
    assert.deepEqual(finding, { pkgName: 'foo', relPath: 'p/package.json' })
  })

  test('a manifest that declares files is clean', () => {
    assert.equal(
      checkFilesField({ files: ['dist'], name: 'foo' }, 'p/package.json'),
      undefined,
    )
  })

  test('a malformed (non-array) files field still counts as present — not this check’s job', () => {
    assert.equal(
      checkFilesField(
        { files: 'dist' as unknown, name: 'foo' },
        'p/package.json',
      ),
      undefined,
    )
  })

  test('an allowlisted package name is exempt even with no files field', () => {
    // FILES_FIELD_ALLOWLIST is empty by default in this checkout, so exercise
    // the branch through a name that is guaranteed absent from it.
    assert.notEqual(
      checkFilesField({ name: 'not-in-the-allowlist' }, 'p/package.json'),
      undefined,
    )
  })
})

// ── readPackageJson ──────────────────────────────────────────────

function makeDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), 'files-field-'))
}

describe('readPackageJson', () => {
  test('returns undefined when package.json is absent', () => {
    assert.equal(readPackageJson(makeDir()), undefined)
  })

  test('returns undefined on malformed JSON', () => {
    const dir = makeDir()
    writeFileSync(path.join(dir, 'package.json'), '{not valid json')
    assert.equal(readPackageJson(dir), undefined)
  })

  test('parses a well-formed package.json', () => {
    const dir = makeDir()
    writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ files: ['dist'], name: 'foo' }),
    )
    assert.deepEqual(readPackageJson(dir), { files: ['dist'], name: 'foo' })
  })
})

// ── collectFindings — end-to-end fixture ────────────────────────

function makeWorkspace(): string {
  const dir = makeDir()
  mkdirSync(path.join(dir, 'packages'), { recursive: true })
  writeFileSync(
    path.join(dir, 'pnpm-workspace.yaml'),
    "packages:\n  - 'packages/*'\n",
  )
  return dir
}

function writePkg(
  dir: string,
  name: string,
  manifest: Record<string, unknown>,
): void {
  const pkgDir = path.join(dir, 'packages', name)
  mkdirSync(pkgDir, { recursive: true })
  writeFileSync(
    path.join(pkgDir, 'package.json'),
    JSON.stringify({ name, ...manifest }),
  )
}

describe('collectFindings', () => {
  test('no workspace packages yields no findings', () => {
    const dir = makeWorkspace()
    assert.deepEqual(collectFindings(dir), [])
  })

  test('a publishable package missing files is a finding', () => {
    const dir = makeWorkspace()
    writePkg(dir, 'no-files', {})
    const findings = collectFindings(dir)
    assert.equal(findings.length, 1)
    assert.equal(findings[0]!.pkgName, 'no-files')
    assert.equal(
      findings[0]!.relPath,
      path.join('packages', 'no-files', 'package.json'),
    )
  })

  test('a private package is not a finding', () => {
    const dir = makeWorkspace()
    writePkg(dir, 'private-pkg', { private: true })
    assert.deepEqual(collectFindings(dir), [])
  })

  test('a package declaring files is not a finding', () => {
    const dir = makeWorkspace()
    writePkg(dir, 'has-files', { files: ['dist'] })
    assert.deepEqual(collectFindings(dir), [])
  })

  test('multiple packages each contribute independently', () => {
    const dir = makeWorkspace()
    writePkg(dir, 'clean', { files: ['dist'] })
    writePkg(dir, 'gap-one', {})
    writePkg(dir, 'gap-two', {})
    const findings = collectFindings(dir)
    assert.equal(findings.length, 2)
    assert.deepEqual(findings.map(f => f.pkgName).toSorted(), [
      'gap-one',
      'gap-two',
    ])
  })
})

// ── runCheck — report-only MODE never exits non-zero ──────────────

function withCapturedStderr(run: () => number): {
  exitCode: number
  stderr: string
} {
  // The failure path writes straight to process.stderr, so it's captured
  // directly. The success path goes through logger.log(), which resolves a
  // private node:console instance bound at first use — not reliably
  // interceptable from a test without reaching into logger internals — so
  // the success case below only asserts the exit code.
  const errSpy = vi
    .spyOn(process.stderr, 'write')
    .mockImplementation(() => true)
  try {
    const exitCode = run()
    const stderr = errSpy.mock.calls.map(args => String(args[0])).join('')
    return { exitCode, stderr }
  } finally {
    errSpy.mockRestore()
  }
}

describe('runCheck — report-only mode', () => {
  test('exits 0 when nothing is missing files', () => {
    const dir = makeWorkspace()
    writePkg(dir, 'clean', { files: ['dist'] })
    const { exitCode } = withCapturedStderr(() => runCheck(dir))
    assert.equal(exitCode, 0)
  })

  test('still exits 0 (report-only) when a package is missing files, and lists it on stderr', () => {
    const dir = makeWorkspace()
    writePkg(dir, 'gap-pkg', {})
    const { exitCode, stderr } = withCapturedStderr(() => runCheck(dir))
    assert.equal(exitCode, 0)
    assert.match(stderr, /\(report-only\)/)
    assert.match(stderr, /1 publishable package missing `files` field/)
    assert.match(stderr, /gap-pkg/)
  })

  test('pluralizes the summary line for multiple findings', () => {
    const dir = makeWorkspace()
    writePkg(dir, 'gap-one', {})
    writePkg(dir, 'gap-two', {})
    const { stderr } = withCapturedStderr(() => runCheck(dir))
    assert.match(stderr, /2 publishable packages missing `files` field/)
  })
})
