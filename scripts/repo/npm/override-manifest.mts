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

const bcaKeysMap = new WeakMap<Record<string, unknown>, Map<string, string>>()

export const esShimChoices = [
  {
    name: 'es-shim prototype method',
    value: TEMPLATE_ES_SHIM_PROTOTYPE_METHOD,
  },
  { name: 'es-shim static method', value: TEMPLATE_ES_SHIM_STATIC_METHOD },
  { name: 'es-shim constructor', value: TEMPLATE_ES_SHIM_CONSTRUCTOR },
]

export function getBcdKeysMap(
  obj: Record<string, unknown>,
): Map<string, string> {
  let keysMap = bcaKeysMap.get(obj)
  if (keysMap === undefined) {
    keysMap = new Map<string, string>()
    const keys = Object.keys(obj)
    for (let i = 0, { length } = keys; i < length; i += 1) {
      const key = keys[i]
      if (key === undefined) {
        continue
      }
      keysMap.set(key.toLowerCase(), key)
    }
    bcaKeysMap.set(obj, keysMap)
  }
  return keysMap
}

export function getCompatData(props: string[]): unknown {
  const data = getCompatDataRaw(props)
  return isObject(data)
    ? (data as { __compat?: unknown | undefined }).__compat
    : undefined
}

export function getCompatDataRaw(
  props: string[],
): Record<string, unknown> | undefined {
  // Defer loading @mdn/browser-compat-data until needed.
  // It's a single 15.3 MB json file.
  const browserCompatData = require('@mdn/browser-compat-data')
  let obj: Record<string, unknown> = browserCompatData.default
  for (let i = 0, { length } = props; i < length; i += 1) {
    const rawProp = props[i]
    if (rawProp === undefined) {
      continue
    }
    let prop = rawProp.toLowerCase()
    if (prop === 'prototype') {
      prop = 'proto'
    } else {
      // Trim double underscore property prefix/postfix.
      prop = prop.replace(/^__(?!_)|(?<!_)__$/g, '')
    }
    const keysMap = getBcdKeysMap(obj)
    const key = keysMap.get(prop)
    const newObj = key === undefined ? undefined : obj[key]
    if (!isObject(newObj)) {
      if (prop === 'proto') {
        continue
      }
      return undefined
    }
    obj = newObj as Record<string, unknown>
  }
  return obj
}

export async function readLicenses(
  dirname: string,
): Promise<Array<{ name: string; content: string }>> {
  const stream = globStreamLicenses(dirname) as AsyncIterable<string>
  const results: Array<{ name: string; content: string }> = []
  for await (const license of transform(
    stream,
    async (filepath: string) => ({
      name: path.basename(filepath),
      content: await fs.readFile(filepath, UTF8),
    }),
    { concurrency: 8 },
  )) {
    results.push(license)
  }
  return results
}

export function toChoice(value: string): { name: string; value: string } {
  return { name: value, value: value }
}
