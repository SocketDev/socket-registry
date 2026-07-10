// vitest spec for check-rule-citations-are-generic. The exported pure
// functions (isExempt + scanRepo) are exercised against temp fixture trees
// built with node:fs so no real repo or network is needed. Importing the
// check is side-effect-free (main() is entrypoint-guarded).

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, test } from 'vitest'

import {
  isExempt,
  scanRepo,
} from '../../../scripts/fleet/check/rule-citations-are-generic.mts'

// ---------------------------------------------------------------------------
// isExempt
// ---------------------------------------------------------------------------

describe('isExempt', () => {
  test('exempts the shared dated-citation module path', () => {
    assert.equal(
      isExempt('.claude/hooks/fleet/_shared/dated-citation.mts'),
      true,
    )
  })

  test('exempts the dated-citation-guard hook directory', () => {
    assert.equal(
      isExempt('.claude/hooks/fleet/dated-citation-guard/README.md'),
      true,
    )
  })

  test('exempts the check script itself', () => {
    assert.equal(
      isExempt('scripts/fleet/check/rule-citations-are-generic.mts'),
      true,
    )
  })

  test('does not exempt a regular CLAUDE.md path', () => {
    assert.equal(isExempt('CLAUDE.md'), false)
  })

  test('does not exempt a docs/agents.md/fleet surface', () => {
    assert.equal(isExempt('docs/agents.md/fleet/some-topic.md'), false)
  })
})

// ---------------------------------------------------------------------------
// Helpers for fixture trees
// ---------------------------------------------------------------------------

function makeTmpRepo(): string {
  return mkdtempSync(path.join(os.tmpdir(), 'rule-citations-'))
}

function writeFile(dir: string, relPath: string, content: string): void {
  const abs = path.join(dir, relPath)
  mkdirSync(path.dirname(abs), { recursive: true })
  writeFileSync(abs, content, 'utf8')
}

// ---------------------------------------------------------------------------
// scanRepo — PASS cases (no findings)
// ---------------------------------------------------------------------------

describe('scanRepo — compliant inputs', () => {
  test('CLAUDE.md with no rationale lines → no findings', () => {
    const root = makeTmpRepo()
    writeFile(root, 'CLAUDE.md', '# Rules\n\n- Always do X.\n- Never do Y.\n')
    assert.deepEqual(scanRepo(root), [])
  })

  test('CLAUDE.md with a generic Why: rationale (no specificity token) → no findings', () => {
    const root = makeTmpRepo()
    writeFile(
      root,
      'CLAUDE.md',
      '# Rules\n\n**Why:** A cascade that shipped without its reconciled lockfile stranded the operator.\n',
    )
    assert.deepEqual(scanRepo(root), [])
  })

  test('non-rule-prose surface with a dated incident line is not scanned', () => {
    // e.g. CHANGELOG.md is exempt via EXEMPT_PATH_RE
    const root = makeTmpRepo()
    writeFile(
      root,
      'CHANGELOG.md',
      '## v1.2.3\n**Why:** regression on 2026-06-07 — pnpm 11.0.0 vs 11.4.0\n',
    )
    assert.deepEqual(scanRepo(root), [])
  })

  test('docs/agents.md/fleet/ skill file with a bare Why: and no token → no findings', () => {
    const root = makeTmpRepo()
    writeFile(
      root,
      'docs/agents.md/fleet/some-topic.md',
      '# Topic\n\n**Why:** over-specific citations age into a changelog; timeless examples stay useful.\n',
    )
    assert.deepEqual(scanRepo(root), [])
  })

  test('a .claude/hooks/fleet/<name>/README.md with no rationale → no findings', () => {
    const root = makeTmpRepo()
    writeFile(
      root,
      '.claude/hooks/fleet/my-guard/README.md',
      '# my-guard\n\nBlocks X when Y.\n',
    )
    assert.deepEqual(scanRepo(root), [])
  })

  test('a .claude/skills/fleet/<skill>/SKILL.md with generic rationale → no findings', () => {
    const root = makeTmpRepo()
    writeFile(
      root,
      '.claude/skills/fleet/my-skill/SKILL.md',
      '# My Skill\n\n**Why:** fleet drift is a defect; this skill reconciles it.\n',
    )
    assert.deepEqual(scanRepo(root), [])
  })

  test('files in node_modules are skipped', () => {
    const root = makeTmpRepo()
    writeFile(
      root,
      'node_modules/some-pkg/CLAUDE.md',
      '**Why:** regression on 2026-01-02 broke everything\n',
    )
    assert.deepEqual(scanRepo(root), [])
  })
})

// ---------------------------------------------------------------------------
// scanRepo — FAIL cases (findings expected)
// ---------------------------------------------------------------------------

describe('scanRepo — violating inputs', () => {
  test('CLAUDE.md with an ISO date on a Why: line → one finding', () => {
    const root = makeTmpRepo()
    const content =
      '# Rules\n\n**Why:** on 2026-06-07 the pnpm lockfile was wrong.\n'
    writeFile(root, 'CLAUDE.md', content)
    const findings = scanRepo(root)
    assert.equal(findings.length, 1)
    assert.equal(findings[0]!.file, 'CLAUDE.md')
    assert.equal(findings[0]!.line, 3)
    assert.equal(findings[0]!.label, 'ISO date (YYYY-MM-DD)')
    assert.match(findings[0]!.text, /2026-06-07/)
  })

  test('docs/agents.md/fleet/ file with a version delta on a regression line → one finding', () => {
    const root = makeTmpRepo()
    const content =
      '# Topic\n\nThis was a regression when upgrading pnpm 11.0.0 → 11.4.0.\n'
    writeFile(root, 'docs/agents.md/fleet/topic.md', content)
    const findings = scanRepo(root)
    assert.equal(findings.length, 1)
    assert.equal(findings[0]!.label, 'version delta')
    assert.match(findings[0]!.text, /11\.0\.0/)
  })

  test('hook README.md with a commit SHA on an incident line → one finding', () => {
    const root = makeTmpRepo()
    const content =
      '# Guard\n\nPast incident: the lockfile was broken at SHA abc1234def and shipped fleet-wide.\n'
    writeFile(root, '.claude/hooks/fleet/my-guard/README.md', content)
    const findings = scanRepo(root)
    assert.equal(findings.length, 1)
    assert.equal(findings[0]!.label, 'commit SHA')
    assert.match(findings[0]!.text, /abc1234def/)
  })

  test('SKILL.md with a percentage delta on a Why: line → one finding', () => {
    const root = makeTmpRepo()
    const content =
      '# Skill\n\n**Why:** coverage dropped from 98.9% → 99.15% after the change.\n'
    writeFile(root, '.claude/skills/fleet/my-skill/SKILL.md', content)
    const findings = scanRepo(root)
    assert.equal(findings.length, 1)
    assert.equal(findings[0]!.label, 'percentage delta')
  })

  test('multiple violating files each produce their own finding', () => {
    const root = makeTmpRepo()
    writeFile(
      root,
      'CLAUDE.md',
      '**Why:** regression on 2025-03-15 in the bootstrap step.\n',
    )
    writeFile(
      root,
      'docs/agents.md/fleet/another.md',
      '**Why:** incident — pnpm 10.0.0 → 10.1.0 broke the hook.\n',
    )
    const findings = scanRepo(root)
    assert.equal(findings.length, 2)
  })
})
