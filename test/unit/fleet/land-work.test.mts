// vitest specs for scripts/fleet/land-work.mts — the deterministic grouper that
// lands the dirty tree into logical commits. Covers the pure functions
// (porcelain parse, scope/type derivation, grouping, partition, message); the
// git-executing path (landGroup/main --commit) is exercised end-to-end.

import assert from 'node:assert/strict'

import { describe, test } from 'vitest'

import {
  commitMessage,
  deriveScope,
  deriveType,
  groupPaths,
  isBothTouched,
  isGenerated,
  isSourceArea,
  isUnmerged,
  parsePorcelain,
  partitionTree,
} from '../../../scripts/fleet/land-work.mts'

describe('land-work / parsePorcelain', () => {
  test('extracts path at column 3 (2-char status + space)', () => {
    const e = parsePorcelain(' M CLAUDE.md\n?? scripts/x.mts\n')
    assert.equal(e.length, 2)
    assert.equal(e[0]!.path, 'CLAUDE.md')
    assert.equal(e[0]!.status, ' M')
    assert.equal(e[1]!.path, 'scripts/x.mts')
  })

  test('rename resolves to the new path', () => {
    const e = parsePorcelain('R  old/a.mts -> new/b.mts\n')
    assert.equal(e.length, 1)
    assert.equal(e[0]!.path, 'new/b.mts')
  })

  test('blank lines are skipped', () => {
    assert.equal(parsePorcelain('\n\n').length, 0)
  })
})

describe('land-work / deriveScope', () => {
  test('template/base mirrors the live tree', () => {
    assert.equal(
      deriveScope('template/base/.claude/hooks/fleet/x/index.mts'),
      'hooks',
    )
    assert.equal(deriveScope('template/base/scripts/fleet/y.mts'), 'fleet')
    assert.equal(deriveScope('template/base/docs/agents.md/fleet/z.md'), 'docs')
  })

  test('live-tree areas map to their scope', () => {
    assert.equal(deriveScope('.claude/skills/fleet/s/SKILL.md'), 'skills')
    assert.equal(deriveScope('.config/fleet/x.json'), 'config')
    assert.equal(deriveScope('.github/workflows/ci.yml'), 'ci')
    assert.equal(deriveScope('scripts/tool.mts'), 'scripts')
    assert.equal(deriveScope('test/unit/fleet/a.test.mts'), 'test')
  })

  test('package paths use the package name (scoped + unscoped)', () => {
    assert.equal(
      deriveScope('packages/@socketsecurity/lib/x.mts'),
      '@socketsecurity/lib',
    )
    assert.equal(deriveScope('packages/thing/y.mts'), 'thing')
  })

  test('root file falls back to its basename sans extension', () => {
    assert.equal(deriveScope('CLAUDE.md'), 'CLAUDE')
  })
})

describe('land-work / deriveType', () => {
  test('all-test group is test', () => {
    assert.equal(
      deriveType(['test/a.test.mts', 'template/base/test/unit/b.test.mts']),
      'test',
    )
  })
  test('all-docs group is docs', () => {
    assert.equal(deriveType(['docs/a.md', 'README.md']), 'docs')
  })
  test('mixed group is chore (the honest auto-land type)', () => {
    assert.equal(deriveType(['scripts/a.mts', 'docs/b.md']), 'chore')
  })
})

describe('land-work / groupPaths + commitMessage', () => {
  test('groups by scope, sorted, with derived type and message', () => {
    const groups = groupPaths([
      'template/base/scripts/fleet/b.mts',
      'template/base/scripts/fleet/a.mts',
      'docs/x.md',
    ])
    assert.equal(groups.length, 2)
    // 'docs' sorts before 'fleet'
    assert.equal(groups[0]!.scope, 'docs')
    assert.equal(groups[0]!.type, 'docs')
    assert.equal(commitMessage(groups[0]!), 'docs(docs): land 1 docs change')
    assert.equal(groups[1]!.scope, 'fleet')
    // paths within a group are sorted
    assert.deepEqual(groups[1]!.paths, [
      'template/base/scripts/fleet/a.mts',
      'template/base/scripts/fleet/b.mts',
    ])
    assert.equal(
      commitMessage(groups[1]!),
      'chore(fleet): land 2 fleet changes',
    )
  })

  test('grouping is deterministic across input order', () => {
    const a = groupPaths(['scripts/z.mts', 'docs/a.md', 'scripts/a.mts'])
    const b = groupPaths(['docs/a.md', 'scripts/a.mts', 'scripts/z.mts'])
    assert.deepEqual(a, b)
  })
})

describe('land-work / partitionTree + isSourceArea', () => {
  test('splits landable, vendored, and out-of-source', () => {
    const { landable, skippedForeignTree, skippedOutsideSource } =
      partitionTree([
        { path: 'scripts/fleet/a.mts', status: ' M' },
        { path: 'vendor/x/y.js', status: '??' },
        { path: 'upstream/z.rs', status: ' M' },
        { path: 'CLAUDE.md', status: ' M' },
      ])
    assert.deepEqual(landable, ['scripts/fleet/a.mts'])
    assert.deepEqual(skippedForeignTree.toSorted(), [
      'upstream/z.rs',
      'vendor/x/y.js',
    ])
    assert.deepEqual(skippedOutsideSource, ['CLAUDE.md'])
  })

  test('isSourceArea recognizes the known areas and rejects root files', () => {
    assert.equal(isSourceArea('template/base/x'), true)
    assert.equal(isSourceArea('docs/x'), true)
    assert.equal(isSourceArea('README.md'), false)
  })

  test('nested -bundled/-vendored dirs are treated as vendored', () => {
    const { skippedForeignTree } = partitionTree([
      { path: 'pkg/node-bundled/a.js', status: '??' },
    ])
    assert.deepEqual(skippedForeignTree, ['pkg/node-bundled/a.js'])
  })
})

describe('land-work / safety filters', () => {
  test('isUnmerged flags conflict statuses, not clean ones', () => {
    for (const s of ['UU', 'AA', 'DD', 'AU', 'UD']) {
      assert.equal(isUnmerged(s), true, s)
    }
    for (const s of [' M', 'M ', 'A ', '??', 'MM']) {
      assert.equal(isUnmerged(s), false, s)
    }
  })

  test('isBothTouched flags staged+unstaged, not single-column or untracked', () => {
    for (const s of ['MM', 'AM', 'RM', 'MD']) {
      assert.equal(isBothTouched(s), true, s)
    }
    for (const s of [' M', 'M ', 'A ', '??']) {
      assert.equal(isBothTouched(s), false, s)
    }
  })

  test('isGenerated flags lockfile / hook bundle / build+coverage output', () => {
    assert.equal(isGenerated('pnpm-lock.yaml'), true)
    assert.equal(isGenerated('.claude/hooks/fleet/_dispatch/bundle.cjs'), true)
    assert.equal(isGenerated('packages/x/build/out.js'), true)
    assert.equal(isGenerated('coverage/lcov.info'), true)
    assert.equal(isGenerated('scripts/fleet/land-work.mts'), false)
  })

  test('isGenerated normalizes backslash paths (Windows-safe)', () => {
    assert.equal(isGenerated('a\\b\\pnpm-lock.yaml'), true)
    assert.equal(isGenerated('pkg\\build\\out.js'), true)
  })

  test('partitionTree routes generated + both-touched to their own buckets', () => {
    const p = partitionTree([
      { path: 'scripts/fleet/a.mts', status: ' M' },
      { path: 'scripts/fleet/b.mts', status: 'MM' },
      { path: 'pnpm-lock.yaml', status: ' M' },
      { path: 'vendor/x.js', status: '??' },
      { path: 'README.md', status: ' M' },
    ])
    assert.deepEqual(p.landable, ['scripts/fleet/a.mts'])
    assert.deepEqual(p.skippedAmbiguous, ['scripts/fleet/b.mts'])
    assert.deepEqual(p.skippedGenerated, ['pnpm-lock.yaml'])
    assert.deepEqual(p.skippedForeignTree, ['vendor/x.js'])
    assert.deepEqual(p.skippedOutsideSource, ['README.md'])
  })
})
