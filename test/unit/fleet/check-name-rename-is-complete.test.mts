// vitest specs for name-rename-is-complete: a recorded `renamed-from: <old>`
// must be FINISHED — the prior name absent as a live file AND unreferenced.

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { test } from 'vitest'

import {
  collectRenameRecords,
  findIncompleteRenames,
  oldNameFileExists,
  oldNameReferenced,
} from '../../../scripts/fleet/check/name-rename-is-complete.mts'

// Build a fixture repo root with the requested fleet files.
function makeRepo(opts: {
  // `renamed-from:` marker text dropped into a scan file.
  marker?: string | undefined
  // create scripts/fleet/<name>.mts
  scriptName?: string | undefined
  // create .claude/hooks/fleet/<name>/
  hookName?: string | undefined
  // create .config/fleet/oxlint-plugin/rules/<name>.mts
  ruleName?: string | undefined
  // extra file content that references a name (a "live reference")
  referenceText?: string | undefined
}): string {
  opts = { ...opts }
  const root = mkdtempSync(path.join(os.tmpdir(), 'rename-'))
  mkdirSync(path.join(root, 'scripts', 'fleet', 'check'), { recursive: true })
  mkdirSync(path.join(root, 'scripts', 'repo'), { recursive: true })
  mkdirSync(path.join(root, '.claude', 'hooks', 'fleet'), { recursive: true })
  mkdirSync(path.join(root, '.config', 'fleet', 'oxlint-plugin', 'rules'), {
    recursive: true,
  })
  if (opts.marker) {
    writeFileSync(
      path.join(root, 'scripts', 'fleet', 'check', 'carrier.mts'),
      `// @file ${opts.marker}\nexport const x = 1\n`,
    )
  }
  if (opts.scriptName) {
    writeFileSync(
      path.join(root, 'scripts', 'fleet', `${opts.scriptName}.mts`),
      'export const y = 1\n',
    )
  }
  if (opts.hookName) {
    mkdirSync(path.join(root, '.claude', 'hooks', 'fleet', opts.hookName))
  }
  if (opts.ruleName) {
    writeFileSync(
      path.join(
        root,
        '.config',
        'fleet',
        'oxlint-plugin',
        'rules',
        `${opts.ruleName}.mts`,
      ),
      'export default {}\n',
    )
  }
  if (opts.referenceText) {
    writeFileSync(
      path.join(root, 'scripts', 'repo', 'consumer.mts'),
      opts.referenceText,
    )
  }
  return root
}

function scanFilesOf(root: string): string[] {
  // The check's collectScanFiles walks fixed SCAN_DIRS off REPO_ROOT; in tests
  // we hand it the files we wrote directly (the pure fns take a file list).
  const files: string[] = []
  for (const rel of [
    'scripts/fleet/check/carrier.mts',
    'scripts/repo/consumer.mts',
  ]) {
    const abs = path.join(root, rel)
    if (existsSync(abs)) {
      files.push(abs)
    }
  }
  return files
}

// ── collectRenameRecords ────────────────────────────────────────

test('collectRenameRecords extracts the renamed-from token (bare + scoped + .mts)', () => {
  const root = makeRepo({ marker: 'renamed-from: make-package-exports' })
  const recs = collectRenameRecords(
    [path.join(root, 'scripts/fleet/check/carrier.mts')],
    root,
  )
  assert.equal(recs.length, 1)
  assert.equal(recs[0]!.oldName, 'make-package-exports')
})

test('collectRenameRecords reads a socket/<rule> scoped marker + a backticked one', () => {
  const root = makeRepo({ marker: 'renamed-from: `socket/old-rule`' })
  const recs = collectRenameRecords(
    [path.join(root, 'scripts/fleet/check/carrier.mts')],
    root,
  )
  assert.equal(recs[0]!.oldName, 'socket/old-rule')
})

test('collectRenameRecords returns [] when no marker present', () => {
  const root = makeRepo({})
  assert.deepEqual(collectRenameRecords([], root), [])
})

// ── oldNameFileExists ───────────────────────────────────────────

test('oldNameFileExists true when a script <old>.mts is still present', () => {
  const root = makeRepo({ scriptName: 'generate-package-exports' })
  assert.equal(oldNameFileExists(root, 'generate-package-exports'), true)
})

test('oldNameFileExists true for a lingering hook dir', () => {
  const root = makeRepo({ hookName: 'old-guard' })
  assert.equal(oldNameFileExists(root, 'old-guard'), true)
})

test('oldNameFileExists true for a lingering socket/<rule> (scope stripped)', () => {
  const root = makeRepo({ ruleName: 'old-rule' })
  assert.equal(oldNameFileExists(root, 'socket/old-rule'), true)
})

test('oldNameFileExists false when the prior name is fully gone', () => {
  const root = makeRepo({})
  assert.equal(oldNameFileExists(root, 'make-package-exports'), false)
})

// ── oldNameReferenced ───────────────────────────────────────────

test('oldNameReferenced true when a consumer still mentions the prior name', () => {
  const root = makeRepo({
    referenceText: "import { x } from './generate-package-exports.mts'\n",
  })
  assert.equal(
    oldNameReferenced(
      [path.join(root, 'scripts/repo/consumer.mts')],
      'generate-package-exports',
    ),
    true,
  )
})

test('oldNameReferenced ignores the renamed-from: marker line itself', () => {
  const root = makeRepo({ marker: 'renamed-from: make-package-exports' })
  assert.equal(
    oldNameReferenced(
      [path.join(root, 'scripts/fleet/check/carrier.mts')],
      'make-package-exports',
    ),
    false,
  )
})

test('oldNameReferenced false when nothing mentions the prior name', () => {
  const root = makeRepo({ referenceText: 'export const unrelated = 1\n' })
  assert.equal(
    oldNameReferenced(
      [path.join(root, 'scripts/repo/consumer.mts')],
      'make-package-exports',
    ),
    false,
  )
})

// ── findIncompleteRenames (both arms) ───────────────────────────

test('findIncompleteRenames FLAGS a rename whose old file still lives', () => {
  const root = makeRepo({
    marker: 'renamed-from: generate-package-exports',
    scriptName: 'generate-package-exports',
  })
  const files = scanFilesOf(root)
  const recs = collectRenameRecords(files, root)
  const bad = findIncompleteRenames(recs, files, root)
  assert.equal(bad.length, 1)
  assert.match(bad[0]!.reason, /still exists as a live file/)
})

test('findIncompleteRenames FLAGS a rename whose old name is still referenced', () => {
  const root = makeRepo({
    marker: 'renamed-from: generate-package-exports',
    referenceText: 'see generate-package-exports for details\n',
  })
  const files = scanFilesOf(root)
  const recs = collectRenameRecords(files, root)
  const bad = findIncompleteRenames(recs, files, root)
  assert.equal(bad.length, 1)
  assert.match(bad[0]!.reason, /still referenced/)
})

test('findIncompleteRenames PASSES a complete rename (old gone + unreferenced)', () => {
  const root = makeRepo({ marker: 'renamed-from: make-package-exports' })
  const files = scanFilesOf(root)
  const recs = collectRenameRecords(files, root)
  assert.deepEqual(findIncompleteRenames(recs, files, root), [])
})

test('findIncompleteRenames PASSES when there are no rename records', () => {
  const root = makeRepo({})
  assert.deepEqual(findIncompleteRenames([], [], root), [])
})
