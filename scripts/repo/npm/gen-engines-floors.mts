#!/usr/bin/env node
/*
 * @file Computes every override's true Node engines floor from the features
 *   its shipped code uses, priced against @mdn/browser-compat-data's
 *   per-feature nodejs support (catalog-pinned devDependency, same pattern
 *   as npm-high-impact). Detection is data-driven: static member usage and
 *   bare globals are looked up directly in BCD; syntax constructs map to
 *   their BCD operator/statement entries; a small hand table covers node:
 *   module APIs BCD does not model. A feature whose file also carries a
 *   `typeof` probe for it counts as feature-detected and does not raise the
 *   floor. The floor is the max version across unguarded features, with
 *   MIN_BASELINE when nothing is detected. Run: node
 *   scripts/repo/npm/gen-engines-floors.mts [--write] [--only <name>]
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import bcd from '@mdn/browser-compat-data' with { type: 'json' }
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { resolveOriginalPackageName } from '@socketsecurity/lib-stable/packages/normalize'
// oxlint-disable-next-line socket/prefer-lib-versions-over-semver -- semver is the catalogued devDependency scripts use for range math.
import semver from 'semver'

import { isMainModule } from '../../fleet/_shared/is-main-module.mts'
import { NPM_PACKAGES_PATH } from '../constants/paths.mts'

const logger = getDefaultLogger()

export const MIN_BASELINE = '0.10.0'

export interface DetectedFeature {
  feature: string
  guarded: boolean
  version: string
}

export interface OverrideFloor {
  features: DetectedFeature[]
  floor: string
  pkgName: string
}

interface CompatShape {
  __compat?: { support?: { nodejs?: unknown } }
}

function nodeVersionOf(entry: unknown): string | undefined {
  const support = (entry as CompatShape | undefined)?.__compat?.support?.nodejs
  const first = Array.isArray(support) ? support[0] : support
  const added = (first as { version_added?: unknown } | undefined)
    ?.version_added
  return typeof added === 'string' ? semver.coerce(added)?.version : undefined
}

function builtinsEntry(dotted: string): unknown {
  let node: unknown = bcd.javascript['builtins']
  const parts = dotted.split('.')
  for (let i = 0, { length } = parts; i < length; i += 1) {
    if (!node || typeof node !== 'object') {
      return undefined
    }
    node = (node as Record<string, unknown>)[parts[i]!]
  }
  return node
}

// Syntax constructs mapped to their BCD entries; each version is read from
// the data, never hardcoded.
const SYNTAX_FEATURES: ReadonlyArray<{
  bcdPath: readonly string[]
  feature: string
  pattern: RegExp
}> = [
  {
    bcdPath: ['operators', 'optional_chaining'],
    feature: 'optional chaining ?.',
    pattern: /\?\./,
  },
  {
    bcdPath: ['operators', 'nullish_coalescing'],
    feature: 'nullish coalescing ??',
    pattern: /\?\?/,
  },
  {
    bcdPath: ['statements', 'try_catch'],
    feature: 'optional catch binding',
    pattern: /catch\s*\{/,
  },
  {
    bcdPath: ['statements', 'async_function'],
    feature: 'async functions',
    pattern: /\basync\b/,
  },
  {
    bcdPath: ['functions', 'arrow_functions'],
    feature: 'arrow functions',
    pattern: /=>/,
  },
  {
    bcdPath: ['statements', 'generator_function'],
    feature: 'generator functions',
    pattern: /function\s*\*/,
  },
  {
    bcdPath: ['statements', 'class'],
    feature: 'class declarations',
    pattern: /\bclass\s+[A-Za-z]/,
  },
  {
    bcdPath: ['grammar', 'template_literals'],
    feature: 'template literals',
    pattern: /`/,
  },
  {
    bcdPath: ['operators', 'spread'],
    feature: 'spread syntax',
    pattern: /\.\.\./,
  },
]

function syntaxVersion(bcdPath: readonly string[]): string | undefined {
  let node: unknown = bcd.javascript
  for (let i = 0, { length } = bcdPath; i < length; i += 1) {
    if (!node || typeof node !== 'object') {
      return undefined
    }
    node = (node as Record<string, unknown>)[bcdPath[i]!]
  }
  return nodeVersionOf(node)
}

// node: module APIs BCD does not model; versions from the Node docs.
const NODE_API_FEATURES: ReadonlyArray<{
  feature: string
  pattern: RegExp
  version: string
}> = [
  { feature: 'module.isBuiltin', pattern: /\bisBuiltin\b/, version: '18.6.0' },
  {
    feature: 'util.types brand checks',
    pattern: /require\(['"]node:util\/types['"]\)/,
    version: '10.0.0',
  },
  {
    feature: 'string-literal ESM export names',
    pattern: /export\s*\{[^}]*['"][^'"]+['"][^}]*\}/,
    version: '16.0.0',
  },
]

const GLOBAL_TOKEN_RE = /\b([A-Z][A-Za-z0-9]*)\b/g
// Capitalized owner (group 1), a dot, then a lowercase member (group 2):
// matches `Object.hasOwn` / `Array.from` style static-member usage.
const STATIC_MEMBER_RE = /\b([A-Z][A-Za-z0-9]*)\.([a-z][A-Za-z0-9]*)\b/g
const PROTO_MEMBER_RE = /\.([a-z][A-Za-z0-9]{1,30})\(/g

const LOWERCASE_GLOBALS = ['globalThis', 'structuredClone', 'queueMicrotask']

// This whole tool is a source auditor: scanning shipped override text for
// feature usage IS the domain, so the source-sniffing rule stands down here.
function isGuarded(source: string, token: string): boolean {
  return (
    // oxlint-disable-next-line socket/no-source-sniffing -- source auditor
    source.includes(`typeof ${token}`) ||
    // oxlint-disable-next-line socket/no-source-sniffing -- source auditor
    new RegExp(`typeof [A-Za-z_$.]*\\.${token}\\b`).test(source) ||
    // oxlint-disable-next-line socket/no-source-sniffing -- source auditor
    source.includes(`'${token}' in `) ||
    // oxlint-disable-next-line socket/no-source-sniffing -- source auditor
    source.includes(`"${token}" in `)
  )
}

// Comments routinely name features in prose ("async", "Float16Array"), which
// must not raise the floor; only code counts.
export function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1')
}

export function detectFileFeatures(rawSource: string): DetectedFeature[] {
  const source = stripComments(rawSource)
  const out = new Map<string, DetectedFeature>()
  function add(detected: DetectedFeature): void {
    const existing = out.get(detected.feature)
    if (!existing || (existing.guarded && !detected.guarded)) {
      out.set(detected.feature, detected)
    }
  }

  for (let i = 0, { length } = SYNTAX_FEATURES; i < length; i += 1) {
    const { bcdPath, feature, pattern } = SYNTAX_FEATURES[i]!
    if (pattern.test(source)) {
      const version = syntaxVersion(bcdPath)
      if (version) {
        add({ feature, guarded: false, version })
      }
    }
  }

  for (let i = 0, { length } = NODE_API_FEATURES; i < length; i += 1) {
    const { feature, pattern, version } = NODE_API_FEATURES[i]!
    if (pattern.test(source)) {
      add({ feature, guarded: false, version })
    }
  }

  for (const match of source.matchAll(GLOBAL_TOKEN_RE)) {
    const token = match[1]!
    const version = nodeVersionOf(builtinsEntry(token))
    if (version) {
      add({ feature: token, guarded: isGuarded(source, token), version })
    }
  }
  for (let i = 0, { length } = LOWERCASE_GLOBALS; i < length; i += 1) {
    const token = LOWERCASE_GLOBALS[i]!
    // oxlint-disable-next-line socket/no-source-sniffing -- source auditor
    if (!new RegExp(`\\b${token}\\b`).test(source)) {
      continue
    }
    const version =
      nodeVersionOf(
        (bcd as unknown as { api?: Record<string, unknown> }).api?.[token],
      ) ?? nodeVersionOf(builtinsEntry(token))
    if (version) {
      add({ feature: token, guarded: isGuarded(source, token), version })
    }
  }

  for (const match of source.matchAll(STATIC_MEMBER_RE)) {
    const owner = match[1]!
    const member = match[2]!
    const version = nodeVersionOf(builtinsEntry(`${owner}.${member}`))
    if (version) {
      add({
        feature: `${owner}.${member}`,
        guarded:
          isGuarded(source, `${owner}.${member}`) || isGuarded(source, member),
        version,
      })
    }
  }

  // Instance members: the receiver is unknown statically. A name any
  // ES5-era builtin already owns (filter, map, slice) carries no floor
  // signal, so only names whose OLDEST owner is post-ES5 count, and the
  // contribution is the max across owners so the floor never understates. A
  // member referenced as a quoted string is feature-detected access.
  const protoOwners = bcd.javascript['builtins'] as Record<string, unknown>
  const ownerNames = Object.keys(protoOwners)
  for (const match of source.matchAll(PROTO_MEMBER_RE)) {
    const member = match[1]!
    let maxVersion: string | undefined
    let minVersion: string | undefined
    for (let i = 0, { length } = ownerNames; i < length; i += 1) {
      const entry = (protoOwners[ownerNames[i]!] as Record<string, unknown>)?.[
        member
      ]
      const version = nodeVersionOf(entry)
      if (!version) {
        continue
      }
      if (!maxVersion || semver.gt(version, maxVersion)) {
        maxVersion = version
      }
      if (!minVersion || semver.lt(version, minVersion)) {
        minVersion = version
      }
    }
    if (maxVersion && minVersion && semver.gte(minVersion, '4.0.0')) {
      add({
        feature: `.${member}()`,
        guarded:
          isGuarded(source, member) ||
          // oxlint-disable-next-line socket/no-source-sniffing -- source auditor
          source.includes(`'${member}'`) ||
          // oxlint-disable-next-line socket/no-source-sniffing -- source auditor
          source.includes(`"${member}"`),
        version: maxVersion,
      })
    }
  }

  return [...out.values()]
}

export function computeOverrideFloor(pkgDir: string): OverrideFloor {
  const pkgName = resolveOriginalPackageName(path.basename(pkgDir))
  const features = new Map<string, DetectedFeature>()
  function walk(rel: string): void {
    const entries = readdirSync(path.join(pkgDir, rel), {
      withFileTypes: true,
    })
    for (let i = 0, { length } = entries; i < length; i += 1) {
      const entry = entries[i]!
      const relPath = rel ? `${rel}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
          walk(relPath)
        }
        continue
      }
      if (!/\.(?:cjs|js|mjs)$/.test(entry.name)) {
        continue
      }
      const detected = detectFileFeatures(
        readFileSync(path.join(pkgDir, relPath), 'utf8'),
      )
      for (let k = 0, { length: count } = detected; k < count; k += 1) {
        const feature = detected[k]!
        const existing = features.get(feature.feature)
        if (!existing || (existing.guarded && !feature.guarded)) {
          features.set(feature.feature, feature)
        }
      }
    }
  }
  walk('')
  let floor = MIN_BASELINE
  for (const feature of features.values()) {
    if (!feature.guarded && semver.gt(feature.version, floor)) {
      floor = feature.version
    }
  }
  return { features: [...features.values()], floor, pkgName }
}

export function auditAllOverrides(only?: string | undefined): OverrideFloor[] {
  const dirs = readdirSync(NPM_PACKAGES_PATH)
    .toSorted()
    .filter(d => !only || resolveOriginalPackageName(d) === only)
  const out: OverrideFloor[] = []
  for (let i = 0, { length } = dirs; i < length; i += 1) {
    out.push(computeOverrideFloor(path.join(NPM_PACKAGES_PATH, dirs[i]!)))
  }
  return out
}

function main(): void {
  const onlyIndex = process.argv.indexOf('--only')
  const only = onlyIndex === -1 ? undefined : process.argv[onlyIndex + 1]
  const write = process.argv.includes('--write')
  const results = auditAllOverrides(only)
  const byFloor = new Map<string, string[]>()
  for (let i = 0, { length } = results; i < length; i += 1) {
    const { floor, pkgName } = results[i]!
    const bucket = byFloor.get(floor) ?? []
    bucket.push(pkgName)
    byFloor.set(floor, bucket)
  }
  const floors = [...byFloor.keys()].toSorted(semver.compare)
  for (let i = 0, { length } = floors; i < length; i += 1) {
    const floor = floors[i]!
    const names = byFloor.get(floor)!
    logger.info(`>=${floor}: ${names.length} package(s)`)
    logger.info(`  ${names.join(' ')}`)
  }
  if (!write) {
    return
  }
  let updated = 0
  const dirs = readdirSync(NPM_PACKAGES_PATH).toSorted()
  for (let i = 0, { length } = dirs; i < length; i += 1) {
    const dir = dirs[i]!
    const upstream = resolveOriginalPackageName(dir)
    const result = results.find(r => r.pkgName === upstream)
    if (!result) {
      continue
    }
    const manifestPath = path.join(NPM_PACKAGES_PATH, dir, 'package.json')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      engines?: Record<string, string> | undefined
    }
    const next = `>=${result.floor}`
    if (manifest.engines?.['node'] !== next) {
      manifest.engines = { ...manifest.engines, node: next }
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
      updated += 1
    }
  }
  logger.success(`gen-engines-floors: updated ${updated} engines range(s).`)
}

/* c8 ignore start - entrypoint guard; the pure legs are covered directly. */
if (isMainModule(import.meta.url)) {
  main()
}
/* c8 ignore stop */
