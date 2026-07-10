/**
 * @file Tests for the named fleet-sync target registry — the load-time
 *   invariant (every leaf has a non-empty, known-category set), composite
 *   expansion (a composite resolves to the union of its sub-targets), and scope
 *   validation. Cascaded fleet-wide, so it imports ONLY the cascaded
 *   `scripts/fleet/constants/sync-targets.mts` (the wheelhouse-only CATEGORY
 *   cross-check lives in test/unit/sync-scaffolding/, which members don't
 *   ship).
 */

import { describe, expect, test } from 'vitest'

import {
  KNOWN_CATEGORIES,
  resolveTargetCategories,
  resolveTargetLeaves,
  SYNC_TARGETS,
} from '../../../scripts/fleet/constants/sync-targets.mts'

// Generic, file-ambiguous categories shared across the whole byte-identical
// mirror. Any leaf that owns one of these MUST also declare a `paths` scope, or
// the dispatcher's category filter matches every drifted file repo-wide (the
// over-scope bug this guards against).
const GENERIC_CATEGORIES = new Set([
  'content_drift',
  'fleet_dir_drift',
  'missing_required',
])

function targetNames(): string[] {
  return Object.keys(SYNC_TARGETS).filter(k => k !== '__proto__')
}

function isComposite(name: string): boolean {
  return (SYNC_TARGETS[name]!.composite?.length ?? 0) > 0
}

describe('SYNC_TARGETS registry invariant', () => {
  test('every non-composite target has a non-empty category set', () => {
    for (const name of targetNames()) {
      if (isComposite(name)) {
        continue
      }
      const { categories } = SYNC_TARGETS[name]!
      expect(categories.length, `${name} categories`).toBeGreaterThan(0)
    }
  })

  test('every listed category is a known cascade category', () => {
    for (const name of targetNames()) {
      for (const cat of SYNC_TARGETS[name]!.categories) {
        expect(KNOWN_CATEGORIES.has(cat), `${name} → ${cat}`).toBe(true)
      }
    }
  })

  test('every composite references only defined targets', () => {
    for (const name of targetNames()) {
      for (const sub of SYNC_TARGETS[name]!.composite ?? []) {
        expect(SYNC_TARGETS[sub], `${name} → ${sub}`).toBeDefined()
      }
    }
  })
})

describe('composite expansion', () => {
  test('foundationals == union of its sub-target categories', () => {
    const subs = SYNC_TARGETS['foundationals']!.composite!
    const expected = new Set<string>()
    for (const sub of subs) {
      for (const cat of SYNC_TARGETS[sub]!.categories) {
        expected.add(cat)
      }
    }
    const resolved = resolveTargetCategories('foundationals')
    expect([...resolved].toSorted()).toEqual([...expected].toSorted())
  })

  test('dogfood expands transitively through foundationals + installer', () => {
    const resolved = resolveTargetCategories('dogfood')
    for (const cat of SYNC_TARGETS['installer']!.categories) {
      expect(resolved.has(cat), cat).toBe(true)
    }
    for (const cat of SYNC_TARGETS['pnpm-workspace']!.categories) {
      expect(resolved.has(cat), cat).toBe(true)
    }
  })

  test("'all' expands to the union of every leaf target", () => {
    const resolved = resolveTargetCategories('all')
    for (const name of targetNames()) {
      if (isComposite(name)) {
        continue
      }
      for (const cat of SYNC_TARGETS[name]!.categories) {
        expect(resolved.has(cat), `${name} → ${cat}`).toBe(true)
      }
    }
  })

  test('resolveTargetCategories throws on an unknown name', () => {
    expect(() => resolveTargetCategories('no-such-target')).toThrow(
      /Unknown sync target/,
    )
  })
})

describe('path scoping (over-scope guard)', () => {
  // fleet-code is the deliberate full-payload catch-all: it owns the generic
  // categories WITHOUT a paths scope so `all` (which includes it) still covers
  // every drifted file. Every OTHER leaf that rides a generic category must be
  // path-scoped, or `foundationals` / a narrow target would pull the whole
  // mirror — the exact over-scope bug being guarded.
  const FULL_PAYLOAD_TARGET = 'fleet-code'

  test('every narrow leaf that owns a generic category declares paths', () => {
    for (const name of targetNames()) {
      if (isComposite(name) || name === FULL_PAYLOAD_TARGET) {
        continue
      }
      const target = SYNC_TARGETS[name]!
      const ridesGeneric = target.categories.some(c =>
        GENERIC_CATEGORIES.has(c),
      )
      if (ridesGeneric) {
        expect(
          target.paths?.length ?? 0,
          `${name} rides a generic category but has no paths scope`,
        ).toBeGreaterThan(0)
      }
    }
  })

  test('the full-payload target stays unscoped (catch-all for `all`)', () => {
    expect(SYNC_TARGETS[FULL_PAYLOAD_TARGET]!.paths).toBeUndefined()
  })

  test('resolveTargetLeaves(foundationals) is the seven base leaves', () => {
    expect([...resolveTargetLeaves('foundationals')].toSorted()).toEqual([
      'claude-md',
      'editor-config',
      'git-meta',
      'lint-config',
      'package-baseline',
      'package-manager',
      'pnpm-workspace',
    ])
  })

  test('resolveTargetLeaves(all) covers every non-composite leaf', () => {
    const leaves = resolveTargetLeaves('all')
    for (const name of targetNames()) {
      if (isComposite(name)) {
        continue
      }
      expect(leaves.has(name), name).toBe(true)
    }
  })

  test('resolveTargetLeaves throws on an unknown name', () => {
    expect(() => resolveTargetLeaves('no-such-target')).toThrow(
      /Unknown sync target/,
    )
  })
})

describe('scope validation', () => {
  test("the 'dogfood' composite is dogfood-scoped", () => {
    expect(SYNC_TARGETS['dogfood']!.scopes).toContain('dogfood')
  })

  test('every leaf supports at least one scope', () => {
    for (const name of targetNames()) {
      expect(SYNC_TARGETS[name]!.scopes.length, name).toBeGreaterThan(0)
    }
  })
})
