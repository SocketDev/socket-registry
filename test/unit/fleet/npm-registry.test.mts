// Code-as-law for the single fleet registry: the `.npmrc` `registry=` setting
// (what npm + pnpm read for installs/lookups) MUST equal the canonical
// NPM_REGISTRY constant — the same value the soak-exclude publish-date
// verification + the publish-config hardening gate key off. One source of truth.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { test } from 'vitest'

import {
  NPM_REGISTRY,
  NPM_REGISTRY_URL,
} from '../../../scripts/fleet/constants/npm-registry.mts'
import { REPO_ROOT } from '../../../scripts/fleet/paths.mts'

test('NPM_REGISTRY is the trailing-slash form of NPM_REGISTRY_URL', () => {
  assert.equal(NPM_REGISTRY, `${NPM_REGISTRY_URL}/`)
  // No trailing slash on the base — callers append `/${name}`.
  assert.ok(!NPM_REGISTRY_URL.endsWith('/'))
})

test('.npmrc registry= matches the canonical NPM_REGISTRY (config ↔ constant)', () => {
  const npmrc = readFileSync(path.join(REPO_ROOT, '.npmrc'), 'utf8')
  const match = /^registry=(?<registry>\S+)\s*$/m.exec(npmrc)
  assert.ok(match, '.npmrc must declare an explicit `registry=` line')
  assert.equal(match!.groups!['registry'], NPM_REGISTRY)
})
