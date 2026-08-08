/**
 * @file Deep-entry smoke test for every npm override: each shipped .js file
 *   must be reachable through the package's exports map by BOTH its
 *   extension-ful specifier and its extensionless form, the way it is against
 *   upstream packages that ship no exports map at all. This is the gate that
 *   makes a closed exports map a red test instead of a silent consumer break;
 *   the version-compat research found nine upstreams where the override
 *   blocked requires that resolve upstream.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { NPM_PACKAGES_PATH } from '../../scripts/repo/constants/paths.mts'

const REQUIRE_CONDITIONS = new Set([
  'default',
  'node',
  'node-addons',
  'require',
])

function resolveConditions(node: unknown): string | undefined {
  if (typeof node === 'string') {
    return node
  }
  if (!node || typeof node !== 'object') {
    return undefined
  }
  const conditions = node as Record<string, unknown>
  const keys = Object.keys(conditions)
  for (let i = 0, { length } = keys; i < length; i += 1) {
    const key = keys[i]!
    if (!REQUIRE_CONDITIONS.has(key)) {
      continue
    }
    const resolved = resolveConditions(conditions[key])
    if (resolved !== undefined) {
      return resolved
    }
  }
  return undefined
}

// Minimal mirror of Node's exports-map subpath resolution: exact key first,
// then single-star patterns, most specific static prefix winning. Star
// matches across slashes, like Node.
function resolveSubpath(
  exportsField: Record<string, unknown>,
  subpath: string,
): string | undefined {
  const exact = exportsField[subpath]
  if (exact !== undefined) {
    return resolveConditions(exact)
  }
  let bestKey: string | undefined
  let bestPrefixLength = -1
  const keys = Object.keys(exportsField)
  for (let i = 0, { length } = keys; i < length; i += 1) {
    const key = keys[i]!
    const star = key.indexOf('*')
    if (star === -1) {
      continue
    }
    const prefix = key.slice(0, star)
    const suffix = key.slice(star + 1)
    if (
      subpath.startsWith(prefix) &&
      subpath.endsWith(suffix) &&
      subpath.length >= prefix.length + suffix.length &&
      prefix.length > bestPrefixLength
    ) {
      bestKey = key
      bestPrefixLength = prefix.length
    }
  }
  if (bestKey === undefined) {
    return undefined
  }
  const star = bestKey.indexOf('*')
  const matched = subpath.slice(
    bestKey.slice(0, star).length,
    subpath.length - bestKey.slice(star + 1).length,
  )
  const target = resolveConditions(exportsField[bestKey])
  return target?.replace('*', () => matched)
}

function shippedJsFiles(pkgDir: string, rel = ''): string[] {
  const out: string[] = []
  const entries = readdirSync(path.join(pkgDir, rel))
  for (let i = 0, { length } = entries; i < length; i += 1) {
    const entry = entries[i]!
    if (entry === 'node_modules' || entry.startsWith('.')) {
      continue
    }
    const relPath = rel ? `${rel}/${entry}` : entry
    const stat = statSync(path.join(pkgDir, relPath))
    if (stat.isDirectory()) {
      out.push(...shippedJsFiles(pkgDir, relPath))
    } else if (entry.endsWith('.js')) {
      out.push(relPath)
    }
  }
  return out
}

describe('npm > exports surface', () => {
  const pkgNames = readdirSync(NPM_PACKAGES_PATH).toSorted()

  for (let i = 0, { length } = pkgNames; i < length; i += 1) {
    const pkgName = pkgNames[i]!
    const pkgDir = path.join(NPM_PACKAGES_PATH, pkgName)
    const manifestPath = path.join(pkgDir, 'package.json')
    if (!existsSync(manifestPath)) {
      continue
    }
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      exports?: Record<string, unknown> | undefined
    }
    const exportsField = manifest.exports
    if (!exportsField || typeof exportsField !== 'object') {
      continue
    }

    it(`${pkgName}: every shipped .js resolves with and without extension`, () => {
      for (const file of shippedJsFiles(pkgDir)) {
        const withExt = resolveSubpath(exportsField, `./${file}`)
        expect(
          withExt,
          `./${file} does not resolve through the exports map`,
        ).toBeDefined()
        expect(
          existsSync(path.join(pkgDir, withExt!)),
          `./${file} resolves to missing ${withExt}`,
        ).toBe(true)

        const bare = `./${file.slice(0, -3)}`
        const bareTarget = resolveSubpath(exportsField, bare)
        expect(
          bareTarget,
          `${bare} does not resolve through the exports map`,
        ).toBeDefined()
        expect(
          existsSync(path.join(pkgDir, bareTarget!)),
          `${bare} resolves to missing ${bareTarget}`,
        ).toBe(true)
      }
    })
  }
})
