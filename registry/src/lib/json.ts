/**
 * @fileoverview JSON parsing utilities with Buffer detection and BOM stripping.
 * Provides safe JSON parsing with automatic encoding handling.
 */

import { stripBom } from './strings'

export type JsonPrimitive = null | boolean | number | string

export type JsonValue = JsonPrimitive | JsonObject | JsonArray

export interface JsonObject {
  [key: string]: JsonValue
}

export interface JsonArray extends Array<JsonValue> {}

export type JsonReviver = (key: string, value: unknown) => unknown

export interface JsonParseOptions {
  filepath?: string
  reviver?: JsonReviver | undefined
  throws?: boolean
}

// IMPORTANT: Do not use destructuring here - use direct assignment instead.
// tsgo has a bug that incorrectly transpiles destructured exports, resulting in
// `exports.SomeName = void 0;` which causes runtime errors.
// See: https://github.com/SocketDev/socket-packageurl-js/issues/3
const JSONParse = JSON.parse

/**
 * Check if a value is a Buffer instance.
 */
/*@__NO_SIDE_EFFECTS__*/
function isBuffer(x: unknown): x is Buffer {
  if (!x || typeof x !== 'object') {
    return false
  }
  const obj = x as Record<string | number, unknown>
  if (typeof obj['length'] !== 'number') {
    return false
  }
  if (typeof obj['copy'] !== 'function' || typeof obj['slice'] !== 'function') {
    return false
  }
  if (
    typeof obj['length'] === 'number' &&
    obj['length'] > 0 &&
    typeof obj[0] !== 'number'
  ) {
    return false
  }

  const Ctor = (x as { constructor?: unknown }).constructor as
    | { isBuffer?: unknown }
    | undefined
  return !!(typeof Ctor?.isBuffer === 'function' && Ctor.isBuffer(x))
}

/**
 * Check if a value is a JSON primitive (null, boolean, number, or string).
 */
/*@__NO_SIDE_EFFECTS__*/
export function isJsonPrimitive(value: unknown): value is JsonPrimitive {
  return (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'number' ||
    typeof value === 'string'
  )
}

/**
 * Parse JSON content with error handling and BOM stripping.
 */
/*@__NO_SIDE_EFFECTS__*/
export function jsonParse(
  content: string | Buffer,
  options?: JsonParseOptions | undefined,
): JsonValue | undefined {
  const { filepath, reviver, throws } = {
    __proto__: null,
    ...options,
  } as JsonParseOptions
  const shouldThrow = throws === undefined || !!throws
  const jsonStr = isBuffer(content) ? content.toString('utf8') : content
  try {
    return JSONParse(stripBom(jsonStr), reviver)
  } catch (e) {
    if (shouldThrow) {
      const error = e as Error
      if (error && typeof filepath === 'string') {
        error.message = `${filepath}: ${error.message}`
      }
      throw error
    }
  }
  return undefined
}
