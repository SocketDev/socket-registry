/**
 * @file Unit tests for the dual-lane override gate. Covers the probe battery's
 *   composition (it must include the inputs that exposed the real lane bugs:
 *   primitive numbers, boxed wrappers, async generator functions, coercing
 *   keys, Float16Array), the red paths on synthetic divergent fixtures in an
 *   OS scratch dir, and the live-tree assertion that this repo's own overrides
 *   pass - so `pnpm test` catches a lane divergence, not only `pnpm run
 *   check`.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterAll, describe, expect, it } from 'vitest'

import { safeDelete } from '@socketsecurity/lib-stable/fs/safe'

import {
  buildProbeBattery,
  collectLaneDivergences,
  runOverrideLanesCheck,
} from '../../../../scripts/repo/check/override-lanes-agree.mts'

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
)

const scratchRoots: string[] = []

function scratchRepoWithLanes(jsSource: string, cjsSource: string): string {
  const root = mkdtempSync(path.join(os.tmpdir(), 'override-lanes-'))
  scratchRoots.push(root)
  const pkgDir = path.join(root, 'packages', 'npm', 'fixture-pkg')
  mkdirSync(pkgDir, { recursive: true })
  writeFileSync(path.join(pkgDir, 'index.js'), jsSource)
  writeFileSync(path.join(pkgDir, 'index.cjs'), cjsSource)
  return root
}

afterAll(async () => {
  for (let i = 0, { length } = scratchRoots; i < length; i += 1) {
    const root = scratchRoots[i]!
    await safeDelete(root)
  }
})

describe('scripts/repo/check/override-lanes-agree', () => {
  describe('probe battery', () => {
    it('carries every input class that exposed a real lane bug', () => {
      const labels = new Set(buildProbeBattery().map(([label]) => label))
      for (const required of [
        // is-number-object: util/types is boxed-only, upstream takes primitives.
        'number primitive',
        'boxed Number',
        // is-generator-function: util/types matches async generators.
        'generator function',
        'async generator function',
        // is-core-module: ToPropertyKey coercion throws must propagate.
        'Date.prototype descendant',
        'boxed Symbol',
      ]) {
        expect(labels.has(required)).toBe(true)
      }
    })

    it('probes Float16Array where the runtime has it', () => {
      const labels = new Set(buildProbeBattery().map(([label]) => label))
      const runtimeHasIt =
        typeof (globalThis as Record<string, unknown>)['Float16Array'] ===
        'function'
      expect(labels.has('float16array')).toBe(runtimeHasIt)
    })
  })

  describe('synthetic fixtures', () => {
    it('flags a behavioral divergence between lanes', () => {
      const root = scratchRepoWithLanes(
        "'use strict'\nmodule.exports = function isFixture(value) { return typeof value === 'number' }\n",
        "'use strict'\nmodule.exports = function isFixture(value) { return false }\n",
      )
      const report = collectLaneDivergences(root)
      expect(report.packagesCompared).toBe(1)
      expect(
        report.divergences.some(d => d.probeLabel === 'number primitive'),
      ).toBe(true)
      expect(runOverrideLanesCheck(root, { quiet: true })).toBe(1)
    })

    it('flags an exported-name divergence even when behavior agrees', () => {
      const root = scratchRepoWithLanes(
        "'use strict'\nmodule.exports = function isFixture(value) { return false }\n",
        "'use strict'\nmodule.exports = function isSomethingElse(value) { return false }\n",
      )
      const report = collectLaneDivergences(root)
      expect(report.divergences).toHaveLength(1)
      expect(report.divergences[0]?.probeLabel).toBe('exported function name')
      expect(report.upstreamNamesUnavailable).toBe(1)
    })

    it('passes agreeing lanes and reports the comparison count', () => {
      const root = scratchRepoWithLanes(
        "'use strict'\nmodule.exports = function isFixture(value) { return value === 1 }\n",
        "'use strict'\nmodule.exports = function isFixture(value) { return value === 1 }\n",
      )
      const report = collectLaneDivergences(root)
      expect(report.divergences).toEqual([])
      expect(report.packagesCompared).toBe(1)
      expect(runOverrideLanesCheck(root, { quiet: true })).toBe(0)
    })
  })

  describe('live tree', () => {
    it('every dual-lane override in this repo agrees on behavior and name', () => {
      const report = collectLaneDivergences(REPO_ROOT)
      expect(report.divergences).toEqual([])
      expect(report.packagesCompared).toBeGreaterThan(20)
      expect(report.upstreamNamesChecked).toBeGreaterThan(0)
    })
  })
})
