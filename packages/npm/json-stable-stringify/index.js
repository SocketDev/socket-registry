'use strict'

const { isArray: ArrayIsArray } = Array
const { isFinite: NumberIsFinite } = Number
const { freeze: ObjectFreeze, keys: ObjectKeys } = Object
const { isRawJSON, stringify } = JSON

const SUPPORTS_ARRAY_PROTO_TO_SORTED =
  typeof Array.prototype.toSorted === 'function'
const SUPPORTS_JSON_IS_RAW_JSON = typeof isRawJSON === 'function'

const CYCLE_ERROR_MESSAGE = 'Converting circular structure to JSON'
const LOOP_SENTINEL = 1_000_000
const SORT_METHOD = SUPPORTS_ARRAY_PROTO_TO_SORTED ? 'toSorted' : 'sort'
const STRINGIFIED_CYCLE = '"__cycle__"'
const STRINGIFIED_FALSE = 'false'
const STRINGIFIED_NULL = 'null'
const STRINGIFIED_TRUE = 'true'
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
  let result = ''
  let depth = 0
  let needsComma = false
  const queue = [[undefined, new Set(), TYPE_OPEN, false, 0, '', obj]]
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
      result = `${result}${indent}${parentIsArr ? ']' : '}'}`
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
    if (parent) {
      if (needsComma) {
        result = `${result},`
      }
      if (parentIsArr) {
        result = `${result}${indent}`
      } else {
        result = `${result}${indent}${stringify(key)}${space ? ': ' : ':'}`
      }
    }
    needsComma = true
    if (parentIsArr && node === undefined) {
      result = `${result}${STRINGIFIED_NULL}`
      continue
    }
    if (node === null) {
      result = `${result}${STRINGIFIED_NULL}`
      continue
    }
    if (typeof node !== 'object') {
      if (typeof node === 'boolean') {
        result = `${result}${node ? STRINGIFIED_TRUE : STRINGIFIED_FALSE}`
      } else {
        result =
          typeof node === 'number' && NumberIsFinite(node)
            ? `${result}${node}`
            : `${result}${stringify(node)}`
      }
      continue
    }
    if (seen.has(node)) {
      if (cycles) {
        result = `${result}${STRINGIFIED_CYCLE}`
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
        result = `${result}${node.rawJSON}`
        continue
      }
    }
    needsComma = false
    result = `${result}${nodeIsArr ? '[' : '{'}`
    seen.add(node)
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
  return result
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
      if (typeof node === 'boolean') {
        return node ? STRINGIFIED_TRUE : STRINGIFIED_FALSE
      }
      return typeof node === 'number' && NumberIsFinite(node)
        ? `${node}`
        : stringify(node)
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
    const indent = space ? `\n${space.repeat(level)}` : ''
    const childIndent = space ? `${indent}${space}` : ''
    const joiner = `,${childIndent}`
    let result = `${nodeIsArr ? '[' : '{'}${childIndent}`
    for (let i = 0, j = 0, { length } = keys; i < length; i += 1) {
      const k = nodeIsArr ? i : keys[i]
      const v = recursive(node, k, node[k], level + 1)
      if (v == undefined) {
        if (nodeIsArr) {
          result = `${result}${j ? joiner : ''}${STRINGIFIED_NULL}`
          j = 1
        }
      } else {
        result = nodeIsArr
          ? `${result}${j ? joiner : ''}${v}`
          : `${result}${j ? joiner : ''}${stringify(k)}:${space ? ' ' : ''}${v}`
        j = 1
      }
    }
    seen.delete(node)
    return `${result}${indent}${nodeIsArr ? ']' : '}'}`
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
