'use strict'

/**
 * Socket.dev json-stable-stringify implementation.
 *
 * Serializes by emitting JSON text directly in one pass for every option
 * shape (cmp, replacer, space, cycles, collapseEmpty). Direct emission keeps
 * spec-faithful semantics that a rebuild-and-restringify strategy cannot:
 * toJSON() is honored, an own `__proto__` key survives, and sorted key order
 * holds for integer-like keys that plain objects would re-order on
 * enumeration. Inputs nested beyond the call stack fall back to an explicit
 * stack serializer.
 */

const { isArray: ArrayIsArray } = Array
const { keys: ObjectKeys } = Object
const { stringify: JSONStringify } = JSON

const JSONIsRawJSON =
  typeof JSON.isRawJSON === 'function' ? JSON.isRawJSON : undefined

// Feature-detected so shipped code never hard-references an ES2023+ array
// method on runtimes that lack it.
const SORT_METHOD =
  typeof Array.prototype.toSorted === 'function' ? 'toSorted' : 'sort'

// JSON.rawJSON values carry pre-serialized text that JSON.stringify emits
// verbatim; traversal must pass them through untouched rather than recurse into
// them as plain objects, which would drop the raw text.
function isRawJSON(value) {
  return JSONIsRawJSON !== undefined && JSONIsRawJSON(value)
}

function resolveToJSON(value) {
  if (
    value &&
    typeof value === 'object' &&
    typeof value.toJSON === 'function'
  ) {
    return value.toJSON()
  }
  return value
}

/**
 * Explicit-stack serializer for the featureless shape (no options), used when
 * the recursive serializer overflows the call stack. Emits compact text with
 * default-sorted keys, honoring toJSON and path-scoped cycle detection.
 */
function stringifyIterativeStable(root) {
  root = resolveToJSON(root)
  const rootType = typeof root
  if (root === undefined || rootType === 'function' || rootType === 'symbol') {
    return undefined
  }
  const out = []
  const inPath = new Set()
  const stack = [{ __proto__: null, value: root }]

  while (stack.length > 0) {
    const frame = stack.pop()
    if (frame.token !== undefined) {
      out.push(frame.token)
      if (frame.exit !== undefined) {
        inPath.delete(frame.exit)
      }
      continue
    }

    // Child values are toJSON-resolved before being pushed, so dispatch reads
    // them as-is.
    const { value } = frame
    if (value === null) {
      out.push('null')
      continue
    }
    const valType = typeof value
    if (
      valType === 'function' ||
      valType === 'symbol' ||
      valType === 'undefined'
    ) {
      // Only array elements reach here because object keys are prefiltered,
      // and unrepresentable array elements serialize as null.
      out.push('null')
      continue
    }
    if (valType !== 'object' || isRawJSON(value)) {
      out.push(JSONStringify(value))
      continue
    }
    if (inPath.has(value)) {
      throw new TypeError('Converting circular structure to JSON')
    }

    if (ArrayIsArray(value)) {
      const { length } = value
      if (length === 0) {
        out.push('[]')
        continue
      }
      inPath.add(value)
      stack.push({ __proto__: null, token: ']', exit: value })
      for (let i = length - 1; i >= 0; i -= 1) {
        stack.push({ __proto__: null, value: resolveToJSON(value[i]) })
        if (i > 0) {
          stack.push({ __proto__: null, token: ',' })
        }
      }
      stack.push({ __proto__: null, token: '[' })
      continue
    }

    const keys = ObjectKeys(value)[SORT_METHOD]()
    const emit = []
    for (let i = 0, { length } = keys; i < length; i += 1) {
      const k = keys[i]
      const v = resolveToJSON(value[k])
      const vt = typeof v
      // JSON.stringify omits undefined / function / symbol object values.
      if (v === undefined || vt === 'function' || vt === 'symbol') {
        continue
      }
      emit.push({ __proto__: null, key: k, value: v })
    }
    if (emit.length === 0) {
      out.push('{}')
      continue
    }
    inPath.add(value)
    stack.push({ __proto__: null, token: '}', exit: value })
    for (let i = emit.length - 1; i >= 0; i -= 1) {
      stack.push({ __proto__: null, value: emit[i].value })
      stack.push({ __proto__: null, token: `${JSONStringify(emit[i].key)}:` })
      if (i > 0) {
        stack.push({ __proto__: null, token: ',' })
      }
    }
    stack.push({ __proto__: null, token: '{' })
  }

  return out.join('')
}

/**
 * Direct-text serializer used by every option shape. `space` is '' for
 * compact output.
 */
function stringifyStable(value, space, opts) {
  opts = { __proto__: null, ...opts }
  const seen = new Set()
  const hasSpace = space !== ''
  const colon = hasSpace ? ': ' : ':'

  function stringify(holder, key, val, indent, childIndent) {
    val = resolveToJSON(val)

    if (opts.replacer) {
      val = opts.replacer.call(holder, key, val)
    }

    if (val === null) {
      return 'null'
    }
    // JSON.stringify has no representation for undefined, functions, or
    // symbols. Returning undefined lets the caller omit the object key or
    // substitute null for the array element, matching native behavior.
    if (val === undefined) {
      return undefined
    }

    const valType = typeof val

    if (valType === 'boolean') {
      return val ? 'true' : 'false'
    }
    if (valType === 'bigint' || valType === 'number' || valType === 'string') {
      return JSONStringify(val)
    }
    if (valType === 'function' || valType === 'symbol') {
      return undefined
    }

    if (valType !== 'object') {
      return JSONStringify(val)
    }

    if (isRawJSON(val)) {
      return JSONStringify(val)
    }

    // Cycle check
    if (seen.has(val)) {
      if (opts.cycles) {
        return '"__cycle__"'
      }
      throw new TypeError('Converting circular structure to JSON')
    }

    if (ArrayIsArray(val)) {
      const { length } = val
      if (length === 0) {
        return hasSpace && !opts.collapseEmpty ? `[\n${indent}]` : '[]'
      }

      seen.add(val)
      const joiner = hasSpace ? `,\n${childIndent}` : ','
      const nextIndent = childIndent + space
      let result = hasSpace ? `[\n${childIndent}` : '['

      for (let i = 0, j = 0; i < length; i += 1) {
        const v = stringify(val, String(i), val[i], childIndent, nextIndent)
        // An array element with no JSON representation serializes as null.
        result = `${result}${j ? joiner : ''}${v === undefined ? 'null' : v}`
        j = 1
      }

      seen.delete(val)
      return hasSpace ? `${result}\n${indent}]` : `${result}]`
    }

    // Object - sort keys and emit in exactly that order.
    const keys = ObjectKeys(val)
    const { length } = keys

    if (length === 0) {
      return hasSpace && !opts.collapseEmpty ? `{\n${indent}}` : '{}'
    }

    let sortedKeys
    if (opts.cmp) {
      const cmp = opts.cmp
      const get = cmp.length > 2 ? k => val[k] : undefined
      const helper = get ? { __proto__: null, get } : undefined
      sortedKeys = keys[SORT_METHOD]((a, b) =>
        cmp({ key: a, value: val[a] }, { key: b, value: val[b] }, helper),
      )
    } else {
      sortedKeys = keys[SORT_METHOD]()
    }

    seen.add(val)
    const joiner = hasSpace ? `,\n${childIndent}` : ','
    const nextIndent = childIndent + space
    let body = ''

    for (let i = 0, j = 0; i < length; i += 1) {
      const k = sortedKeys[i]
      const v = stringify(val, k, val[k], childIndent, nextIndent)

      // Omit keys whose value has no JSON representation.
      if (v === undefined) {
        continue
      }

      body = `${body}${j ? joiner : ''}${JSONStringify(k)}${colon}${v}`
      j = 1
    }

    seen.delete(val)

    // Every key was omitted, so the object renders the same as one with no
    // own keys at all.
    if (body === '') {
      return hasSpace && !opts.collapseEmpty ? `{\n${indent}}` : '{}'
    }

    return hasSpace ? `{\n${childIndent}${body}\n${indent}}` : `{${body}}`
  }

  return stringify({ '': value }, '', value, '', space)
}

/**
 * Main stableStringify function with full feature support.
 */
module.exports = function stableStringify(value, opts) {
  // Normalize options
  let options

  if (typeof opts === 'function') {
    // Legacy API: comparator function as second argument
    options = { __proto__: null, cmp: opts }
  } else if (opts) {
    options = { __proto__: null, ...opts }
  } else {
    options = { __proto__: null }
  }

  // Validate options
  if (
    options.collapseEmpty !== undefined &&
    typeof options.collapseEmpty !== 'boolean'
  ) {
    throw new TypeError('`collapseEmpty` must be a boolean, if provided')
  }

  const noFeatures =
    !opts || (typeof opts !== 'function' && ObjectKeys(opts).length === 0)

  const space =
    typeof options.space === 'number'
      ? ' '.repeat(options.space)
      : typeof options.space === 'string'
        ? options.space
        : ''

  try {
    return stringifyStable(value, space, options)
  } catch (err) {
    // The featureless shape keeps working on inputs nested beyond the call
    // stack; option-bearing calls propagate the overflow as before.
    if (
      noFeatures &&
      err instanceof RangeError &&
      err.message.includes('Maximum call stack')
    ) {
      return stringifyIterativeStable(value)
    }
    throw err
  }
}
