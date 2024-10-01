'use strict'

const OBJECT_TYPE = 1
const ARRAY_TYPE = 2

const LOOP_SENTINEL = 1_000_000
const STRINGIFIED_CYCLE = JSON.stringify('__cycle__')
const STRINGIFIED_NULL = JSON.stringify(null)

const { isArray: ArrayIsArray } = Array
const { keys: ObjectKeys } = Object
const { compare: localCompare } = new Intl.Collator()
const defaultReplacer = (_parent, _key, value) => value

function joinEntries(entries, indent, wrapper) {
  return `${wrapper[0]}${entries.join()}${indent}${wrapper[1]}`
}

class StringifyEntries extends Array {
  constructor(options) {
    super()
    const { indent, space } = { __proto__: null, ...options }
    this.indent = indent || ''
    this.space = space || ''
  }
}

class ArrayEntries extends StringifyEntries {
  join() {
    const { indent, length, space } = this
    const out = Array(length)
    for (let i = 0; i < length; i += 1) {
      out[i] = `${indent}${space}${this[i][1]}`
    }
    return joinEntries(out, indent, '[]')
  }
}

class ObjectEntries extends StringifyEntries {
  join() {
    const { indent, length, space } = this
    const colonSeparator = space ? ': ' : ':'
    const out = []
    for (let i = 0; i < length; i += 1) {
      const { 0: key, 1: value } = this[i]
      if (value) {
        out.push(
          `${indent}${space}${JSON.stringify(key)}${colonSeparator}${value}`
        )
      }
    }
    return joinEntries(out, indent, '{}')
  }
}

module.exports = function stableStringify(obj, opts = {}) {
  const rawReplacer = opts?.replacer
  const rawSpace = opts?.space || ''
  const cycles = typeof opts?.cycles === 'boolean' && opts.cycles
  const replacer =
    typeof rawReplacer === 'function'
      ? (thisArg, key, value) =>
          Reflect.apply(rawReplacer, thisArg, [key, value])
      : defaultReplacer
  const space = typeof rawSpace === 'number' ? ' '.repeat(rawSpace) : rawSpace
  let cmpOpt
  if (typeof opts === 'function') {
    cmpOpt = opts
  } else if (typeof opts?.cmp === 'function') {
    cmpOpt = opts.cmp
  }
  const passGet = cmpOpt ? cmpOpt.length > 2 : false
  const cmp = cmpOpt
    ? node => {
        const get = passGet ? k => node[k] : undefined
        return (a, b) =>
          cmpOpt(
            { __proto__: null, key: a, value: node[a] },
            { __proto__: null, key: b, value: node[b] },
            get ? { __proto__: null, get } : undefined
          )
      }
    : _node => localCompare
  const resultEntries = []
  const queue = [
    [{ '': obj }, '0', obj, 0, ARRAY_TYPE, resultEntries, new Set()]
  ]
  let { length: queueLength } = queue
  let pos = 0
  while (pos < queueLength) {
    if (pos === LOOP_SENTINEL) {
      throw new Error(
        'Detected infinite loop in object crawl of stableStringify'
      )
    }
    const {
      0: parent,
      1: key,
      2: rawNode,
      3: level,
      4: type,
      5: entries,
      6: seen
    } = queue[pos++]
    if (rawNode === seen) {
      seen.delete(parent)
      continue
    }
    const node = replacer(
      parent,
      key,
      typeof rawNode?.toJSON === 'function' ? rawNode.toJSON() : rawNode
    )
    if (node === undefined) {
      if (type === ARRAY_TYPE) {
        entries.push([key, STRINGIFIED_NULL])
      } else if (type !== OBJECT_TYPE) {
        entries.push([key, undefined])
      }
      continue
    }
    if (node === null) {
      entries.push([key, STRINGIFIED_NULL])
      continue
    }
    if (typeof node !== 'object') {
      entries.push([key, JSON.stringify(node)])
      continue
    }
    if (seen.has(node)) {
      if (cycles) {
        entries.push([key, STRINGIFIED_CYCLE])
        continue
      }
      throw new TypeError('Converting circular structure to JSON')
    } else {
      seen.add(node)
    }
    const indent = space ? `\n${space.repeat(level)}` : ''
    if (ArrayIsArray(node)) {
      const { length } = node
      const arrEntries = new ArrayEntries({ indent, space })
      for (let i = 0; i < length; i += 1) {
        queue[queueLength++] = [
          node,
          i,
          node[i],
          level + 1,
          ARRAY_TYPE,
          arrEntries,
          new Set(seen)
        ]
      }
      // Add `seen` to end to cleanup.
      queue[queueLength++] = [
        node,
        '<CLEANUP>',
        seen,
        level + 1,
        ARRAY_TYPE,
        arrEntries,
        seen
      ]
      entries.push([key, arrEntries])
      continue
    }
    const keys = ObjectKeys(node).sort(cmp(node))
    const objEntries = new ObjectEntries({ indent, space })
    for (let i = 0, { length } = keys; i < length; i += 1) {
      const key = keys[i]
      queue[queueLength++] = [
        node,
        key,
        node[key],
        level + 1,
        OBJECT_TYPE,
        objEntries,
        new Set(seen)
      ]
    }
    // Add `seen` to end to cleanup.
    queue[queueLength++] = [
      node,
      '<CLEANUP>',
      seen,
      level + 1,
      OBJECT_TYPE,
      objEntries,
      seen
    ]
    entries.push([key, objEntries])
  }
  return resultEntries.at(0)?.at(1)?.toString()
}
