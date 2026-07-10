import assert from 'node:assert/strict'

import { test } from 'vitest'

import { computeSha256 } from '../../../bootstrap/src/helpers.mts'
import type { BundleManifest } from '../../../bootstrap/src/helpers.mts'
import {
  fleetDirRoots,
  PREPARE_FETCH,
  pruneStaleFleetFiles,
  readBundleRef,
  SYNC_FLEET_SCRIPT,
  thinIgnoreEntries,
  wirePackageJson,
} from '../../../bootstrap/src/install.mts'
import { safeDeleteSync } from '@socketsecurity/lib-stable/fs/safe'

// ── thinIgnoreEntries — wholly-fleet untrack set, never a repo sibling ───────

test('thinIgnoreEntries lists every bundle file explicitly (no fleet-dir blankets)', () => {
  const manifest = {
    files: {
      '.claude/hooks/fleet/a/index.mts': 'x',
      '.claude/hooks/fleet/b/index.mts': 'x',
      '.config/fleet/oxlintrc.json': 'x',
      'docs/agents.md/fleet/topic.md': 'x',
      'scripts/fleet/check.mts': 'x',
      '.github/workflows/publish-npm.yml': 'x',
      '.npmrc': 'x',
      'CLAUDE.md': 'x',
    },
    segments: [{ path: 'CLAUDE.md' }],
  }
  const entries = thinIgnoreEntries(manifest)
  // Every non-hybrid bundle file appears EXPLICITLY — never a dir blanket.
  assert.ok(entries.includes('.claude/hooks/fleet/a/index.mts'))
  assert.ok(entries.includes('.claude/hooks/fleet/b/index.mts'))
  assert.ok(entries.includes('.config/fleet/oxlintrc.json'))
  assert.ok(entries.includes('docs/agents.md/fleet/topic.md'))
  assert.ok(entries.includes('scripts/fleet/check.mts'))
  assert.ok(!entries.includes('.claude/hooks/fleet/'))
  assert.ok(!entries.includes('.config/fleet/'))
  assert.ok(!entries.includes('scripts/fleet/'))
  // Mixed dir + root file listed EXACTLY (the member's own ci.yml / config stay).
  assert.ok(entries.includes('.github/workflows/publish-npm.yml'))
  assert.ok(entries.includes('.npmrc'))
  // Hybrid file (a segment) is NOT untracked.
  assert.ok(!entries.includes('CLAUDE.md'))
})

test('thinIgnoreEntries never emits a bare mixed-dir root (no over-untrack)', () => {
  const manifest = {
    files: {
      '.claude/hooks/fleet/a/index.mts': 'x',
      '.github/workflows/publish-npm.yml': 'x',
    },
    segments: [],
  }
  const entries = thinIgnoreEntries(manifest)
  assert.ok(!entries.includes('.github/workflows/'))
  assert.ok(!entries.includes('.claude/hooks/'))
  assert.ok(!entries.includes('.claude/'))
})

// ── fleetDirRoots — the sync-prune's walk roots ──────────────────────────────

test('fleetDirRoots collapses fleet tiers and skips hybrids + non-fleet paths', () => {
  const manifest = {
    files: {
      '.claude/hooks/fleet/a/index.mts': 'x',
      '.claude/hooks/fleet/b/index.mts': 'x',
      '.config/fleet/pnpm-workspace.fleet.yaml': 'x',
      'scripts/fleet/check.mts': 'x',
      '.github/workflows/publish-npm.yml': 'x',
      '.npmrc': 'x',
      'CLAUDE.md': 'x',
    },
    segments: [{ path: 'CLAUDE.md' }],
  }
  const roots = fleetDirRoots(manifest)
  assert.deepEqual(roots, [
    '.claude/hooks/fleet/',
    '.config/fleet/',
    'scripts/fleet/',
  ])
})

// ── pruneStaleFleetFiles — the fetch is place + prune (sync) ─────────────────

test('pruneStaleFleetFiles deletes stale fleet files, keeps bundle + repo-owned + os-noise', () => {
  const fs = require('node:fs')
  const os = require('node:os')
  const path = require('node:path')
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fleet-prune-'))
  try {
    const write = (rel: string) => {
      const abs = path.join(tmp, rel)
      fs.mkdirSync(path.dirname(abs), { recursive: true })
      fs.writeFileSync(abs, 'x')
    }
    // Bundle ships a/index.mts; b/old.mts is stale (a prior bundle's file).
    write('.claude/hooks/fleet/a/index.mts')
    write('.claude/hooks/fleet/b/old.mts')
    write('.config/fleet/oxlintrc.json')
    // Repo-owned files live OUTSIDE the fleet roots — must never be touched.
    write('.claude/hooks/repo/x/index.mts')
    // OS-noise files under a fleet root are skipped (PRUNE_SKIP_NAMES).
    write('.claude/hooks/fleet/.DS_Store')
    const manifest: BundleManifest = {
      files: {
        '.claude/hooks/fleet/a/index.mts': 'x',
        '.config/fleet/oxlintrc.json': 'x',
      },
      templateSha: 'abc',
      version: '1.0',
    }
    const pruned = pruneStaleFleetFiles(tmp, manifest)
    assert.equal(pruned, 1)
    assert.ok(fs.existsSync(path.join(tmp, '.claude/hooks/fleet/a/index.mts')))
    assert.ok(!fs.existsSync(path.join(tmp, '.claude/hooks/fleet/b/old.mts')))
    assert.ok(fs.existsSync(path.join(tmp, '.claude/hooks/repo/x/index.mts')))
    assert.ok(fs.existsSync(path.join(tmp, '.claude/hooks/fleet/.DS_Store')))
  } finally {
    safeDeleteSync(tmp)
  }
})

test('pruneStaleFleetFiles never deletes a hybrid segment under a fleet root', () => {
  const fs = require('node:fs')
  const os = require('node:os')
  const path = require('node:path')
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fleet-prune-seg-'))
  try {
    fs.mkdirSync(path.join(tmp, '.config/fleet'), { recursive: true })
    fs.writeFileSync(path.join(tmp, '.config/fleet/oxlintrc.json'), 'x')
    fs.writeFileSync(path.join(tmp, '.config/fleet/repo-pin.json'), 'x')
    const manifest: BundleManifest = {
      files: { '.config/fleet/oxlintrc.json': 'x' },
      segments: [
        {
          commentStyle: 'hash',
          path: '.config/fleet/repo-pin.json',
          sha256: 'x',
        },
      ],
      templateSha: 'abc',
      version: '1.0',
    }
    const pruned = pruneStaleFleetFiles(tmp, manifest)
    assert.equal(pruned, 0)
    assert.ok(fs.existsSync(path.join(tmp, '.config/fleet/repo-pin.json')))
  } finally {
    safeDeleteSync(tmp)
  }
})

// ── readBundleRef — ref pinned in the wheelhouse settings file ───────────────

test('readBundleRef reads bundle.ref from .config/socket-wheelhouse.json', () => {
  const fs = require('node:fs')
  const os = require('node:os')
  const path = require('node:path')
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fleet-ref-'))
  try {
    fs.mkdirSync(path.join(tmp, '.config'), { recursive: true })
    fs.writeFileSync(
      path.join(tmp, '.config/socket-wheelhouse.json'),
      JSON.stringify({ bundle: { ref: 'fleet-abc123' } }),
    )
    assert.equal(readBundleRef(tmp), 'fleet-abc123')
  } finally {
    safeDeleteSync(tmp)
  }
})

test('readBundleRef returns undefined when the file or field is absent', () => {
  const fs = require('node:fs')
  const os = require('node:os')
  const path = require('node:path')
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fleet-noref-'))
  try {
    assert.equal(readBundleRef(tmp), undefined)
    fs.mkdirSync(path.join(tmp, '.config'), { recursive: true })
    fs.writeFileSync(
      path.join(tmp, '.config/socket-wheelhouse.json'),
      JSON.stringify({ repo: { type: 'solo' } }),
    )
    assert.equal(readBundleRef(tmp), undefined)
  } finally {
    safeDeleteSync(tmp)
  }
})

// ── wirePackageJson — the prepare BELT (fetch before install-git-hooks) ──────

function wireTmp(prepare?: string): {
  dir: string
  read: () => { scripts?: Record<string, string> | undefined }
} {
  const fs = require('node:fs')
  const os = require('node:os')
  const path = require('node:path')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fleet-wire-'))
  const scripts = prepare ? { prepare } : {}
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'm', scripts }),
  )
  return {
    dir,
    read: () =>
      JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')),
  }
}

test('wirePackageJson prepends the fetch belt BEFORE install-git-hooks', () => {
  const { dir, read } = wireTmp('node scripts/fleet/install-git-hooks.mts')
  wirePackageJson(dir)
  const { scripts } = read()
  assert.equal(scripts!['sync-fleet'], SYNC_FLEET_SCRIPT)
  assert.equal(
    scripts!['prepare'],
    `${PREPARE_FETCH} && node scripts/fleet/install-git-hooks.mts`,
  )
})

test('wirePackageJson sets prepare to the fetch when none exists', () => {
  const { dir, read } = wireTmp()
  wirePackageJson(dir)
  assert.equal(read().scripts!['prepare'], PREPARE_FETCH)
})

test('wirePackageJson is idempotent on an already-belted prepare', () => {
  const { dir, read } = wireTmp(
    `${PREPARE_FETCH} && node scripts/fleet/install-git-hooks.mts`,
  )
  wirePackageJson(dir)
  assert.equal(
    read().scripts!['prepare'],
    `${PREPARE_FETCH} && node scripts/fleet/install-git-hooks.mts`,
  )
})

test('computeSha256 integrates with pruneStaleFleetFiles', () => {
  const fs = require('node:fs')
  const os = require('node:os')
  const path = require('node:path')
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fleet-sha-int-'))
  try {
    const content = Buffer.from('test content')
    fs.writeFileSync(path.join(tmp, 'a.txt'), content)
    const manifest: BundleManifest = {
      files: { 'a.txt': computeSha256(content) },
      templateSha: 'x',
      version: '1.0',
    }
    const pruned = pruneStaleFleetFiles(tmp, manifest)
    assert.equal(pruned, 0)
  } finally {
    safeDeleteSync(tmp)
  }
})
