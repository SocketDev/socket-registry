// vitest specs for check-public-files-are-exported.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { test } from 'vitest'

import {
  binTargetsOf,
  checkPackageExports,
  collectExportTargets,
  collectPublicFiles,
} from '../../../scripts/fleet/check/public-files-are-exported.mts'

function makePkg(files: Record<string, string>): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'exports-cover-'))
  for (const { 0: rel, 1: content } of Object.entries(files)) {
    const abs = path.join(dir, rel)
    mkdirSync(path.dirname(abs), { recursive: true })
    writeFileSync(abs, content)
  }
  return dir
}

// ── collectExportTargets: descend through conditions ────────────

test('collectExportTargets gathers leaf strings from nested conditions', () => {
  const targets = collectExportTargets({
    '.': {
      source: './src/index.ts',
      browser: { types: './dist/index.d.ts', default: './dist/browser.js' },
      types: './dist/index.d.ts',
      default: './dist/index.js',
    },
    './data/x.json': './dist/data/x.json',
  })
  assert.ok(targets.has('./dist/index.js'))
  assert.ok(targets.has('./dist/browser.js'))
  assert.ok(targets.has('./dist/data/x.json'))
  assert.ok(targets.has('./src/index.ts'))
})

// ── collectPublicFiles: walk dist, apply privacy taxonomy ───────

test('collectPublicFiles returns public dist files, skips private + junk', () => {
  const dir = makePkg({
    'dist/index.js': '//',
    'dist/arrays/sort.js': '//',
    'dist/external/dep.js': '//', // private (external/)
    'dist/_internal/x.js': '//', // private (_)
    'dist/index.d.ts': '//',
  })
  const files = collectPublicFiles(dir).toSorted()
  assert.deepEqual(files, [
    'dist/arrays/sort.js',
    'dist/index.d.ts',
    'dist/index.js',
  ])
})

// ── checkPackageExports: both failure modes + clean ─────────────

test('clean package: every target resolves + every public file exported', () => {
  const dir = makePkg({
    'dist/index.js': '//',
    'dist/index.d.ts': '//',
  })
  const exportsValue = {
    '.': { types: './dist/index.d.ts', default: './dist/index.js' },
  }
  const findings = checkPackageExports('pkg', dir, exportsValue)
  assert.equal(findings.length, 0)
})

test('flags a stale export (target file missing)', () => {
  const dir = makePkg({ 'dist/index.js': '//', 'dist/index.d.ts': '//' })
  const exportsValue = {
    '.': { default: './dist/index.js', types: './dist/index.d.ts' },
    './gone': { default: './dist/gone.js' }, // file does not exist
  }
  const findings = checkPackageExports('pkg', dir, exportsValue)
  assert.equal(findings.length, 1)
  assert.equal(findings[0]!.kind, 'stale_export')
  assert.match(findings[0]!.detail, /gone\.js/)
})

test('skips dist-target staleness when the package is unbuilt (no dist/)', () => {
  // CI's lint/check job runs without building dist/. A `./dist/…` target can't
  // be judged stale when dist/ was never produced — only the `source` (./src/)
  // target is checkable. The package here has src/ but no dist/.
  const dir = makePkg({ 'src/index.ts': '//' })
  const exportsValue = {
    '.': {
      source: './src/index.ts',
      types: './dist/index.d.ts',
      default: './dist/index.js',
    },
  }
  const findings = checkPackageExports('pkg', dir, exportsValue)
  assert.equal(findings.length, 0)
})

test('still flags a missing src-target even when dist is unbuilt', () => {
  // A `source` (./src/) target that doesn't exist IS stale regardless of build
  // state — src is the authored tree, always present for a real export.
  const dir = makePkg({ 'src/index.ts': '//' })
  const exportsValue = {
    './gone': { source: './src/gone.ts', default: './dist/gone.js' },
  }
  const findings = checkPackageExports('pkg', dir, exportsValue)
  assert.equal(findings.length, 1)
  assert.equal(findings[0]!.kind, 'stale_export')
  assert.match(findings[0]!.detail, /src\/gone\.ts/)
})

test('flags an orphaned public file (built but not exported)', () => {
  const dir = makePkg({
    'dist/index.js': '//',
    'dist/index.d.ts': '//',
    'dist/extra.js': '//', // public, but not in exports
  })
  const exportsValue = {
    '.': { default: './dist/index.js', types: './dist/index.d.ts' },
  }
  const findings = checkPackageExports('pkg', dir, exportsValue)
  assert.equal(findings.length, 1)
  assert.equal(findings[0]!.kind, 'orphaned_public_file')
  assert.match(findings[0]!.detail, /extra\.js/)
})

test('a private (underscore) built file is NOT flagged as orphaned', () => {
  const dir = makePkg({
    'dist/index.js': '//',
    'dist/index.d.ts': '//',
    'dist/_secret.js': '//', // private — intentionally unexported
  })
  const exportsValue = {
    '.': { default: './dist/index.js', types: './dist/index.d.ts' },
  }
  const findings = checkPackageExports('pkg', dir, exportsValue)
  assert.equal(findings.length, 0)
})

test('root-output package (no dist) with matching exports is clean', () => {
  const dir = makePkg({ 'index.mjs': '//', 'index.d.ts': '//' })
  // No dist/ → collectPublicFiles finds nothing to orphan; targets resolve.
  const exportsValue = {
    '.': { types: './index.d.ts', default: './index.mjs' },
  }
  const findings = checkPackageExports('pkg', dir, exportsValue)
  assert.equal(findings.length, 0)
})

test('a bin-target file is covered (not an orphan)', () => {
  const dir = makePkg({
    'dist/index.js': '//',
    'dist/index.d.ts': '//',
    'dist/bin/cli.js': '//', // public, not exported, but a bin entry
  })
  const exportsValue = {
    '.': { types: './dist/index.d.ts', default: './dist/index.js' },
  }
  const findings = checkPackageExports('pkg', dir, exportsValue, {
    binTargets: ['./dist/bin/cli.js'],
  })
  assert.equal(findings.length, 0)
})

test('an ignoreGlobs-matched file is covered (not an orphan)', () => {
  const dir = makePkg({
    'dist/index.js': '//',
    'dist/index.d.ts': '//',
    'dist/bin/prim.cjs': '//', // deliberately excluded via config ignoreGlobs
  })
  const exportsValue = {
    '.': { types: './dist/index.d.ts', default: './dist/index.js' },
  }
  const findings = checkPackageExports('pkg', dir, exportsValue, {
    ignoreGlobs: ['dist/bin/prim.cjs'],
  })
  assert.equal(findings.length, 0)
})

test('binTargetsOf reads string + object bin forms', () => {
  assert.deepEqual(binTargetsOf({ bin: './cli.js' }), ['./cli.js'])
  assert.deepEqual(
    binTargetsOf({ bin: { foo: './a.js', bar: './b.js' } }).toSorted(),
    ['./a.js', './b.js'],
  )
  assert.deepEqual(binTargetsOf({}), [])
})
