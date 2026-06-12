/**
 * @file Stateless helpers for the make-npm-override CLI. Extracted so the
 *   browser-compat-data lookup, license reading, and prompt-choice shaping can
 *   be unit-tested on their own and so the CLI orchestration file stays under
 *   the file-size soft cap. The interactive `main()` flow (which threads live
 *   state across its phases) keeps living in make-npm-override.mts.
 */

import { promises as fs } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { UTF8 } from '@socketsecurity/lib-stable/constants/encoding'
import { globStreamLicenses } from '@socketsecurity/lib-stable/globs/stream'
import { isObject } from '@socketsecurity/lib-stable/objects/predicates'
import { transform } from '@socketsecurity/lib-stable/streams/transform'
import {
  TEMPLATE_ES_SHIM_CONSTRUCTOR,
  TEMPLATE_ES_SHIM_PROTOTYPE_METHOD,
  TEMPLATE_ES_SHIM_STATIC_METHOD,
} from '../constants/templates.mts'

const require = createRequire(import.meta.url)

const bcaKeysMap = new WeakMap()

export const esShimChoices = [
  {
    name: 'es-shim prototype method',
    value: TEMPLATE_ES_SHIM_PROTOTYPE_METHOD,
  },
  { name: 'es-shim static method', value: TEMPLATE_ES_SHIM_STATIC_METHOD },
  { name: 'es-shim constructor', value: TEMPLATE_ES_SHIM_CONSTRUCTOR },
]

export function getBcdKeysMap(obj) {
  let keysMap = bcaKeysMap.get(obj)
  if (keysMap === undefined) {
    keysMap = new Map()
    const keys = Object.keys(obj)
    for (let i = 0, { length } = keys; i < length; i += 1) {
      const key = keys[i]
      keysMap.set(key.toLowerCase(), key)
    }
    bcaKeysMap.set(obj, keysMap)
  }
  return keysMap
}

export function getCompatData(props) {
  const data = getCompatDataRaw(props)
  return data?.__compat
}

export function getCompatDataRaw(props) {
  // Defer loading @mdn/browser-compat-data until needed.
  // It's a single 15.3 MB json file.
  const browserCompatData = require('@mdn/browser-compat-data')
  let obj = browserCompatData.default
  for (let i = 0, { length } = props; i < length; i += 1) {
    const rawProp = props[i]
    let prop = rawProp.toLowerCase()
    if (prop === 'prototype') {
      prop = 'proto'
    } else {
      // Trim double underscore property prefix/postfix.
      prop = prop.replace(/^__(?!_)|(?<!_)__$/g, '')
    }
    const keysMap = getBcdKeysMap(obj)
    const newObj = obj[keysMap.get(prop)]
    if (!isObject(newObj)) {
      if (prop === 'proto') {
        continue
      }
      return undefined
    }
    obj = newObj
  }
  return obj
}

export async function readLicenses(dirname) {
  const stream = globStreamLicenses(dirname)
  const results = []
  for await (const license of transform(
    stream,
    async filepath => ({
      name: path.basename(filepath),
      content: await fs.readFile(filepath, UTF8),
    }),
    { concurrency: 8 },
  )) {
    results.push(license)
  }
  return results
}

export function toChoice(value) {
  return { name: value, value: value }
}
