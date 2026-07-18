'use strict'

/**
 * Socket.dev optimized json-stable-stringify implementation.
 *
 * Performance-optimized implementation with full feature parity: - Custom
 * comparator - Custom replacer - Space/indentation - Cycle detection - Stack
 * overflow protection.
 *
 * Key optimizations: - Fast path for simple cases (no options) - 79% faster -
 * One-pass sort+stringify for space/indentation - Native JSON.stringify usage
 * where possible - JIT-friendly code structure.
 */

const { isArray: ArrayIsArray } = Array
const { keys: ObjectKeys } = Object
const { stringify: JSONStringify } = JSON

const SUPPORTS_TO_SORTED = typeof Array.prototype.toSorted === 'function'

const JSONIsRawJSON =
  typeof JSON.isRawJSON === 'function' ? JSON.isRawJSON : undefined

// JSON.rawJSON values carry pre-serialized text that JSON.stringify emits
// verbatim; traversal must pass them through untouched rather than recurse into
// them as plain objects, which would drop the raw text.
function isRawJSON(value) {
  return JSONIsRawJSON !== undefined && JSONIsRawJSON(value)
}

/**
 * Sort and stringify with custom space/indentation in ONE pass.
 *
 * Combines sorting and stringification to avoid double traversal.
 */
function sortAndStringifyWithSpace(value, space, opts) {
  opts = { __proto__: null, ...opts }
  const seen = new Set()

  function stringify(val, key, indent, childIndent) {
    // Handle toJSON()
    if (val && typeof val === 'object' && typeof val.toJSON === 'function') {
      val = val.toJSON()
    }

    // Apply replacer
    if (opts.replacer) {
      val = opts.replacer.call(val, key, val)
    }

    if (val === null) {
      return 'null'
    }
    if (val === undefined) {
      return 'undefined'
    }

    const valType = typeof val

    if (valType === 'boolean') {
      return val ? 'true' : 'false'
    }
    if (valType === 'bigint' || valType === 'number' || valType === 'string') {
      return JSONStringify(val)
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
        return opts.collapseEmpty ? '[]' : `[\n${indent}]`
      }

      seen.add(val)
      const joiner = `,\n${childIndent}`
      const nextIndent = childIndent + space
      let result = `[\n${childIndent}`

      for (let i = 0, j = 0; i < length; i++) {
        result = `${result}${j ? joiner : ''}${stringify(val[i], String(i), childIndent, nextIndent)}`
        j = 1
      }

      seen.delete(val)
      return `${result}\n${indent}]`
    }

    // Object - sort keys inline
    let keys = ObjectKeys(val)
    const { length } = keys

    if (length === 0) {
      return opts.collapseEmpty ? '{}' : `{\n${indent}}`
    }

    // Sort keys with custom comparator if provided
    if (opts.cmp) {
      const sortMethod = SUPPORTS_TO_SORTED ? 'toSorted' : 'sort'
      keys = keys[sortMethod]((a, b) => {
        const get = opts.cmp.length > 2 ? k => val[k] : undefined
        return opts.cmp(
          { key: a, value: val[a] },
          { key: b, value: val[b] },
          get ? { __proto__: null, get } : undefined,
        )
      })
    } else {
      keys = keys[SUPPORTS_TO_SORTED ? 'toSorted' : 'sort']()
    }

    seen.add(val)
    const joiner = `,\n${childIndent}`
    const nextIndent = childIndent + space
    let result = `{\n${childIndent}`

    for (let i = 0, j = 0; i < length; i += 1) {
      const k = keys[i]
      const v = stringify(val[k], k, childIndent, nextIndent)

      // Skip undefined values
      if (v === undefined) {
        continue
      }

      result = `${result}${j ? joiner : ''}${JSONStringify(k)}: ${v}`
      j = 1
    }

    seen.delete(val)
    return `${result}\n${indent}}`
  }

  return stringify(value, '', '', space)
}

/**
 * Fast path: Sort keys recursively (no options)
 */
function sortKeysFast(value) {
  if (value === null || value === undefined) {
    return value
  }
  if (typeof value !== 'object') {
    return value
  }
  if (isRawJSON(value)) {
    return value
  }
  if (ArrayIsArray(value)) {
    const { length } = value
    const result = Array.from({ length })
    for (let i = 0; i < length; i += 1) {
      result[i] = sortKeysFast(value[i])
    }
    return result
  }
  // Sort object keys
  const sorted = {}
  const keys = ObjectKeys(value)[SUPPORTS_TO_SORTED ? 'toSorted' : 'sort']()
  for (let i = 0, { length } = keys; i < length; i += 1) {
    const key = keys[i]
    sorted[key] = sortKeysFast(value[key])
  }
  return sorted
}

/**
 * Iterative version for deeply nested objects (no options)
 */
function sortKeysIterative(root) {
  if (root === null || root === undefined) {
    return root
  }
  if (typeof root !== 'object') {
    return root
  }
  const queue = [{ parent: undefined, key: '', value: root }]
  const processed = new Map()
  let result

  while (queue.length > 0) {
    const { key, parent, value } = queue.shift()

    if (
      value === null ||
      value === undefined ||
      typeof value !== 'object' ||
      isRawJSON(value)
    ) {
      if (parent === undefined) {
        result = value
      } else if (ArrayIsArray(parent)) {
        parent[key] = value
      } else {
        parent[key] = value
      }
      continue
    }

    if (processed.has(value)) {
      const cached = processed.get(value)
      if (parent === undefined) {
        result = cached
      } else if (ArrayIsArray(parent)) {
        parent[key] = cached
      } else {
        parent[key] = cached
      }
      continue
    }

    if (ArrayIsArray(value)) {
      const arr = []
      processed.set(value, arr)

      if (parent === undefined) {
        result = arr
      } else if (ArrayIsArray(parent)) {
        parent[key] = arr
      } else {
        parent[key] = arr
      }

      const { length } = value
      for (let i = length - 1; i >= 0; i -= 1) {
        queue.unshift({ parent: arr, key: i, value: value[i] })
      }
    } else {
      const obj = {}
      processed.set(value, obj)

      if (parent === undefined) {
        result = obj
      } else if (ArrayIsArray(parent)) {
        parent[key] = obj
      } else {
        parent[key] = obj
      }

      const keys = ObjectKeys(value)[SUPPORTS_TO_SORTED ? 'toSorted' : 'sort']()
      const { length } = keys
      for (let i = length - 1; i >= 0; i -= 1) {
        const k = keys[i]
        queue.unshift({ parent: obj, key: k, value: value[k] })
      }
    }
  }

  return result
}

/**
 * Full-featured path: Sort with custom options.
 */
function sortKeysWithOptions(value, opts, seen) {
  opts = { __proto__: null, ...opts }
  // Handle toJSON()
  if (
    value &&
    typeof value === 'object' &&
    typeof value.toJSON === 'function'
  ) {
    value = value.toJSON()
  }

  // Apply replacer
  if (opts.replacer) {
    value = opts.replacer.call(value, '', value)
  }

  if (value === undefined || value === null) {
    return value
  }

  if (typeof value !== 'object') {
    return value
  }

  if (isRawJSON(value)) {
    return value
  }

  // Cycle detection
  if (!seen) {
    seen = new Set()
  }

  if (seen.has(value)) {
    if (opts.cycles) {
      return '__cycle__'
    }
    throw new TypeError('Converting circular structure to JSON')
  }

  seen.add(value)

  try {
    if (ArrayIsArray(value)) {
      const { length } = value
      const arr = Array.from({ length })
      for (let i = 0; i < length; i += 1) {
        const processed = sortKeysWithOptions(value[i], opts, seen)
        arr[i] = opts.replacer
          ? opts.replacer.call(value, String(i), processed)
          : processed
      }
      return arr
    }

    // Object
    const obj = value
    let keys = ObjectKeys(obj)

    // Sort keys with custom comparator if provided
    if (opts.cmp) {
      const sortMethod = SUPPORTS_TO_SORTED ? 'toSorted' : 'sort'
      keys = keys[sortMethod]((a, b) => {
        const get = opts.cmp.length > 2 ? k => obj[k] : undefined
        return opts.cmp(
          { key: a, value: obj[a] },
          { key: b, value: obj[b] },
          get ? { __proto__: null, get } : undefined,
        )
      })
    } else {
      keys = keys[SUPPORTS_TO_SORTED ? 'toSorted' : 'sort']()
    }

    const sorted = {}

    for (let i = 0, { length } = keys; i < length; i += 1) {
      const key = keys[i]
      let val = obj[key]

      // Apply replacer
      if (opts.replacer) {
        val = opts.replacer.call(obj, key, val)
      }

      // Skip undefined values.
      if (val === undefined) {
        continue
      }

      sorted[key] = sortKeysWithOptions(val, opts, seen)
    }

    return sorted
  } finally {
    seen.delete(value)
  }
}

/**
 * Iterative JSON serializer for the no-options fast path. Used when the input
 * is too deep for native JSON.stringify to recurse. Keys are already in sorted
 * insertion order (from sortKeysIterative); cycles are caught by the native
 * stringify attempt first, so this only ever runs on acyclic input.
 */
function stringifyIterative(root) {
  const out = []
  const stack = [{ value: root }]
  while (stack.length > 0) {
    const frame = stack.pop()
    if (frame.token !== undefined) {
      out.push(frame.token)
      continue
    }
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
      // Matches JSON.stringify for array holes / unsupported array elements.
      out.push('null')
      continue
    }
    if (valType !== 'object' || isRawJSON(value)) {
      out.push(JSONStringify(value))
      continue
    }
    if (ArrayIsArray(value)) {
      const { length } = value
      if (length === 0) {
        out.push('[]')
        continue
      }
      stack.push({ token: ']' })
      for (let i = length - 1; i >= 0; i -= 1) {
        stack.push({ value: value[i] })
        if (i > 0) {
          stack.push({ token: ',' })
        }
      }
      stack.push({ token: '[' })
      continue
    }
    const keys = ObjectKeys(value)
    const emit = []
    for (let i = 0, { length } = keys; i < length; i += 1) {
      const k = keys[i]
      const v = value[k]
      const vt = typeof v
      // JSON.stringify omits undefined / function / symbol object values.
      if (v === undefined || vt === 'function' || vt === 'symbol') {
        continue
      }
      emit.push(k)
    }
    if (emit.length === 0) {
      out.push('{}')
      continue
    }
    stack.push({ token: '}' })
    for (let i = emit.length - 1; i >= 0; i -= 1) {
      const k = emit[i]
      stack.push({ value: value[k] })
      stack.push({ token: `${JSONStringify(k)}:` })
      if (i > 0) {
        stack.push({ token: ',' })
      }
    }
    stack.push({ token: '{' })
  }
  return out.join('')
}

/**
 * Main stableStringify function with full feature support.
 */
module.exports = function stableStringify(value, opts) {
  // Normalize options
  let options

  if (typeof opts === 'function') {
    // Legacy API: comparator function as second argument
    options = { cmp: opts }
  } else if (opts) {
    options = opts
  } else {
    options = {}
  }

  // Validate options
  if (
    options.collapseEmpty !== undefined &&
    typeof options.collapseEmpty !== 'boolean'
  ) {
    throw new TypeError('`collapseEmpty` must be a boolean, if provided')
  }

  // Fast path: no options provided
  if (!opts || ObjectKeys(options).length === 0) {
    try {
      const sorted = sortKeysFast(value)
      return JSONStringify(sorted)
    } catch (err) {
      if (
        err instanceof RangeError &&
        err.message.includes('Maximum call stack')
      ) {
        const sorted = sortKeysIterative(value)
        try {
          return JSONStringify(sorted)
        } catch (e) {
          // The sort is iterative now, but JSON.stringify still recurses and
          // overflows at the same depth. Serialize iteratively too. A circular
          // structure throws a non-RangeError here and propagates as before.
          if (
            e instanceof RangeError &&
            e.message.includes('Maximum call stack')
          ) {
            return stringifyIterative(sorted)
          }
          throw e
        }
      }
      throw err
    }
  }

  // Feature path: options provided

  // Handle space/indentation - use one-pass approach
  if (options.space) {
    const space =
      typeof options.space === 'number'
        ? ' '.repeat(options.space)
        : options.space
    return sortAndStringifyWithSpace(value, space, options)
  }

  // No space - two-pass approach (sort then stringify)
  const sorted = sortKeysWithOptions(value, options)
  return JSONStringify(sorted)
}
