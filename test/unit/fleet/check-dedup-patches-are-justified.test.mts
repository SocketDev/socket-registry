// vitest specs for scripts/fleet/check/dedup-patches-are-justified.mts.
//
// The script's main() is NOT entrypoint-guarded (it runs unconditionally), so
// it cannot be imported for unit testing. Instead, each test builds a minimal
// temp-dir fixture with the relevant pnpm-workspace.yaml / pnpm-lock.yaml /
// patch files and spawns the script as a subprocess from that cwd. Exit code
// and stderr/stdout are inspected to assert pass/fail behavior.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, test } from 'vitest'

import { spawnSync } from '@socketsecurity/lib-stable/process/spawn/child'

const here = path.dirname(fileURLToPath(import.meta.url))
const SCRIPT_PATH = path.resolve(
  here,
  '../../../scripts/fleet/check/dedup-patches-are-justified.mts',
)

function runCheck(cwd: string): {
  stdout: string
  stderr: string
  exitCode: number
} {
  const result = spawnSync('node', [SCRIPT_PATH], { cwd })
  return {
    stdout: String(result.stdout),
    stderr: String(result.stderr),
    exitCode: result.status ?? -1,
  }
}

function makeTmpDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), 'dedup-patches-'))
}

// Minimal patch file content (a unified diff stub).
const PATCH_CONTENT = `diff --git a/index.js b/index.js
--- a/index.js
+++ b/index.js
@@ -1 +1 @@
-old
+new
`

// A lockfile snippet that resolves isexe@4.0.0.
const LOCKFILE_WITH_ISEXE = `lockfileVersion: '9.0'

packages:

  'isexe@4.0.0':
    resolution: {integrity: sha512-dummy}
`

// A lockfile snippet that does NOT resolve isexe@4.0.0.
const LOCKFILE_WITHOUT_ISEXE = `lockfileVersion: '9.0'

packages:

  'which@5.0.0':
    resolution: {integrity: sha512-dummy}
`

describe('check-dedup-patches-are-justified / no pnpm-workspace.yaml', () => {
  test('exits 0 (vacuous pass) when pnpm-workspace.yaml is absent', () => {
    const dir = makeTmpDir()
    try {
      const { exitCode, stdout } = runCheck(dir)
      assert.equal(exitCode, 0, `unexpected exit code; stdout=${stdout}`)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('check-dedup-patches-are-justified / no patchedDependencies section', () => {
  test('exits 0 when workspace has no patchedDependencies key', () => {
    const dir = makeTmpDir()
    try {
      writeFileSync(
        path.join(dir, 'pnpm-workspace.yaml'),
        `packages:\n  - 'packages/*'\n`,
      )
      const { exitCode, stdout } = runCheck(dir)
      assert.equal(exitCode, 0)
      assert.match(stdout, /No patchedDependencies/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('check-dedup-patches-are-justified / compliant entry', () => {
  test('exits 0 when patch has a rationale comment, existing patch file, and resolved spec', () => {
    const dir = makeTmpDir()
    try {
      mkdirSync(path.join(dir, 'patches'), { recursive: true })
      writeFileSync(
        path.join(dir, 'patches', 'isexe@4.0.0.patch'),
        PATCH_CONTENT,
      )
      writeFileSync(path.join(dir, 'pnpm-lock.yaml'), LOCKFILE_WITH_ISEXE)
      writeFileSync(
        path.join(dir, 'pnpm-workspace.yaml'),
        [
          'packages:',
          "  - 'packages/*'",
          'patchedDependencies:',
          '  # restores Array.isArray contract for consumer foo; removable if upstream fixes #123',
          '  isexe@4.0.0: patches/isexe@4.0.0.patch',
        ].join('\n') + '\n',
      )
      const { exitCode, stdout } = runCheck(dir)
      assert.equal(exitCode, 0, `unexpected exit code; stdout=${stdout}`)
      assert.match(stdout, /All pnpm patch entries are justified/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('check-dedup-patches-are-justified / missing rationale comment', () => {
  test('exits 1 and reports a finding when patch entry has no rationale comment', () => {
    const dir = makeTmpDir()
    try {
      mkdirSync(path.join(dir, 'patches'), { recursive: true })
      writeFileSync(
        path.join(dir, 'patches', 'isexe@4.0.0.patch'),
        PATCH_CONTENT,
      )
      writeFileSync(path.join(dir, 'pnpm-lock.yaml'), LOCKFILE_WITH_ISEXE)
      writeFileSync(
        path.join(dir, 'pnpm-workspace.yaml'),
        [
          'packages:',
          "  - 'packages/*'",
          'patchedDependencies:',
          '  isexe@4.0.0: patches/isexe@4.0.0.patch',
        ].join('\n') + '\n',
      )
      const { exitCode, stderr } = runCheck(dir)
      assert.equal(exitCode, 1)
      assert.match(stderr, /no rationale comment/)
      assert.match(stderr, /isexe@4\.0\.0/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('check-dedup-patches-are-justified / missing patch file', () => {
  test('exits 1 and reports a finding when the referenced patch file does not exist', () => {
    const dir = makeTmpDir()
    try {
      writeFileSync(path.join(dir, 'pnpm-lock.yaml'), LOCKFILE_WITH_ISEXE)
      writeFileSync(
        path.join(dir, 'pnpm-workspace.yaml'),
        [
          'packages:',
          "  - 'packages/*'",
          'patchedDependencies:',
          '  # restores something important',
          '  isexe@4.0.0: patches/isexe@4.0.0.patch',
        ].join('\n') + '\n',
      )
      // Patch file deliberately not created.
      const { exitCode, stderr } = runCheck(dir)
      assert.equal(exitCode, 1)
      assert.match(stderr, /missing patch file/)
      assert.match(stderr, /isexe@4\.0\.0\.patch/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('check-dedup-patches-are-justified / unresolved spec in lockfile', () => {
  test('exits 1 and reports a finding when the patched pkg@ver is not in pnpm-lock.yaml', () => {
    const dir = makeTmpDir()
    try {
      mkdirSync(path.join(dir, 'patches'), { recursive: true })
      writeFileSync(
        path.join(dir, 'patches', 'isexe@4.0.0.patch'),
        PATCH_CONTENT,
      )
      // Lockfile does NOT resolve isexe@4.0.0.
      writeFileSync(path.join(dir, 'pnpm-lock.yaml'), LOCKFILE_WITHOUT_ISEXE)
      writeFileSync(
        path.join(dir, 'pnpm-workspace.yaml'),
        [
          'packages:',
          "  - 'packages/*'",
          'patchedDependencies:',
          '  # restores something important',
          '  isexe@4.0.0: patches/isexe@4.0.0.patch',
        ].join('\n') + '\n',
      )
      const { exitCode, stderr } = runCheck(dir)
      assert.equal(exitCode, 1)
      assert.match(stderr, /patches a version not resolved/)
      assert.match(stderr, /isexe@4\.0\.0/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('check-dedup-patches-are-justified / multiple violations', () => {
  test('reports all violations and pluralizes the summary line', () => {
    const dir = makeTmpDir()
    try {
      mkdirSync(path.join(dir, 'patches'), { recursive: true })
      writeFileSync(
        path.join(dir, 'patches', 'isexe@4.0.0.patch'),
        PATCH_CONTENT,
      )
      writeFileSync(path.join(dir, 'pnpm-lock.yaml'), LOCKFILE_WITH_ISEXE)
      writeFileSync(
        path.join(dir, 'pnpm-workspace.yaml'),
        [
          'packages:',
          "  - 'packages/*'",
          'patchedDependencies:',
          // Entry 1: no comment + patch file missing
          '  which@5.0.0: patches/which@5.0.0.patch',
          // Entry 2: has comment, file exists, lockfile resolves
          '  # restores isexe contract',
          '  isexe@4.0.0: patches/isexe@4.0.0.patch',
        ].join('\n') + '\n',
      )
      // which@5.0.0.patch does not exist and which@5.0.0 IS in the lockfile.
      // So which@5.0.0 gets 2 findings: no rationale + missing file.
      const { exitCode, stderr } = runCheck(dir)
      assert.equal(exitCode, 1)
      // There should be multiple violations counted.
      assert.match(stderr, /unjustified pnpm patch entr/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('check-dedup-patches-are-justified / lockfile absent means resolved', () => {
  test('exits 0 when pnpm-lock.yaml is absent (lockfile assumed resolved)', () => {
    const dir = makeTmpDir()
    try {
      mkdirSync(path.join(dir, 'patches'), { recursive: true })
      writeFileSync(
        path.join(dir, 'patches', 'isexe@4.0.0.patch'),
        PATCH_CONTENT,
      )
      // No pnpm-lock.yaml — resolvedInLockfile returns true when lockfile absent.
      writeFileSync(
        path.join(dir, 'pnpm-workspace.yaml'),
        [
          'packages:',
          "  - 'packages/*'",
          'patchedDependencies:',
          '  # restores isexe contract for bar',
          '  isexe@4.0.0: patches/isexe@4.0.0.patch',
        ].join('\n') + '\n',
      )
      const { exitCode, stdout } = runCheck(dir)
      assert.equal(exitCode, 0, `unexpected exit; stdout=${stdout}`)
      assert.match(stdout, /All pnpm patch entries are justified/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
