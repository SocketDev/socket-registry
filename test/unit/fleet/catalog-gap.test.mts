// vitest specs for scripts/fleet/lib/doctor/catalog-gap.mts

import assert from 'node:assert/strict'

import { describe, test } from 'vitest'

import {
  applyCatalogFixes,
  collectCatalogRefs,
  diagnoseCatalogGaps,
} from '../../../scripts/fleet/lib/doctor/catalog-gap.mts'

// ── collectCatalogRefs ───────────────────────────────────────────────────────

describe('collectCatalogRefs', () => {
  test('finds catalog: refs in dependencies', () => {
    const pkg = JSON.stringify({
      name: 'my-pkg',
      dependencies: { rolldown: 'catalog:', vite: 'catalog:' },
    })
    const refs = collectCatalogRefs({
      packageJsons: [{ content: pkg, path: 'package.json' }],
      workspaceYaml: 'catalog:\n  vitest: 4.1.9\n',
    })
    assert.ok(
      refs.some(r => r.dep === 'rolldown' && r.catalogName === undefined),
    )
    assert.ok(refs.some(r => r.dep === 'vite' && r.catalogName === undefined))
  })

  test('finds catalog:named refs', () => {
    const pkg = JSON.stringify({
      name: 'my-pkg',
      dependencies: { react: 'catalog:react17' },
    })
    const refs = collectCatalogRefs({
      packageJsons: [{ content: pkg, path: 'package.json' }],
      workspaceYaml: '',
    })
    assert.ok(refs.some(r => r.dep === 'react' && r.catalogName === 'react17'))
  })

  test('catalog:default is treated as the default catalog', () => {
    const pkg = JSON.stringify({
      name: 'my-pkg',
      devDependencies: { typescript: 'catalog:default' },
    })
    const refs = collectCatalogRefs({
      packageJsons: [{ content: pkg, path: 'package.json' }],
      workspaceYaml: '',
    })
    assert.ok(
      refs.some(r => r.dep === 'typescript' && r.catalogName === undefined),
    )
  })

  test('finds catalog: in workspace yaml overrides', () => {
    const workspaceYaml = [
      'overrides:',
      "  '@socketsecurity/lib': catalog:",
    ].join('\n')
    const refs = collectCatalogRefs({
      packageJsons: [],
      workspaceYaml,
    })
    assert.ok(
      refs.some(
        r => r.dep === '@socketsecurity/lib' && r.source.includes('overrides'),
      ),
    )
  })
})

// ── diagnoseCatalogGaps ──────────────────────────────────────────────────────

describe('diagnoseCatalogGaps', () => {
  const fleetYaml = [
    'catalog:',
    "  vitest: '4.1.9'",
    '',
    'catalogOptional:',
    "  'rolldown': 1.1.4",
    "  'vite': 8.1.0",
  ].join('\n')

  test('ultrathink reproduction: rolldown catalog: ref, no member entry, fleet optional version → fixable finding', () => {
    const pkg = JSON.stringify({
      name: 'ultrathink',
      devDependencies: { rolldown: 'catalog:' },
    })
    const workspaceYaml = 'catalog:\n  vitest: 4.1.9\n'
    const refs = collectCatalogRefs({
      packageJsons: [{ content: pkg, path: 'package.json' }],
      workspaceYaml,
    })
    const { findings, fixes } = diagnoseCatalogGaps({
      fleetYaml,
      refs,
      workspaceYaml,
    })
    const finding = findings.find(f => f.what.includes('rolldown'))
    assert.ok(finding, 'should produce a finding for rolldown')
    assert.equal(finding.fixable, true)
    assert.ok(fixes.some(f => f.name === 'rolldown'))
  })

  test('applyCatalogFixes inserts rolldown sorted, quoted, idempotent', () => {
    const workspaceYaml = [
      'catalog:',
      "  'aaa': 1.0.0",
      "  'vitest': 4.1.9",
      '',
    ].join('\n')
    const fixes = [{ name: 'rolldown', version: '1.1.4' }]
    const result = applyCatalogFixes({ fixes, workspaceYaml })
    assert.ok(result.includes("  'rolldown': 1.1.4"))
    // Sorted: aaa < rolldown < vitest
    const lines = result.split('\n')
    const aaaIdx = lines.findIndex(l => l.includes('aaa'))
    const rolldownIdx = lines.findIndex(l => l.includes('rolldown'))
    const vitestIdx = lines.findIndex(l => l.includes('vitest'))
    assert.ok(aaaIdx < rolldownIdx && rolldownIdx < vitestIdx)
    // Idempotent
    const result2 = applyCatalogFixes({ fixes, workspaceYaml: result })
    assert.equal(result2, result)
  })

  test('npm: alias spec is quoted in the fix version', () => {
    const fleetWithAlias = [
      'catalog:',
      "  '@socketsecurity/lib-stable': 'npm:@socketsecurity/lib@6.0.9'",
    ].join('\n')
    const pkg = JSON.stringify({
      name: 'my-pkg',
      dependencies: { '@socketsecurity/lib-stable': 'catalog:' },
    })
    const workspaceYaml = 'catalog:\n  vitest: 4.1.9\n'
    const refs = collectCatalogRefs({
      packageJsons: [{ content: pkg, path: 'package.json' }],
      workspaceYaml,
    })
    const { fixes } = diagnoseCatalogGaps({
      fleetYaml: fleetWithAlias,
      refs,
      workspaceYaml,
    })
    const fix = fixes.find(f => f.name === '@socketsecurity/lib-stable')
    assert.ok(fix, 'should produce a fix for lib-stable')
    // Version containing ':' should be quoted.
    assert.ok(fix.version.startsWith("'"), 'version should be single-quoted')
  })

  test('unknown dep → report-only finding with all four ingredients', () => {
    const pkg = JSON.stringify({
      name: 'my-pkg',
      dependencies: { 'not-a-fleet-dep': 'catalog:' },
    })
    const workspaceYaml = 'catalog:\n  vitest: 4.1.9\n'
    const refs = collectCatalogRefs({
      packageJsons: [{ content: pkg, path: 'package.json' }],
      workspaceYaml,
    })
    const { findings, fixes } = diagnoseCatalogGaps({
      fleetYaml,
      refs,
      workspaceYaml,
    })
    const finding = findings.find(f => f.what.includes('not-a-fleet-dep'))
    assert.ok(finding, 'should produce a finding for unknown dep')
    assert.equal(finding.fixable, false)
    assert.ok(finding.what)
    assert.ok(finding.where)
    assert.ok(finding.saw)
    assert.ok(finding.fix)
    assert.equal(fixes.filter(f => f.name === 'not-a-fleet-dep').length, 0)
  })

  test('named-catalog gap → report-only finding', () => {
    const pkg = JSON.stringify({
      name: 'my-pkg',
      dependencies: { react: 'catalog:react17' },
    })
    const workspaceYaml = [
      'catalogs:',
      '  react17:',
      '    react-dom: 17.0.2',
    ].join('\n')
    const refs = collectCatalogRefs({
      packageJsons: [{ content: pkg, path: 'package.json' }],
      workspaceYaml,
    })
    const { findings } = diagnoseCatalogGaps({
      fleetYaml,
      refs,
      workspaceYaml,
    })
    const finding = findings.find(
      f => f.what.includes('react') && f.what.includes('react17'),
    )
    assert.ok(finding, 'should produce a finding for named-catalog gap')
    assert.equal(finding.fixable, false)
  })

  test('missing fleet yaml → report-only finding', () => {
    const pkg = JSON.stringify({
      name: 'my-pkg',
      dependencies: { rolldown: 'catalog:' },
    })
    const workspaceYaml = 'catalog:\n  vitest: 4.1.9\n'
    const refs = collectCatalogRefs({
      packageJsons: [{ content: pkg, path: 'package.json' }],
      workspaceYaml,
    })
    const { findings } = diagnoseCatalogGaps({
      fleetYaml: undefined,
      refs,
      workspaceYaml,
    })
    const finding = findings.find(f => f.what.includes('Fleet catalog'))
    assert.ok(finding, 'should produce a missing-fleet-yaml finding')
    assert.equal(finding.fixable, false)
  })

  test('dep already in member catalog → no finding produced', () => {
    const pkg = JSON.stringify({
      name: 'my-pkg',
      devDependencies: { vitest: 'catalog:' },
    })
    const workspaceYaml = 'catalog:\n  vitest: 4.1.9\n'
    const refs = collectCatalogRefs({
      packageJsons: [{ content: pkg, path: 'package.json' }],
      workspaceYaml,
    })
    const { findings, fixes } = diagnoseCatalogGaps({
      fleetYaml,
      refs,
      workspaceYaml,
    })
    assert.equal(findings.length, 0)
    assert.equal(fixes.length, 0)
  })
})
