'use strict'

// Browser-safe subset of node:util used by the portable (non-node) assert
// build. Node consumers never reach this file — they get node:assert through
// the package's `node` export condition — so this exists only to keep the
// bundler / browser build zero-dependency (it replaces the util@0.12.5 polyfill
// the override used to depend on). Type predicates use internal-slot probes and
// Object.prototype.toString tags, matching what that polyfill did; inspect is a
// compact formatter sufficient for AssertionError messages.

const objToString = Object.prototype.toString

function tagOf(value) {
  return objToString.call(value)
}

function isObjectLike(value) {
  return value !== null && typeof value === 'object'
}

function probe(getter, value) {
  if (!isObjectLike(value)) {
    return false
  }
  try {
    getter.call(value)
    return true
  } catch {
    return false
  }
}

const dateGetTime = Date.prototype.getTime
const regexpSource = Object.getOwnPropertyDescriptor(
  RegExp.prototype,
  'source',
).get
const mapSize = Object.getOwnPropertyDescriptor(Map.prototype, 'size').get
const setSize = Object.getOwnPropertyDescriptor(Set.prototype, 'size').get

const types = {
  isPromise(value) {
    return value instanceof Promise
  },
  isRegExp(value) {
    return probe(regexpSource, value)
  },
  isDate(value) {
    return probe(dateGetTime, value)
  },
  isMap(value) {
    return probe(mapSize, value)
  },
  isSet(value) {
    return probe(setSize, value)
  },
  isArrayBufferView(value) {
    return ArrayBuffer.isView(value)
  },
  isAnyArrayBuffer(value) {
    return (
      value instanceof ArrayBuffer ||
      (typeof SharedArrayBuffer === 'function' &&
        value instanceof SharedArrayBuffer)
    )
  },
  isNativeError(value) {
    return value instanceof Error || tagOf(value) === '[object Error]'
  },
  isNumberObject(value) {
    return isObjectLike(value) && tagOf(value) === '[object Number]'
  },
  isStringObject(value) {
    return isObjectLike(value) && tagOf(value) === '[object String]'
  },
  isBooleanObject(value) {
    return isObjectLike(value) && tagOf(value) === '[object Boolean]'
  },
  isSymbolObject(value) {
    return isObjectLike(value) && tagOf(value) === '[object Symbol]'
  },
  isBigIntObject(value) {
    return isObjectLike(value) && tagOf(value) === '[object BigInt]'
  },
  isBoxedPrimitive(value) {
    if (!isObjectLike(value)) {
      return false
    }
    const t = tagOf(value)
    return (
      t === '[object Number]' ||
      t === '[object String]' ||
      t === '[object Boolean]' ||
      t === '[object Symbol]' ||
      t === '[object BigInt]'
    )
  },
  isFloat32Array(value) {
    return tagOf(value) === '[object Float32Array]'
  },
  isFloat64Array(value) {
    return tagOf(value) === '[object Float64Array]'
  },
}

function inspect(value) {
  const seen = new Set()
  function format(val, depth) {
    if (val === null) {
      return 'null'
    }
    const t = typeof val
    if (t === 'string') {
      return JSON.stringify(val)
    }
    if (t === 'bigint') {
      return `${val}n`
    }
    if (t === 'number' || t === 'boolean' || t === 'undefined') {
      return String(val)
    }
    if (t === 'symbol') {
      return val.toString()
    }
    if (t === 'function') {
      return `[Function${val.name ? `: ${val.name}` : ' (anonymous)'}]`
    }
    if (val instanceof Error) {
      return val.stack || `${val.name}: ${val.message}`
    }
    if (seen.has(val)) {
      return '[Circular *1]'
    }
    if (depth > 4) {
      return Array.isArray(val) ? '[Array]' : '[Object]'
    }
    seen.add(val)
    let out
    if (Array.isArray(val)) {
      out = `[ ${val.map(item => format(item, depth + 1)).join(', ')} ]`
    } else if (types.isRegExp(val)) {
      out = String(val)
    } else if (types.isDate(val)) {
      out = val.toISOString()
    } else {
      const keys = Object.keys(val)
      const body = keys
        .map(key => `${key}: ${format(val[key], depth + 1)}`)
        .join(', ')
      out = body ? `{ ${body} }` : '{}'
    }
    seen.delete(val)
    return out
  }
  return format(value, 0)
}

module.exports = { inspect, types }
