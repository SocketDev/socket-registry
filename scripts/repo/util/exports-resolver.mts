/**
 * @file Minimal mirror of Node's exports-map subpath resolution for override
 *   surface auditing: exact key first, then single-star patterns with the
 *   most specific static prefix winning, star matching across slashes. Walks
 *   only the conditions a CommonJS require activates. Shared by the
 *   exports-surface smoke test and the upstream-majors surface check so the
 *   two can never disagree about what a specifier resolves to.
 */

const REQUIRE_CONDITIONS = new Set([
  'default',
  'node',
  'node-addons',
  'require',
])

export function resolveRequireConditions(node: unknown): string | undefined {
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
    const resolved = resolveRequireConditions(conditions[key])
    if (resolved !== undefined) {
      return resolved
    }
  }
  return undefined
}

export function resolveExportsSubpath(
  exportsField: Record<string, unknown>,
  subpath: string,
): string | undefined {
  const exact = exportsField[subpath]
  if (exact !== undefined) {
    return resolveRequireConditions(exact)
  }
  let bestKey: string | undefined
  let bestPrefixLength = -1
  let bestSuffixLength = -1
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
      // Node's patternKeyCompare: longest static prefix wins, and on a prefix
      // tie the longer suffix wins.
      (prefix.length > bestPrefixLength ||
        (prefix.length === bestPrefixLength &&
          suffix.length > bestSuffixLength))
    ) {
      bestKey = key
      bestPrefixLength = prefix.length
      bestSuffixLength = suffix.length
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
  const target = resolveRequireConditions(exportsField[bestKey])
  return target?.replace('*', () => matched)
}
