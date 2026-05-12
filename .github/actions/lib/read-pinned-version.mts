/* oxlint-disable socket/prefer-cached-for-loop -- iterates non-array iterables (Object.entries); the cached-length rewrite would be incorrect. */
/**
 * @fileoverview Print the pinned version of a Socket package to
 * stdout, reading from (in order):
 *   1. pnpm-workspace.yaml `catalog:` entries
 *   2. Root package.json `dependencies` / `devDependencies`
 *      (skipping "catalog:" / "workspace:" / "*" / "" placeholders)
 *
 * Prints the empty string if not pinned (caller decides what to do).
 *
 * Usage:
 *   node read-pinned-version.mts <package-name>
 *
 * Used by the setup composite action's bootstrap step. Kept as a
 * standalone .mts file (rather than an inline `node -e "..."` blob
 * in action.yml) so the YAML stays readable and the parsing logic
 * is testable.
 */

import { existsSync, readFileSync } from 'node:fs'

import { argv, exit, stdout } from 'node:process'

const pkgName = argv[2]
if (!pkgName) {
  process.stderr.write('Usage: node read-pinned-version.mts <package-name>\n') // socket-hook: allow logger -- composite action helper, raw stderr for usage
  exit(2)
}

const stripRange = (v: string): string => v.replace(/^[\^~>=<]+/, '').trim()

const fromCatalog = (pkg: string): string | undefined => {
  if (!existsSync('pnpm-workspace.yaml')) {
    return undefined
  }
  const content = readFileSync('pnpm-workspace.yaml', 'utf8')
  const lines = content.split('\n')
  let inCatalog = false
  for (let i = 0, { length } = lines; i < length; i += 1) {
    const rawLine = lines[i]
    const line = rawLine.replace(/\r$/, '')
    if (/^catalog:\s*$/.test(line)) {
      inCatalog = true
      continue
    }
    if (!inCatalog) {
      continue
    }
    // Leave the catalog block on the next top-level key (no leading
    // whitespace, ends with ':').
    if (/^\S.*:\s*$/.test(line)) {
      inCatalog = false
      continue
    }
    const m = line.match(
      /^\s+['"]?([@A-Za-z0-9_/-]+)['"]?\s*:\s*['"]?([^'"\s]+)['"]?\s*$/,
    )
    if (m && m[1] === pkg) {
      return stripRange(m[2]!)
    }
  
  }
  return undefined
}

const fromPackageJson = (pkg: string): string | undefined => {
  if (!existsSync('package.json')) {
    return undefined
  }
  const json = JSON.parse(readFileSync('package.json', 'utf8'))
  for (const field of ['dependencies', 'devDependencies'] as const) {
    const deps = json[field]
    if (deps && typeof deps[pkg] === 'string') {
      const v: string = deps[pkg]
      if (
        v !== '' &&
        v !== '*' &&
        !v.startsWith('catalog:') &&
        !v.startsWith('workspace:')
      ) {
        return stripRange(v)
      }
    }
  }
  return undefined
}

const version = fromCatalog(pkgName) ?? fromPackageJson(pkgName)
if (version) {
  stdout.write(version)
}
