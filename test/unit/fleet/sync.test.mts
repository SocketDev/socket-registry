/**
 * @file Tests for the named fleet-sync dispatcher's pure helpers — the path-
 *   glob compiler (`globToRegExp`), the per-leaf rule resolver
 *   (`resolveSyncRules`), and the in-scope predicate (`findingInScope`). These
 *   guard the over-scope fix: a finding is in scope only when SOME leaf owns
 *   its category AND that leaf's path allowlist accepts the file. Imports only
 *   the cascaded dispatcher (the `main()` entry-guard keeps the import
 *   side-effect- free). Cascaded fleet-wide, so it touches no wheelhouse-only
 *   module.
 */

import { describe, expect, test } from 'vitest'

import {
  findingInScope,
  globToRegExp,
  resolveSyncRules,
} from '../../../scripts/fleet/sync.mts'

describe('globToRegExp', () => {
  test('a single star matches one segment, not a slash', () => {
    const re = globToRegExp('.config/fleet/*.json')
    expect(re.test('.config/fleet/oxlintrc.json')).toBe(true)
    expect(re.test('.config/fleet/nested/x.json')).toBe(false)
  })

  test('a trailing double-star matches files under a directory', () => {
    const re = globToRegExp('.config/fleet/oxlint-plugin/**')
    expect(re.test('.config/fleet/oxlint-plugin/index.mts')).toBe(true)
    expect(re.test('.config/fleet/oxlint-plugin/fleet/a/index.mts')).toBe(true)
    expect(re.test('.config/fleet/oxlint-plugin')).toBe(false)
  })

  test('a leading double-star also matches zero leading segments', () => {
    const re = globToRegExp('**/tsconfig.json')
    expect(re.test('tsconfig.json')).toBe(true)
    expect(re.test('packages/x/tsconfig.json')).toBe(true)
    expect(re.test('tsconfig.check.json')).toBe(false)
  })

  test('the glob is anchored — no partial match', () => {
    const re = globToRegExp('.npmrc')
    expect(re.test('.npmrc')).toBe(true)
    expect(re.test('a/.npmrc')).toBe(false)
    expect(re.test('.npmrc.bak')).toBe(false)
  })
})

describe('findingInScope (foundationals)', () => {
  const rules = resolveSyncRules(['foundationals'], 'repo')

  // The exact over-scope leak files from the bad apply — must be OUT of scope.
  test.each([
    ['.git-hooks/pre-commit'],
    ['.config/fleet/github-settings.json'],
    ['.github/workflows/prune-workflow-runs.yml'],
    ['.config/fleet/taze.config.mts'],
  ])('content_drift on %s is OUT of foundationals scope', file => {
    expect(findingInScope(rules, 'content_drift', file)).toBe(false)
  })

  // Genuine foundationals files — must be IN scope.
  test.each([
    ['content_drift', '.config/fleet/oxlintrc.json'],
    ['content_drift', '.config/fleet/oxlint-plugin/fleet/x/index.mts'],
    ['content_drift', '.editorconfig'],
    ['content_drift', 'tsconfig.check.json'],
    ['content_drift', 'packages/x/tsconfig.json'],
    ['gitignore_fleet_drift', '.gitignore'],
    ['workspace_setting', 'pnpm-workspace.yaml'],
    ['package_baseline_drift', 'package.json'],
    ['claude_md_fleet_drift', 'CLAUDE.md'],
  ])('%s on %s is IN foundationals scope', (category, file) => {
    expect(findingInScope(rules, category, file)).toBe(true)
  })
})

describe('findingInScope (all = full payload)', () => {
  const rules = resolveSyncRules(['all'], 'repo')

  // `all` includes the unscoped fleet-code catch-all, so even files that
  // foundationals excludes (a dir-mirror file, a workflow) are back in scope.
  test.each([
    ['content_drift', '.git-hooks/pre-commit'],
    ['content_drift', '.github/workflows/prune-workflow-runs.yml'],
    ['content_drift', '.config/fleet/github-settings.json'],
  ])('%s on %s is IN `all` scope', (category, file) => {
    expect(findingInScope(rules, category, file)).toBe(true)
  })
})

describe('resolveSyncRules validation', () => {
  test('throws on an unknown target name', () => {
    expect(() => resolveSyncRules(['no-such-target'], 'repo')).toThrow(
      /Unknown target/,
    )
  })

  test('throws when a target forbids the scope', () => {
    // dogfood is dogfood-only — not fleet.
    expect(() => resolveSyncRules(['dogfood'], 'fleet')).toThrow(
      /does not support the "fleet" scope/,
    )
  })

  test('throws when no targets are named', () => {
    expect(() => resolveSyncRules([], 'repo')).toThrow(/Name at least one/)
  })
})
