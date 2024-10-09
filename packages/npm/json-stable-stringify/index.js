'use strict'

const { isArray: ArrayIsArray } = Array
const { freeze: ObjectFreeze, keys: ObjectKeys } = Object
const { isRawJSON, stringify } = JSON

const SUPPORTS_ARRAY_PROTO_TO_SORTED =
  typeof Array.prototype.toSorted === 'function'
const SUPPORTS_JSON_IS_RAW_JSON = typeof isRawJSON === 'function'

const CYCLE_ERROR_MESSAGE = 'Converting circular structure to JSON'
const LOOP_SENTINEL = 1_000_000
const SORT_METHOD = SUPPORTS_ARRAY_PROTO_TO_SORTED ? 'toSorted' : 'sort'
const STRINGIFIED_CYCLE = '"__cycle__"'
const STRINGIFIED_NULL = 'null'
const TYPE_VALUE = 1
const TYPE_OPEN = 2
const TYPE_CLOSE = 4

let callStackSizeExceededErrorDetails

function getCallStackSizeExceededErrorDetails() {
  if (callStackSizeExceededErrorDetails === undefined) {
    let limit = 0
    try {
      ;(function r() {
        limit += 1
        r()
      })()
    } catch ({ constructor, message }) {
      callStackSizeExceededErrorDetails = ObjectFreeze({
        Ctor: constructor,
        limit,
        message
      })
    }
  }
  return callStackSizeExceededErrorDetails
}

function stableStringifyNonRecursive(obj, cmp, cycles, replacer, space) {
  const chunks = []
  const queue = [[null, new Set(), TYPE_OPEN, false, 0, '', obj]]
  let depth = 0
  let needsComma = false
  while (queue.length > 0) {
    if (depth++ === LOOP_SENTINEL) {
      throw new Error(
        'Detected infinite loop in object crawl of stableStringify'
      )
    }
    const stack = queue.pop()
    const { 0: parent, 1: seen, 2: type, 3: parentIsArr, 4: level } = stack
    const indent = space ? `\n${space.repeat(level)}` : ''
    if (type === TYPE_CLOSE) {
      seen.delete(parent)
      chunks.push(`${indent}${parentIsArr ? ']' : '}'}`)
      needsComma = true
      continue
    }
    const { 5: key, 6: rawNode } = stack
    let node =
      typeof rawNode?.toJSON === 'function' ? rawNode.toJSON() : rawNode
    if (replacer) {
      node = replacer(parent, key, node)
    }
    if (node === undefined && !parentIsArr) {
      continue
    }
    if (parent !== null) {
      if (needsComma) {
        chunks.push(',')
      }
      if (parentIsArr) {
        chunks.push(indent)
      } else {
        chunks.push(`${indent}${stringify(key)}${space ? ': ' : ':'}`)
      }
    }
    needsComma = true
    if (parentIsArr && node === undefined) {
      chunks.push(STRINGIFIED_NULL)
      continue
    }
    if (node === null) {
      chunks.push(STRINGIFIED_NULL)
      continue
    }
    if (typeof node !== 'object') {
      chunks.push(stringify(node))
      continue
    }
    if (seen.has(node)) {
      if (cycles) {
        chunks.push(STRINGIFIED_CYCLE)
        continue
      }
      throw new TypeError(CYCLE_ERROR_MESSAGE)
    }
    const nodeIsArr = ArrayIsArray(node)
    let keys
    if (nodeIsArr) {
      keys = node
    } else {
      const rawKeys = ObjectKeys(node)
      const { length } = rawKeys
      keys = length > 1 ? rawKeys[SORT_METHOD](cmp && cmp(node)) : rawKeys
      if (
        SUPPORTS_JSON_IS_RAW_JSON &&
        length === 1 &&
        keys[0] === 'rawJSON' &&
        isRawJSON(node)
      ) {
        chunks.push(node.rawJSON)
        continue
      }
    }
    needsComma = false
    seen.add(node)
    chunks.push(nodeIsArr ? '[' : '{')
    queue.push([node, seen, TYPE_CLOSE, nodeIsArr, level])
    for (let i = keys.length - 1; i >= 0; i -= 1) {
      const k = nodeIsArr ? i : keys[i]
      queue.push([
        node,
        new Set(seen),
        TYPE_VALUE,
        nodeIsArr,
        level + 1,
        k,
        node[k]
      ])
    }
  }
  return chunks.join('')
}

function stableStringifyRecursive(obj, cmp, cycles, replacer, space) {
  const seen = new Set()
  return (function recursive(parent, key, rawNode, level) {
    let node =
      typeof rawNode?.toJSON === 'function' ? rawNode.toJSON() : rawNode
    if (replacer) {
      node = replacer(parent, key, node)
    }
    if (node === undefined) {
      return
    }
    if (node === null) {
      return STRINGIFIED_NULL
    }
    if (typeof node !== 'object') {
      return stringify(node)
    }
    if (seen.has(node)) {
      if (cycles) {
        return STRINGIFIED_CYCLE
      }
      throw new TypeError(CYCLE_ERROR_MESSAGE)
    }
    const nodeIsArr = ArrayIsArray(node)
    let keys
    if (nodeIsArr) {
      keys = node
    } else {
      const rawKeys = ObjectKeys(node)
      const { length } = rawKeys
      keys = length > 1 ? rawKeys[SORT_METHOD](cmp && cmp(node)) : rawKeys
      if (
        SUPPORTS_JSON_IS_RAW_JSON &&
        length === 1 &&
        keys[0] === 'rawJSON' &&
        isRawJSON(node)
      ) {
        return node.rawJSON
      }
    }
    seen.add(node)
    const out = []
    for (let i = 0, { length } = keys; i < length; i += 1) {
      const k = nodeIsArr ? i : keys[i]
      const v = recursive(node, k, node[k], level + 1)
      if (v == undefined) {
        if (nodeIsArr) {
          out.push(STRINGIFIED_NULL)
        }
      } else {
        if (nodeIsArr) {
          out.push(v)
        } else {
          out.push(`${stringify(k)}:${space ? ' ' : ''}${v}`)
        }
      }
    }
    seen.delete(node)
    const indent = space ? `\n${space.repeat(level)}` : ''
    const childIndent = space ? `\n${space.repeat(level + 1)}` : ''
    const openBracket = nodeIsArr ? '[' : '{'
    const closeBracket = nodeIsArr ? ']' : '}'
    return `${openBracket}${childIndent}${out.join(`,${childIndent}`)}${indent}${closeBracket}`
  })({ '': obj }, '', obj, 0)
}

let callStackLimitTripped = false

module.exports = function stableStringify(obj, opts = {}) {
  const rawReplacer = opts.replacer
  const rawSpace = opts.space || ''
  const cycles = opts.cycles === true
  const replacer =
    typeof rawReplacer === 'function'
      ? (thisArg, key, value) => rawReplacer.call(thisArg, key, value)
      : undefined
  const space = typeof rawSpace === 'number' ? ' '.repeat(rawSpace) : rawSpace
  const cmpOpt = typeof opts === 'function' ? opts : opts.cmp
  const cmp =
    typeof cmpOpt === 'function'
      ? node => {
          const get = cmpOpt.length > 2 ? k => node[k] : undefined
          return (a, b) =>
            cmpOpt(
              { __proto__: null, key: a, value: node[a] },
              { __proto__: null, key: b, value: node[b] },
              get ? { __proto__: null, get } : undefined
            )
        }
      : undefined
  if (callStackLimitTripped) {
    return stableStringifyNonRecursive(obj, cmp, cycles, replacer, space)
  }
  try {
    return stableStringifyRecursive(obj, cmp, cycles, replacer, space)
  } catch (e) {
    if (e) {
      const { Ctor, message } = getCallStackSizeExceededErrorDetails()
      if (e instanceof Ctor && e.message === message) {
        callStackLimitTripped = true
        return stableStringifyNonRecursive(obj, cmp, cycles, replacer, space)
      }
    }
    throw e
  }
}
