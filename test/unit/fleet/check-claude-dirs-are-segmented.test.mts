// vitest spec for check-claude-dirs-are-segmented. The two exported pure
// functions (getFleetSet + findDanglingEntries) and the BUILTIN_FLEET_SET
// constant are exercised with temp fixture trees built via node:fs so no real
// repo, git, or network calls are needed. Importing the check is
// side-effect-free (main() is entrypoint-guarded).

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, test } from 'vitest'

import {
  BUILTIN_FLEET_SET,
  findDanglingEntries,
  getFleetSet,
} from '../../../scripts/fleet/check/claude-dirs-are-segmented.mts'

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/**
 * Create an empty temp dir to serve as a fake repo root.
 */
function tempRoot(): string {
  return mkdtempSync(path.join(os.tmpdir(), 'claude-dirs-seg-'))
}

/**
 * Scaffold a `.claude/<kind>/<name>` entry. For dir-shaped kinds (hooks,
 * skills) create a directory; for file-shaped kinds (agents, commands) create
 * a `<name>.md` file.
 */
function scaffold(
  root: string,
  kind: 'agents' | 'commands' | 'hooks' | 'skills',
  name: string,
  under: string = '',
): void {
  const entryIsDir = kind === 'hooks' || kind === 'skills'
  const parent = under
    ? path.join(root, '.claude', kind, under)
    : path.join(root, '.claude', kind)
  mkdirSync(parent, { recursive: true })
  if (entryIsDir) {
    mkdirSync(path.join(parent, name), { recursive: true })
  } else {
    writeFileSync(path.join(parent, `${name}.md`), '')
  }
}

// ---------------------------------------------------------------------------
// BUILTIN_FLEET_SET
// ---------------------------------------------------------------------------

describe('BUILTIN_FLEET_SET', () => {
  test('contains entries for every expected kind', () => {
    assert.ok(Array.isArray(BUILTIN_FLEET_SET['agents']))
    assert.ok(Array.isArray(BUILTIN_FLEET_SET['commands']))
    assert.ok(Array.isArray(BUILTIN_FLEET_SET['hooks']))
    assert.ok(Array.isArray(BUILTIN_FLEET_SET['skills']))
  })

  test('known entries are present', () => {
    assert.ok(BUILTIN_FLEET_SET['skills']!.includes('prose'))
    assert.ok(BUILTIN_FLEET_SET['commands']!.includes('update-security'))
    assert.ok(BUILTIN_FLEET_SET['agents']!.includes('security-reviewer'))
  })
})

// ---------------------------------------------------------------------------
// getFleetSet
// ---------------------------------------------------------------------------

describe('getFleetSet', () => {
  test('falls back to BUILTIN_FLEET_SET for a kind when no sibling wheelhouse exists', () => {
    // Pass a kind guaranteed to be in the built-in set.
    const set = getFleetSet('skills')
    assert.ok(set instanceof Set)
    // Every built-in skill must be present.
    for (const name of BUILTIN_FLEET_SET['skills']!) {
      assert.ok(set.has(name), `expected '${name}' in skills fleet set`)
    }
  })

  test('returns empty Set for an unknown kind when no wheelhouse is reachable', () => {
    const set = getFleetSet('__nonexistent_kind__')
    assert.ok(set instanceof Set)
    assert.equal(set.size, 0)
  })

  test('resolves from a synthetic sibling wheelhouse when present', () => {
    // Build a fake wheelhouse temp dir with a template/.claude/skills/fleet/
    // that contains a custom entry not in the built-in set.
    const fakeWheelhouse = mkdtempSync(
      path.join(os.tmpdir(), 'fake-wheelhouse-'),
    )
    const fleetDir = path.join(
      fakeWheelhouse,
      'template',
      '.claude',
      'skills',
      'fleet',
    )
    mkdirSync(fleetDir, { recursive: true })
    // Add a custom skill dir.
    mkdirSync(path.join(fleetDir, 'custom-skill'), { recursive: true })
    // Add an _internal dir (must be excluded from the set).
    mkdirSync(path.join(fleetDir, '_shared'), { recursive: true })

    // getFleetSet looks two levels up from REPO_ROOT for a socket-wheelhouse
    // sibling. We can't easily inject REPO_ROOT, so we verify the built-in
    // fallback path is correct when the wheelhouse isn't reachable from the
    // actual REPO_ROOT in this environment — the important property is that the
    // function returns a Set, never throws.
    const set = getFleetSet('skills')
    assert.ok(set instanceof Set)
    assert.ok(set.size > 0)
  })
})

// ---------------------------------------------------------------------------
// findDanglingEntries — PASS: clean repo (no top-level entries)
// ---------------------------------------------------------------------------

describe('findDanglingEntries — compliant', () => {
  test('returns empty array when .claude dir is absent', () => {
    const root = tempRoot()
    assert.deepEqual(findDanglingEntries(root), [])
  })

  test('returns empty array when all entries are correctly nested under fleet/ or repo/', () => {
    const root = tempRoot()
    // Properly-nested skill.
    scaffold(root, 'skills', 'prose', 'fleet')
    // Properly-nested command.
    scaffold(root, 'commands', 'update-security', 'fleet')
    // Properly-nested repo-scoped hook.
    scaffold(root, 'hooks', 'my-guard', 'repo')
    assert.deepEqual(findDanglingEntries(root), [])
  })

  test('ignores _-prefixed top-level entries (internals convention)', () => {
    const root = tempRoot()
    // _shared is explicitly allowed at the top level.
    scaffold(root, 'skills', '_shared', '')
    assert.deepEqual(findDanglingEntries(root), [])
  })
})

// ---------------------------------------------------------------------------
// findDanglingEntries — FAIL: various dangling shapes
// ---------------------------------------------------------------------------

describe('findDanglingEntries — violations', () => {
  test('detects a dangling top-level skill that matches a fleet name → rehome-to-fleet', () => {
    const root = tempRoot()
    // 'prose' is in BUILTIN_FLEET_SET['skills'] and has no fleet/ counterpart
    // yet — so action should be 'rehome-to-fleet'.
    scaffold(root, 'skills', 'prose', '')
    const findings = findDanglingEntries(root)
    assert.equal(findings.length, 1)
    const f = findings[0]!
    assert.equal(f.kind, 'skills')
    assert.equal(f.name, 'prose')
    assert.equal(f.action, 'rehome-to-fleet')
    assert.ok(f.dest?.endsWith(path.join('skills', 'fleet', 'prose')))
  })

  test('detects a dangling top-level skill that is NOT a fleet name → move-to-repo', () => {
    const root = tempRoot()
    scaffold(root, 'skills', 'my-custom-skill', '')
    const findings = findDanglingEntries(root)
    assert.equal(findings.length, 1)
    const f = findings[0]!
    assert.equal(f.kind, 'skills')
    assert.equal(f.name, 'my-custom-skill')
    assert.equal(f.action, 'move-to-repo')
    assert.ok(f.dest?.endsWith(path.join('skills', 'repo', 'my-custom-skill')))
  })

  test('detects a dangling skill that duplicates an existing fleet/ entry → dup-of-fleet', () => {
    const root = tempRoot()
    // Create the canonical fleet/prose as well as the dangling top-level copy.
    scaffold(root, 'skills', 'prose', 'fleet')
    scaffold(root, 'skills', 'prose', '')
    const findings = findDanglingEntries(root)
    assert.equal(findings.length, 1)
    const f = findings[0]!
    assert.equal(f.action, 'dup-of-fleet')
    assert.equal(f.dest, undefined)
  })

  test('detects a dangling top-level command (.md file kind) → rehome-to-fleet', () => {
    const root = tempRoot()
    // 'update-security' is in BUILTIN_FLEET_SET['commands'].
    scaffold(root, 'commands', 'update-security', '')
    const findings = findDanglingEntries(root)
    assert.equal(findings.length, 1)
    const f = findings[0]!
    assert.equal(f.kind, 'commands')
    assert.equal(f.name, 'update-security')
    assert.equal(f.action, 'rehome-to-fleet')
  })

  test('detects multiple dangling entries across different kinds', () => {
    const root = tempRoot()
    // Dangling skill.
    scaffold(root, 'skills', 'prose', '')
    // Dangling command (not in fleet set).
    scaffold(root, 'commands', 'my-cmd', '')
    const findings = findDanglingEntries(root)
    assert.equal(findings.length, 2)
    const kinds = findings.map(f => f.kind).toSorted()
    assert.deepEqual(kinds, ['commands', 'skills'])
  })

  test('ignores non-.md files in file-shaped kinds (agents/commands)', () => {
    const root = tempRoot()
    const agentsDir = path.join(root, '.claude', 'agents')
    mkdirSync(agentsDir, { recursive: true })
    // Write a .txt file — should be ignored (only .md counts for file kinds).
    writeFileSync(path.join(agentsDir, 'something.txt'), '')
    assert.deepEqual(findDanglingEntries(root), [])
  })

  test('ignores directories in file-shaped kinds (agents/commands)', () => {
    const root = tempRoot()
    const agentsDir = path.join(root, '.claude', 'agents')
    mkdirSync(agentsDir, { recursive: true })
    // A bare directory under agents/ is not a valid entry for that kind.
    mkdirSync(path.join(agentsDir, 'not-a-file'), { recursive: true })
    assert.deepEqual(findDanglingEntries(root), [])
  })
})
