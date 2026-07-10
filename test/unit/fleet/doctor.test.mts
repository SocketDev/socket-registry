// vitest specs for scripts/fleet/doctor.mts (CLI integration level).
//
// Engine-level specs live in the dedicated test files:
//   workspace-yaml.test.mts  — parseCatalogBlock, parseListBlock, etc.
//   catalog-gap.test.mts     — collectCatalogRefs, diagnoseCatalogGaps, applyCatalogFixes
//   soak-gap.test.mts        — parseSoakViolations, formatSoakFinding

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, test } from 'vitest'

import { dlxToolCandidates } from '../../../scripts/fleet/doctor.mts'
import {
  collectCatalogRefs,
  diagnoseCatalogGaps,
} from '../../../scripts/fleet/lib/doctor/catalog-gap.mts'

// ── overrides: catalog: gap (cross-engine integration) ──────────────────────

describe('doctor gap detection — overrides catalog ref', () => {
  const fleetYaml = [
    'catalog:',
    "  vitest: '4.1.9'",
    '',
    'catalogOptional:',
    "  'rolldown': 1.1.4",
    "  'vite': 8.1.0",
  ].join('\n')

  test('catalog: ref in workspace yaml overrides block → finding reported', () => {
    const workspaceYaml = [
      'overrides:',
      "  '@socketsecurity/lib': catalog:",
    ].join('\n')
    const refs = collectCatalogRefs({ packageJsons: [], workspaceYaml })
    const { findings } = diagnoseCatalogGaps({ fleetYaml, refs, workspaceYaml })
    const finding = findings.find(
      f =>
        f.what.includes('@socketsecurity/lib') ||
        f.saw.includes('@socketsecurity/lib'),
    )
    assert.ok(finding, 'should produce a finding for overrides catalog: ref')
    assert.ok(finding.what.length > 0)
    assert.ok(finding.where.length > 0)
    assert.ok(finding.saw.length > 0)
    assert.ok(finding.fix.length > 0)
  })
})

// dlxToolCandidates — the doctor's secret-scan resolves the pinned TruffleHog
// from the content-hashed dlx cache (`<dlxRoot>/<hash>/trufflehog`), not just
// PATH, so a post-`pnpm run setup` probe doesn't false-red.
describe('dlxToolCandidates — dlx-cache resolution for the pinned scanner', () => {
  test('finds a one-level-deep binary under the dlx root', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'doctor-dlx-'))
    const hashDir = path.join(dir, 'a1b2c3')
    mkdirSync(hashDir)
    writeFileSync(path.join(hashDir, 'trufflehog'), '#!/bin/sh\n', {
      mode: 0o755,
    })
    const found = dlxToolCandidates(dir, 'trufflehog')
    assert.equal(found.length, 1)
    assert.ok(found[0]!.includes('trufflehog'))
  })

  test('returns [] for a non-existent dlx root', () => {
    assert.deepEqual(
      dlxToolCandidates(
        path.join(os.tmpdir(), 'doctor-dlx-missing-xyz'),
        'trufflehog',
      ),
      [],
    )
  })

  test('returns [] when no matching binary is cached', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'doctor-dlx-'))
    mkdirSync(path.join(dir, 'a1b2c3'))
    writeFileSync(path.join(dir, 'a1b2c3', 'other-tool'), '', { mode: 0o755 })
    assert.deepEqual(dlxToolCandidates(dir, 'trufflehog'), [])
  })
})
