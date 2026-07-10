// vitest specs for the telemetry scanner (lib/telemetry-scan.mts) that backs
// check/telemetry-deps-are-reviewed.mts + the update.mts fail-closed pass.
// Covers SDK detection, the inert-API exclusion, lockfile/purl name extraction,
// and the reviewed-baseline (fail-on-ADDED) logic.

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'

import {
  findTelemetryDeps,
  matchesTelemetrySdk,
  namesFromExternalTools,
  namesFromPnpmLock,
  namesFromUvLock,
  REVIEWED_TELEMETRY,
  unreviewedTelemetry,
} from '../../../scripts/fleet/lib/telemetry-scan.mts'

describe('telemetry-scan — matchesTelemetrySdk', () => {
  test('flags real telemetry / analytics SDKs', () => {
    for (const n of [
      '@sentry/node',
      'sentry-sdk',
      'posthog-node',
      '@posthog/core',
      'mixpanel',
      '@segment/analytics-node',
      'analytics-python',
      '@amplitude/analytics-browser',
      'dd-trace',
      '@datadog/browser-rum',
      'opentelemetry-sdk',
      'opentelemetry-exporter-otlp-proto-http',
      '@opentelemetry/exporter-trace-otlp-http',
      '@scarf/scarf',
      'langfuse',
    ]) {
      assert.equal(matchesTelemetrySdk(n), true, `${n} should be flagged`)
    }
  })
  test('does NOT flag inert APIs or ordinary deps', () => {
    for (const n of [
      'opentelemetry-api', // no exporter — cannot phone home
      '@opentelemetry/api',
      'react',
      'lodash',
      'tiktoken',
      'fastapi',
      'sentinel', // not "sentry"
      'segment-tree', // not "@segment/"
    ]) {
      assert.equal(matchesTelemetrySdk(n), false, `${n} should NOT be flagged`)
    }
  })
})

describe('telemetry-scan — reviewed baseline (fail on ADDED)', () => {
  test('empty reviewed baseline: every telemetry SDK is unreviewed', () => {
    // REVIEWED_TELEMETRY is empty (telemetry-off posture; PostHog was dropped
    // with @rely-ai/caliber), so nothing is tolerated — all three flag.
    assert.deepEqual(
      unreviewedTelemetry(['posthog-node', '@posthog/core', '@posthog/types']),
      ['@posthog/core', '@posthog/types', 'posthog-node'],
    )
  })
  test('telemetry SDKs are unreviewed; non-telemetry deps are ignored', () => {
    assert.deepEqual(
      unreviewedTelemetry(['react', 'posthog-node', '@sentry/node']),
      ['@sentry/node', 'posthog-node'],
    )
  })
  test('findTelemetryDeps returns sorted matches, ignores non-telemetry', () => {
    assert.deepEqual(
      findTelemetryDeps(['react', '@sentry/node', 'lodash', 'mixpanel']),
      ['@sentry/node', 'mixpanel'],
    )
  })
  test('the reviewed baseline only holds genuinely-tolerated entries', () => {
    // Every reviewed entry must itself be a telemetry SDK (no stale junk).
    for (const name of Object.keys(REVIEWED_TELEMETRY)) {
      assert.equal(
        matchesTelemetrySdk(name),
        true,
        `${name} in baseline is an SDK`,
      )
    }
  })
})

describe('telemetry-scan — name extraction', () => {
  test('namesFromPnpmLock pulls package names (scoped + unscoped)', () => {
    const lock = [
      'packages:',
      "  'posthog-node@5.33.4':",
      '  /lodash@4.17.21:',
      "  '@sentry/node@8.0.0':",
    ].join('\n')
    const names = namesFromPnpmLock(lock)
    assert.ok(names.includes('posthog-node'))
    assert.ok(names.includes('lodash'))
    assert.ok(names.includes('@sentry/node'))
  })
  test('namesFromUvLock pulls the [[package]] names', () => {
    const lock = [
      '[[package]]',
      'name = "opentelemetry-api"',
      'version = "1.24.0"',
      '[[package]]',
      'name = "sentry-sdk"',
    ].join('\n')
    assert.deepEqual(namesFromUvLock(lock).toSorted(), [
      'opentelemetry-api',
      'sentry-sdk',
    ])
  })
  test('namesFromExternalTools pulls purl package names', () => {
    const json =
      '{"tools":{"x":{"purl":"pkg:pypi/headroom-ai@0.24.0"},"y":{"purl":"pkg:npm/@sentry/node@8.0.0"}}}'
    const names = namesFromExternalTools(json)
    assert.ok(names.includes('headroom-ai'))
    assert.ok(names.includes('@sentry/node'))
  })
})
