// vitest specs for check-publish-config-is-hardened.

import assert from 'node:assert/strict'

import { test } from 'vitest'

import {
  checkPublishConfig,
  formatValue,
  NPM_REGISTRY,
} from '../../../scripts/fleet/check/publish-config-is-hardened.mts'

// ── checkPublishConfig: the hardened case ───────────────────────

test('a public, provenance-attested package yields no findings', () => {
  const findings = checkPublishConfig(
    { name: '@x/ok', publishConfig: { access: 'public', provenance: true } },
    'x/package.json',
  )
  assert.equal(findings.length, 0)
})

test('an npmjs registry pin alongside access+provenance is allowed', () => {
  const findings = checkPublishConfig(
    {
      name: '@x/ok',
      publishConfig: {
        access: 'public',
        provenance: true,
        registry: NPM_REGISTRY,
      },
    },
    'x/package.json',
  )
  assert.equal(findings.length, 0)
})

// ── checkPublishConfig: each violation ──────────────────────────

test('missing publishConfig flags both access and provenance', () => {
  const findings = checkPublishConfig({ name: '@x/bare' }, 'x/package.json')
  // Findings come back in a fixed order: access, then provenance, then registry.
  assert.deepEqual(
    findings.map(f => f.field),
    ['access', 'provenance'],
  )
})

test('access "restricted" is flagged', () => {
  const findings = checkPublishConfig(
    {
      name: '@x/r',
      publishConfig: { access: 'restricted', provenance: true },
    },
    'x/package.json',
  )
  assert.equal(findings.length, 1)
  assert.equal(findings[0]!.field, 'access')
})

test('provenance:false is flagged (only true counts)', () => {
  const findings = checkPublishConfig(
    { name: '@x/p', publishConfig: { access: 'public', provenance: false } },
    'x/package.json',
  )
  assert.equal(findings.length, 1)
  assert.equal(findings[0]!.field, 'provenance')
})

test('a non-npmjs registry pin is flagged', () => {
  const findings = checkPublishConfig(
    {
      name: '@x/reg',
      publishConfig: {
        access: 'public',
        provenance: true,
        registry: 'https://evil.example/',
      },
    },
    'x/package.json',
  )
  assert.equal(findings.length, 1)
  assert.equal(findings[0]!.field, 'registry')
})

test('a fully-misconfigured package flags all three fields', () => {
  const findings = checkPublishConfig(
    { name: '@x/bad', publishConfig: { registry: 'https://evil.example/' } },
    'x/package.json',
  )
  assert.deepEqual(
    findings.map(f => f.field),
    ['access', 'provenance', 'registry'],
  )
})

// ── checkPublishConfig: private packages are exempt ─────────────

test('a private package is skipped even with no publishConfig', () => {
  const findings = checkPublishConfig(
    { name: '@x/internal', private: true },
    'x/package.json',
  )
  assert.equal(findings.length, 0)
})

// ── finding message carries the four ingredients ────────────────

test('a finding names the package, path, observed value, and fix', () => {
  const [finding] = checkPublishConfig(
    { name: '@x/bare' },
    'packages/bare/package.json',
  )
  assert.ok(finding)
  assert.match(finding.message, /@x\/bare/)
  assert.match(finding.message, /packages\/bare\/package\.json/)
  assert.match(finding.message, /unset/)
  assert.match(finding.message, /Set publishConfig\.access to "public"/)
})

// ── formatValue ─────────────────────────────────────────────────

test('formatValue renders unset/string/boolean unambiguously', () => {
  assert.equal(formatValue(undefined), 'unset')
  assert.equal(formatValue('restricted'), '"restricted"')
  assert.equal(formatValue(false), 'false')
})
