#!/usr/bin/env node
/*
 * @file Repo gate: every npm override that ships both a default `index.js`
 *   lane and a node-condition `index.cjs` lane must express the same upstream
 *   contract on both. A Node built-in backing the cjs lane often covers only
 *   part of the target library's behavior. util/types.isNumberObject is
 *   boxed-only while upstream is-number-object accepts primitives, and
 *   util/types.isGeneratorFunction also matches async generator functions
 *   while upstream is-generator-function rejects them. When the built-in
 *   covers only part of the contract, the cjs lane needs a logical fork,
 *   never a straight alias. This gate requires both lanes of every dual-lane
 *   override and compares them across a same-realm probe battery; any
 *   disagreement is an exit-1 failure naming the package, the probe, and
 *   both verdicts. Usage: node scripts/repo/check/override-lanes-agree.mts
 *   [--quiet]
 */

import { existsSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import process from 'node:process'

import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'

import { isMainModule } from '../../fleet/_shared/is-main-module.mts'

const logger = getDefaultLogger()
const requireCjs = createRequire(import.meta.url)

export interface OverrideLanesCheckOptions {
  // Suppress the pass line; failures always print.
  quiet?: boolean | undefined
}

interface LaneDivergence {
  cjsVerdict: string
  jsVerdict: string
  pkgName: string
  probeLabel: string
}

function capturedArguments(): IArguments {
  // eslint-disable-next-line prefer-rest-params
  return arguments
}

export function buildProbeBattery(): ReadonlyArray<
  readonly [label: string, value: unknown]
> {
  const battery: Array<readonly [string, unknown]> = [
    ['number primitive', 1],
    ['string primitive', 'a'],
    ['boolean primitive', true],
    ['symbol primitive', Symbol('probe')],
    ['bigint primitive', 1n],
    ['boxed Number', Object(1)],
    ['boxed String', Object('a')],
    ['boxed Boolean', Object(true)],
    ['boxed Symbol', Object(Symbol('probe'))],
    ['boxed BigInt', Object(1n)],
    // oxlint-disable-next-line socket/prefer-undefined-over-null -- null is the probe value under test, not a sentinel.
    ['null', null],
    ['undefined', undefined],
    ['plain object', {}],
    ['array', []],
    ['date', new Date(0)],
    ['regexp', /probe/],
    ['map', new Map()],
    ['set', new Set()],
    ['weakmap', new WeakMap()],
    ['weakset', new WeakSet()],
    ['arraybuffer', new ArrayBuffer(4)],
    ['sharedarraybuffer', new SharedArrayBuffer(4)],
    ['uint8array', new Uint8Array(2)],
    ['dataview', new DataView(new ArrayBuffer(4))],
    ['function', function probeFn() {}],
    ['arrow function', () => {}],
    ['async function', async function probeAsync() {}],
    ['generator function', function* probeGen() {}],
    ['async generator function', async function* probeAsyncGen() {}],
    ['arguments object', capturedArguments()],
    ['fake Date toStringTag', { [Symbol.toStringTag]: 'Date' }],
    ['Date.prototype descendant', Object.create(Date.prototype)],
  ]
  const Float16ArrayCtor = (globalThis as Record<string, unknown>)[
    'Float16Array'
  ] as (new (length: number) => unknown) | undefined
  if (typeof Float16ArrayCtor === 'function') {
    battery.push(['float16array', new Float16ArrayCtor(2)])
  }
  return battery
}

function probeVerdict(fn: (value: unknown) => unknown, input: unknown): string {
  try {
    return String(fn(input))
  } catch {
    return 'THROW'
  }
}

export interface LaneComparisonReport {
  divergences: LaneDivergence[]
  packagesCompared: number
  upstreamNamesChecked: number
  upstreamNamesUnavailable: number
}

// Resolve the pinned upstream package's export from the repo's own install
// tree. A registry-semver .pnpm dir is the pin of record; a missing or
// unloadable copy returns undefined and the caller reports the skip.
function resolveUpstreamExport(
  repoRoot: string,
  pkgName: string,
): unknown | undefined {
  const pnpmRoot = path.join(repoRoot, 'node_modules', '.pnpm')
  if (!existsSync(pnpmRoot)) {
    return undefined
  }
  const prefix = `${pkgName}@`
  const dirs = readdirSync(pnpmRoot)
  let upstreamDir: string | undefined
  for (let i = 0, { length } = dirs; i < length; i += 1) {
    const dir = dirs[i]
    if (
      dir !== undefined &&
      dir.startsWith(prefix) &&
      /^\d/.test(dir.slice(prefix.length))
    ) {
      upstreamDir = dir
      break
    }
  }
  if (upstreamDir === undefined) {
    return undefined
  }
  try {
    return requireCjs(
      path.join(pnpmRoot, upstreamDir, 'node_modules', pkgName),
    ) as unknown
  } catch {
    return undefined
  }
}

export function collectLaneDivergences(repoRoot: string): LaneComparisonReport {
  const battery = buildProbeBattery()
  const npmRoot = path.join(repoRoot, 'packages', 'npm')
  const divergences: LaneDivergence[] = []
  let packagesCompared = 0
  let upstreamNamesChecked = 0
  let upstreamNamesUnavailable = 0
  const pkgNames = readdirSync(npmRoot).toSorted()
  for (let n = 0, { length } = pkgNames; n < length; n += 1) {
    const pkgName = pkgNames[n]
    if (pkgName === undefined) {
      continue
    }
    const jsPath = path.join(npmRoot, pkgName, 'index.js')
    const cjsPath = path.join(npmRoot, pkgName, 'index.cjs')
    if (!existsSync(jsPath) || !existsSync(cjsPath)) {
      continue
    }
    packagesCompared += 1
    const jsLane: unknown = requireCjs(jsPath)
    const cjsLane: unknown = requireCjs(cjsPath)
    if (typeof jsLane !== 'function' || typeof cjsLane !== 'function') {
      if (typeof jsLane !== typeof cjsLane) {
        divergences.push({
          cjsVerdict: typeof cjsLane,
          jsVerdict: typeof jsLane,
          pkgName,
          probeLabel: 'module export typeof',
        })
      }
      continue
    }
    // The exported name is part of the contract: upstream names the function
    // after the module, and both lanes must carry that name.
    const upstream = resolveUpstreamExport(repoRoot, pkgName)
    if (typeof upstream === 'function' && upstream.name !== '') {
      upstreamNamesChecked += 1
      if (jsLane.name !== upstream.name || cjsLane.name !== upstream.name) {
        divergences.push({
          cjsVerdict: JSON.stringify(cjsLane.name),
          jsVerdict: JSON.stringify(jsLane.name),
          pkgName,
          probeLabel: `exported function name (upstream ${JSON.stringify(upstream.name)})`,
        })
      }
    } else {
      upstreamNamesUnavailable += 1
      if (jsLane.name !== cjsLane.name) {
        divergences.push({
          cjsVerdict: JSON.stringify(cjsLane.name),
          jsVerdict: JSON.stringify(jsLane.name),
          pkgName,
          probeLabel: 'exported function name',
        })
      }
    }
    for (const [probeLabel, input] of battery) {
      const jsVerdict = probeVerdict(
        jsLane as (value: unknown) => unknown,
        input,
      )
      const cjsVerdict = probeVerdict(
        cjsLane as (value: unknown) => unknown,
        input,
      )
      if (jsVerdict !== cjsVerdict) {
        divergences.push({ cjsVerdict, jsVerdict, pkgName, probeLabel })
      }
    }
  }
  return {
    divergences,
    packagesCompared,
    upstreamNamesChecked,
    upstreamNamesUnavailable,
  }
}

/**
 * Compare every dual-lane override's lanes across the probe battery. Returns
 * the exit code: 0 when every pair agrees, 1 on any divergence.
 */
export function runOverrideLanesCheck(
  repoRoot: string,
  options?: OverrideLanesCheckOptions | undefined,
): number {
  const opts = { __proto__: null, ...options } as OverrideLanesCheckOptions
  const quiet = opts.quiet === true
  const report = collectLaneDivergences(repoRoot)
  if (report.divergences.length === 0) {
    if (!quiet) {
      logger.success(
        `override-lanes-agree: ${report.packagesCompared} dual-lane overrides agree on behavior and name (${report.upstreamNamesChecked} names checked against the pinned upstream, ${report.upstreamNamesUnavailable} lane-vs-lane only - no loadable upstream copy on disk).`,
      )
    }
    return 0
  }
  logger.fail(
    [
      'override-lanes-agree: an override ships different behavior or name per entry lane.',
      '',
      ...report.divergences.map(
        d =>
          `  packages/npm/${d.pkgName}: probe "${d.probeLabel}" - index.js says ${d.jsVerdict}, index.cjs says ${d.cjsVerdict}.`,
      ),
      '',
      '  Wanted: both lanes implement the upstream contract, including the',
      '  exported function name; when a Node built-in covers only part of it,',
      '  fork inside the cjs lane instead of aliasing the built-in.',
      '  Fix: adjust the divergent lane until the upstream suite passes on',
      '  both, then re-run: node scripts/repo/check/override-lanes-agree.mts',
    ].join('\n'),
  )
  return 1
}

/* c8 ignore start - entrypoint guard; the pure legs are covered directly. */
if (isMainModule(import.meta.url)) {
  const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..')
  process.exitCode = runOverrideLanesCheck(repoRoot, {
    quiet: process.argv.includes('--quiet'),
  })
}
/* c8 ignore stop */
