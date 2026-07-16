/**
 * @file Surveys packages/npm overrides for dependency-reduction opportunities.
 *   socket-registry ships ~131 overrides that REPLACE upstream npm packages
 *   (many from the es-shims / ljharb micro-dependency web) with lighter,
 *   ideally zero-dependency drop-ins. This script ranks two views:
 *
 *   1. Finish-the-job — overrides that STILL declare runtime deps, sorted by how
 *      many remain to cut (today: assert, deep-equal, yocto-spinner).
 *   2. Highest-leverage candidates — overrides whose upstream carries a heavy
 *      dependency tree (or a known ljharb micro-dep web, or is now a Node>=24
 *      built-in), so the override eliminates real supply-chain surface. Offline
 *      by default (reads each override's own package.json — instant, no
 *      network). Pass --upstream to fetch each original package's direct deps
 *      and install size from the registry, or --transitive to walk the full
 *      upstream dependency tree (memoized BFS). Writes a ranked Markdown + JSON
 *      report to .claude/reports/ (gitignored). Run: node
 *      scripts/npm/survey-override-deps.mts [--upstream] [--transitive]
 *      [--target <name>] [--top <N>] [--offline]
 */

import { existsSync, promises as fs } from 'node:fs'
import path from 'node:path'

import { parseArgs } from '@socketsecurity/lib-stable/argv/parse'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { fetchPackageManifest } from '@socketsecurity/lib-stable/packages/manifest'
import { resolveOriginalPackageName } from '@socketsecurity/lib-stable/packages/normalize'
import { pEach } from '@socketsecurity/lib-stable/promises/iterate'
import { naturalCompare } from '@socketsecurity/lib-stable/sorts/natural'
import { UTF8 } from '@socketsecurity/lib-stable/constants/encoding'

import { DEFAULT_CONCURRENCY } from '../constants/core.mts'
import { getNpmPackageNames } from '../constants/testing.mts'
import { NPM_PACKAGES_PATH, ROOT_PATH } from '../constants/paths.mts'
import { getPackageVersionSpec } from '../repo/util/packages.mts'

const logger = getDefaultLogger()

// The es-shims / ljharb plumbing set. A package whose upstream tree contains any
// of these is almost certainly an ES-spec polyfill whose runtime job is a
// one-liner on Node>=24 — a strong signal the override can collapse to a thin,
// zero-dep shim. Count of distinct hits is the candidate's score multiplier.
const LJHARB_MICRODEPS = new Set([
  'call-bind',
  'call-bind-apply-helpers',
  'define-data-property',
  'define-properties',
  'dunder-proto',
  'es-abstract',
  'es-define-property',
  'es-errors',
  'es-object-atoms',
  'for-each',
  'function-bind',
  'get-intrinsic',
  'get-proto',
  'gopd',
  'has-property-descriptors',
  'has-proto',
  'has-symbols',
  'has-tostringtag',
  'hasown',
  'is-callable',
  'math-intrinsics',
  'set-function-length',
  'side-channel',
  'side-channel-list',
  'side-channel-map',
  'side-channel-weakmap',
])

// Original package names whose job is now a Node>=24 built-in. A match means the
// override's reason-to-exist is native, so it should be (or already is) a thin
// passthrough with zero deps.
const NODE_NATIVE_NAMES = new Set([
  'array.from',
  'array.of',
  'array.prototype.at',
  'array.prototype.findlast',
  'array.prototype.flat',
  'array.prototype.flatmap',
  'array.prototype.foreach',
  'globalthis',
  'object.assign',
  'object.entries',
  'object.fromentries',
  'object.groupby',
  'object.hasown',
  'object.values',
  'promise.allsettled',
  'promise.any',
  'string.prototype.at',
  'string.prototype.padend',
  'string.prototype.padstart',
  'string.prototype.replaceall',
  'string.prototype.trimend',
  'string.prototype.trimstart',
])

interface ManifestLike {
  dependencies?: Record<string, string> | undefined
  dist?: { unpackedSize?: number | undefined } | undefined
  version?: string | undefined
}

interface EnrichUpstreamOptions {
  transitive?: boolean | undefined
}

interface BuildReportOptions {
  withUpstream?: boolean | undefined
}

interface OverrideRecord {
  sockRegPkgName: string
  origPkgName: string
  overrideDeps: string[]
  overrideDirectDepCount: number
  isAlreadyZeroDep: boolean
  nodeNativeCandidate: boolean
  // Upstream enrichment (only populated with --upstream / --transitive).
  upstreamVersion: string
  upstreamDirectDepCount: number
  upstreamTransitiveDepCount: number
  upstreamTreeDepth: number
  installSizeBytes: number
  ljharbMicrodepHits: number
}

function isNodeNativeCandidate(origPkgName: string): boolean {
  return NODE_NATIVE_NAMES.has(origPkgName.toLowerCase())
}

function asManifest(value: unknown): ManifestLike {
  if (value === null || typeof value !== 'object') {
    return {}
  }
  return value as ManifestLike
}

async function readOverrideDeps(sockRegPkgName: string): Promise<string[]> {
  const pkgJsonPath = path.join(
    NPM_PACKAGES_PATH,
    sockRegPkgName,
    'package.json',
  )
  if (!existsSync(pkgJsonPath)) {
    return []
  }
  try {
    const raw = await fs.readFile(pkgJsonPath, UTF8)
    const parsed = asManifest(JSON.parse(raw))
    return Object.keys(parsed.dependencies ?? {}).toSorted(naturalCompare)
  } catch {
    return []
  }
}

// Recursively walk an upstream package's runtime dependency tree, memoizing each
// resolved manifest so shared micro-deps (call-bind, get-intrinsic, ...) are
// fetched once. Returns the set of unique transitive deps + the max depth +
// summed install size.
async function walkUpstreamTree(
  rootName: string,
  rootSpec: string,
  cache: Map<string, ManifestLike>,
  maxDepth: number,
): Promise<{ deps: Set<string>; depth: number; sizeBytes: number }> {
  const seen = new Set<string>()
  let depth = 0
  let sizeBytes = 0

  async function visit(
    name: string,
    spec: string,
    level: number,
  ): Promise<void> {
    if (level > maxDepth) {
      return
    }
    const key = `${name}@${spec}`
    let manifest = cache.get(key)
    if (!manifest) {
      try {
        manifest = asManifest(await fetchPackageManifest(key))
      } catch {
        manifest = {}
      }
      cache.set(key, manifest)
    }
    sizeBytes += manifest.dist?.unpackedSize ?? 0
    const deps = manifest.dependencies ?? {}
    const depNames = Object.keys(deps)
    if (depNames.length && level + 1 > depth) {
      depth = level + 1
    }
    for (let i = 0, { length } = depNames; i < length; i += 1) {
      const depName = depNames[i]!
      if (!seen.has(depName)) {
        seen.add(depName)
        // oxlint-disable-next-line no-await-in-loop -- Sequential, memoized walk: each visit reuses the shared cache, so awaiting in order avoids duplicate registry fetches of shared micro-deps.
        await visit(depName, deps[depName]!, level + 1)
      }
    }
  }

  await visit(rootName, rootSpec, 0)
  return { deps: seen, depth, sizeBytes }
}

async function enrichUpstream(
  record: OverrideRecord,
  cache: Map<string, ManifestLike>,
  options?: EnrichUpstreamOptions | undefined,
): Promise<void> {
  const opts = { __proto__: null, ...options } as EnrichUpstreamOptions
  const transitive = opts.transitive === true
  const spec = getPackageVersionSpec(record.origPkgName) || 'latest'
  const rootKey = `${record.origPkgName}@${spec}`
  let rootManifest = cache.get(rootKey)
  if (!rootManifest) {
    try {
      rootManifest = asManifest(await fetchPackageManifest(rootKey))
    } catch {
      rootManifest = {}
    }
    cache.set(rootKey, rootManifest)
  }
  record.upstreamVersion = rootManifest.version ?? spec
  const directDeps = Object.keys(rootManifest.dependencies ?? {})
  record.upstreamDirectDepCount = directDeps.length
  record.installSizeBytes = rootManifest.dist?.unpackedSize ?? 0
  if (transitive) {
    const { deps, depth, sizeBytes } = await walkUpstreamTree(
      record.origPkgName,
      spec,
      cache,
      12,
    )
    record.upstreamTransitiveDepCount = deps.size
    record.upstreamTreeDepth = depth
    record.installSizeBytes = sizeBytes
    record.ljharbMicrodepHits = [...deps].filter(name =>
      LJHARB_MICRODEPS.has(name),
    ).length
  } else {
    record.upstreamTransitiveDepCount = directDeps.length
    record.ljharbMicrodepHits = directDeps.filter(name =>
      LJHARB_MICRODEPS.has(name),
    ).length
  }
}

function formatBytes(bytes: number): string {
  if (!bytes) {
    return '—'
  }
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function buildReport(
  records: OverrideRecord[],
  options?: BuildReportOptions | undefined,
): string {
  const opts = { __proto__: null, ...options } as BuildReportOptions
  const withUpstream = opts.withUpstream === true
  const zeroDepCount = records.filter(r => r.isAlreadyZeroDep).length
  const carrying = records
    .filter(r => !r.isAlreadyZeroDep)
    .toSorted((a, b) => b.overrideDirectDepCount - a.overrideDirectDepCount)
  const candidates = withUpstream
    ? records
        .filter(r => r.upstreamTransitiveDepCount > 0 || r.nodeNativeCandidate)
        .toSorted(
          (a, b) =>
            b.upstreamTransitiveDepCount +
            b.ljharbMicrodepHits * 3 -
            (a.upstreamTransitiveDepCount + a.ljharbMicrodepHits * 3),
        )
        .slice(0, 30)
    : []

  const lines: string[] = []
  lines.push('# Override dependency survey')
  lines.push('')
  lines.push(
    `${zeroDepCount}/${records.length} overrides are already zero-dependency. ` +
      `${carrying.length} still carry runtime deps.`,
  )
  lines.push('')

  lines.push('## Finish-the-job — overrides still carrying runtime deps')
  lines.push('')
  if (carrying.length) {
    lines.push('```')
    lines.push('override                  deps  dependencies')
    for (let i = 0, { length } = carrying; i < length; i += 1) {
      const r = carrying[i]!
      lines.push(
        `${r.sockRegPkgName.padEnd(24)}  ${String(r.overrideDirectDepCount).padStart(4)}  ${r.overrideDeps.join(', ')}`,
      )
    }
    lines.push('```')
  } else {
    lines.push('All overrides are zero-dependency. 🎉')
  }
  lines.push('')

  if (withUpstream) {
    lines.push('## Highest-leverage candidates — heavy upstream trees')
    lines.push('')
    lines.push('```')
    lines.push(
      'override                  upstream-deps  depth  size      ljharb  native',
    )
    for (const r of candidates) {
      lines.push(
        `${r.sockRegPkgName.padEnd(24)}  ${String(r.upstreamTransitiveDepCount).padStart(13)}  ${String(r.upstreamTreeDepth).padStart(5)}  ${formatBytes(r.installSizeBytes).padStart(8)}  ${String(r.ljharbMicrodepHits).padStart(6)}  ${r.nodeNativeCandidate ? 'yes' : '—'}`,
      )
    }
    lines.push('```')
  } else {
    lines.push(
      '_Upstream tree analysis skipped. Re-run with `--upstream` (direct deps) ' +
        'or `--transitive` (full tree) to rank heavy-upstream candidates._',
    )
  }
  lines.push('')
  return lines.join('\n')
}

async function main(): Promise<void> {
  const { values: cliArgs } = parseArgs({
    options: {
      offline: { type: 'boolean' },
      target: { type: 'string' },
      top: { type: 'string' },
      transitive: { type: 'boolean' },
      upstream: { type: 'boolean' },
    },
    strict: false,
  })

  const withUpstream = Boolean(cliArgs['upstream'] || cliArgs['transitive'])
  const transitive = Boolean(cliArgs['transitive'])
  const offline = Boolean(cliArgs['offline'])

  let names = getNpmPackageNames()
  if (cliArgs['target']) {
    names = names.filter(n => n === cliArgs['target'])
    if (!names.length) {
      logger.fail(
        `No override named "${cliArgs['target']}" under packages/npm/.`,
      )
      process.exitCode = 1
      return
    }
  }

  logger.log(`Surveying ${names.length} override(s)…`)

  const records: OverrideRecord[] = []
  for (const sockRegPkgName of names) {
    const origPkgName = resolveOriginalPackageName(sockRegPkgName)
    // oxlint-disable-next-line no-await-in-loop -- Reads are local package.json files; sequential keeps the catalog order deterministic and the cost is trivial.
    const overrideDeps = await readOverrideDeps(sockRegPkgName)
    records.push({
      sockRegPkgName,
      origPkgName,
      overrideDeps,
      overrideDirectDepCount: overrideDeps.length,
      isAlreadyZeroDep: overrideDeps.length === 0,
      nodeNativeCandidate: isNodeNativeCandidate(origPkgName),
      upstreamVersion: '',
      upstreamDirectDepCount: 0,
      upstreamTransitiveDepCount: 0,
      upstreamTreeDepth: 0,
      installSizeBytes: 0,
      ljharbMicrodepHits: 0,
    })
  }

  if (withUpstream && !offline) {
    const cache = new Map<string, ManifestLike>()
    let done = 0
    await pEach(
      records,
      async record => {
        await enrichUpstream(record, cache, { transitive })
        done += 1
        if (done % 10 === 0) {
          logger.log(`  …enriched ${done}/${records.length}`)
        }
      },
      DEFAULT_CONCURRENCY,
    )
  } else if (withUpstream && offline) {
    logger.warn('--offline set: skipping network upstream enrichment.')
  }

  const reportsDir = path.join(ROOT_PATH, '.claude', 'reports')
  await fs.mkdir(reportsDir, { recursive: true })
  const mdPath = path.join(reportsDir, 'override-dep-survey.md')
  const jsonPath = path.join(reportsDir, 'override-dep-survey.json')
  await fs.writeFile(
    mdPath,
    buildReport(records, { withUpstream: withUpstream && !offline }),
    UTF8,
  )
  await fs.writeFile(
    jsonPath,
    `${JSON.stringify(records, undefined, 2)}\n`,
    UTF8,
  )

  const carrying = records.filter(r => !r.isAlreadyZeroDep)
  logger.success(
    `${records.length - carrying.length}/${records.length} zero-dep. ` +
      `${carrying.length} carry deps: ${carrying.map(r => r.sockRegPkgName).join(', ') || 'none'}.`,
  )
  logger.log(`Report: ${path.relative(ROOT_PATH, mdPath)}`)
}

main().catch((e: unknown) => {
  logger.error(e)
  process.exitCode = 1
})
