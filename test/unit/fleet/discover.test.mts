// vitest specs for the `updating` umbrella discovery probes. probeCoverage and
// probePricing are filesystem-driven (no spawn), so they're exercised against
// temp dirs. The lockstep / registry-pin / submodule probes shell out to other
// tools and are integration-level.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { test } from 'vitest'

import {
  probeCoverage,
  probePricing,
} from '../../../.claude/skills/fleet/updating/lib/discover.mts'

function tmp(): string {
  return mkdtempSync(path.join(os.tmpdir(), 'updating-discover-'))
}

function writePkg(dir: string, scripts: Record<string, string>): void {
  writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'fixture', scripts }),
  )
}

function writeRouting(dir: string, snapshot: string): void {
  const docDir = path.join(dir, 'docs', 'agents.md', 'fleet')
  mkdirSync(docDir, { recursive: true })
  writeFileSync(
    path.join(docDir, 'skill-model-routing.md'),
    `# routing\n\n<!-- MODEL-PRICING-SNAPSHOT: ${snapshot} -->\n`,
  )
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)
}

test('probeCoverage reports actionable when a coverage script exists', async () => {
  const dir = tmp()
  writePkg(dir, { coverage: 'vitest run --coverage' })
  const item = await probeCoverage(dir)
  assert.equal(item.applies, true)
  assert.equal(item.actionable, true)
  assert.ok(item.items.some(s => s.includes('coverage')))
})

test('probeCoverage does not apply when no coverage script exists', async () => {
  const dir = tmp()
  writePkg(dir, { build: 'tsc' })
  const item = await probeCoverage(dir)
  assert.equal(item.applies, false)
  assert.equal(item.actionable, false)
})

test('probePricing is clean when the snapshot is fresh', async () => {
  const dir = tmp()
  writeRouting(dir, isoDaysAgo(1))
  const item = await probePricing(dir)
  assert.equal(item.applies, true)
  assert.equal(item.actionable, false)
})

test('probePricing is actionable when the snapshot is stale', async () => {
  const dir = tmp()
  writeRouting(dir, isoDaysAgo(60))
  const item = await probePricing(dir)
  assert.equal(item.applies, true)
  assert.equal(item.actionable, true)
  assert.ok(item.items.some(s => s.includes('days old')))
})

test('probePricing does not apply when the routing doc is absent', async () => {
  const item = await probePricing(tmp())
  assert.equal(item.applies, false)
})
