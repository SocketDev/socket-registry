/**
 * @file The `--dump-payload` diagnostic's pure half — turn npm's access-page
 *   payload into a KEY TREE and nothing else, so a payload whose shape changed
 *   can be re-derived without ever printing what it contains. Redaction is the
 *   point, not a courtesy. The access payload carries the page's CSRF token,
 *   the signed-in account's email, maintainer names, and the repository
 *   identifiers of every trusted publisher. A plain dump of it into a terminal,
 *   a transcript, or an agent's context is a secret leak, so string values
 *   NEVER print — only the key that held one, and its length. Booleans and
 *   numbers do print: `stagedPublishingEnabled: true` and `oidcConnections:
 *   array(len=1)` are exactly the facts a re-derivation turns on, and neither
 *   is a credential. Pure — no playwright, no network — so the renderer is
 *   unit-testable from invented fixtures, and the browser lane in
 *   `./configure-staged-publishing.mts` only has to fetch the payload and print
 *   what comes back.
 */

/**
 * Limits for one key-tree render. All three exist to keep a pathological
 * payload from printing a wall: npm nests the access context several levels
 * deep and can return long arrays of rows that all share one shape.
 */
export interface KeyTreeOptions {
  /**
   * How many entries of an array to descend into. The array's real length
   * always prints, so a truncated render still reports the full count.
   */
  maxArrayItems?: number | undefined
  maxDepth?: number | undefined
  /**
   * How many keys of one object to descend into, in the payload's own key
   * order. The real key count always prints.
   */
  maxKeys?: number | undefined
}

const DEFAULT_MAX_ARRAY_ITEMS = 3
const DEFAULT_MAX_DEPTH = 10
const DEFAULT_MAX_KEYS = 60

const INDENT = '  '

/**
 * A value's type as the tree prints it. Strings report their LENGTH and never
 * their contents, which is what separates "the key is present but empty" from
 * "the key holds something" without disclosing the something.
 */
export function describeValueType(value: unknown): string {
  if (value === null) {
    return 'null'
  }
  if (Array.isArray(value)) {
    return `array(len=${value.length})`
  }
  const type = typeof value
  if (type === 'string') {
    return `string(len=${(value as string).length})`
  }
  if (type === 'boolean' || type === 'number') {
    // Safe to print in full: a boolean flag and a count are the facts a shape
    // re-derivation reads, and neither can carry a token or an address.
    return `${type}(${String(value)})`
  }
  if (type === 'object') {
    return `object(${Object.keys(value as object).length} keys)`
  }
  return type
}

function isPlainish(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Render `payload` as an indented key tree: every key name, every array length,
 * every value's type — and no string value anywhere.
 *
 * Returns the lines rather than printing them, so a caller can log them, assert
 * on them in a test, or hand them to a report without a capture harness.
 */
export function describePayloadKeyTree(
  payload: unknown,
  options?: KeyTreeOptions | undefined,
): string[] {
  const opts = { __proto__: null, ...options } as KeyTreeOptions
  const maxArrayItems = opts.maxArrayItems ?? DEFAULT_MAX_ARRAY_ITEMS
  const maxDepth = opts.maxDepth ?? DEFAULT_MAX_DEPTH
  const maxKeys = opts.maxKeys ?? DEFAULT_MAX_KEYS
  const lines: string[] = []
  // Cycle-safe: the payload arrives from JSON.parse so it is a tree today, but
  // a caller handing in a live object graph must not spin this forever.
  const seen = new Set<object>()
  const walk = (node: unknown, depth: number, prefix: string): void => {
    if (depth >= maxDepth) {
      lines.push(`${prefix}…(depth limit)`)
      return
    }
    if (typeof node === 'object' && node !== null) {
      if (seen.has(node)) {
        lines.push(`${prefix}…(cycle)`)
        return
      }
      seen.add(node)
    }
    if (Array.isArray(node)) {
      const shown = Math.min(node.length, maxArrayItems)
      for (let i = 0; i < shown; i += 1) {
        const item = node[i]
        lines.push(`${prefix}[${i}]: ${describeValueType(item)}`)
        if (item && typeof item === 'object') {
          walk(item, depth + 1, `${prefix}${INDENT}`)
        }
      }
      if (node.length > shown) {
        lines.push(`${prefix}…(${node.length - shown} more item(s))`)
      }
      return
    }
    if (!isPlainish(node)) {
      return
    }
    const keys = Object.keys(node)
    const shown = Math.min(keys.length, maxKeys)
    for (let i = 0; i < shown; i += 1) {
      const key = keys[i]!
      const value = node[key]
      lines.push(`${prefix}${key}: ${describeValueType(value)}`)
      if (value && typeof value === 'object') {
        walk(value, depth + 1, `${prefix}${INDENT}`)
      }
    }
    if (keys.length > shown) {
      lines.push(`${prefix}…(${keys.length - shown} more key(s))`)
    }
  }
  lines.push(`<root>: ${describeValueType(payload)}`)
  walk(payload, 0, INDENT)
  return lines
}

/**
 * Every dotted path in `payload` whose LAST segment matches `pattern`, array
 * indices included (`a.oidcConnections[0].config`). Paths only — no values —
 * so this is safe on the same payload the key tree redacts.
 *
 * This is the re-derivation's actual question: when npm moves the
 * trusted-publisher block, the block's key names usually survive the move, so
 * searching for the NAME finds the new home. Sorted, so two runs of the same
 * payload compare cleanly.
 */
export function findPayloadKeyPaths(
  payload: unknown,
  pattern: RegExp,
  options?: KeyTreeOptions | undefined,
): string[] {
  const opts = { __proto__: null, ...options } as KeyTreeOptions
  const maxDepth = opts.maxDepth ?? DEFAULT_MAX_DEPTH
  const found = new Set<string>()
  const seen = new Set<object>()
  const walk = (node: unknown, depth: number, path: string): void => {
    if (depth >= maxDepth || !node || typeof node !== 'object') {
      return
    }
    if (seen.has(node)) {
      return
    }
    seen.add(node)
    if (Array.isArray(node)) {
      for (let i = 0, { length } = node; i < length; i += 1) {
        walk(node[i], depth + 1, `${path}[${i}]`)
      }
      return
    }
    const record = node as Record<string, unknown>
    const keys = Object.keys(record)
    for (let i = 0, { length } = keys; i < length; i += 1) {
      const key = keys[i]!
      const childPath = path ? `${path}.${key}` : key
      // A fresh lastIndex every test: a caller's /g or /y regex would otherwise
      // skip matches depending on what it matched last.
      pattern.lastIndex = 0
      if (pattern.test(key)) {
        found.add(`${childPath}: ${describeValueType(record[key])}`)
      }
      walk(record[key], depth + 1, childPath)
    }
  }
  walk(payload, 0, '')
  return [...found].toSorted()
}
