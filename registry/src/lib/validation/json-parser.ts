/**
 * @fileoverview Safe JSON parsing with validation.
 */

import type { JsonParseOptions, JsonParseResult, Schema } from './types'

const { hasOwn: ObjectHasOwn } = Object

export function safeJsonParse<T = unknown>(
  jsonString: string,
  schema?: Schema<T>,
  options: JsonParseOptions = {},
): T {
  const { allowPrototype = false, maxSize = 10 * 1024 * 1024 } = options

  // Check size limit
  const byteLength = Buffer.byteLength(jsonString, 'utf8')
  if (byteLength > maxSize) {
    throw new Error(
      `JSON string exceeds maximum size limit${maxSize !== 10 * 1024 * 1024 ? ` of ${maxSize} bytes` : ''}`,
    )
  }

  // Parse JSON
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonString)
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error}`)
  }

  // Check for prototype pollution
  if (
    !allowPrototype &&
    typeof parsed === 'object' &&
    parsed !== null &&
    !Array.isArray(parsed)
  ) {
    const dangerous = ['__proto__', 'constructor', 'prototype']
    for (const key of dangerous) {
      if (ObjectHasOwn(parsed, key)) {
        throw new Error(
          'JSON contains potentially malicious prototype pollution keys',
        )
      }
    }
  }

  // Validate against schema if provided
  if (schema) {
    const result = schema.safeParse(parsed)
    if (!result.success) {
      const errors = result.error.issues
        .map(
          (issue: { path: Array<string | number>; message: string }) =>
            `${issue.path.join('.')}: ${issue.message}`,
        )
        .join(', ')
      throw new Error(`Validation failed: ${errors}`)
    }
    return result.data as T
  }

  return parsed as T
}

export function tryJsonParse<T = unknown>(
  jsonString: string,
  schema?: Schema<T>,
  options?: JsonParseOptions,
): T | undefined {
  try {
    return safeJsonParse(jsonString, schema, options)
  } catch {
    return undefined
  }
}

export function parseJsonWithResult<T = unknown>(
  jsonString: string,
  schema?: Schema<T>,
  options?: JsonParseOptions,
): JsonParseResult<T> {
  try {
    const data = safeJsonParse(jsonString, schema, options)
    return { success: true, data }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export function createJsonParser<T = unknown>(
  schema?: Schema<T>,
  defaultOptions?: JsonParseOptions,
) {
  return (jsonString: string, options?: JsonParseOptions): T => {
    return safeJsonParse(jsonString, schema, { ...defaultOptions, ...options })
  }
}

export function parseNdjson<T = unknown>(
  ndjson: string,
  schema?: Schema<T>,
  options?: JsonParseOptions,
): T[] {
  const results: T[] = []
  const lines = ndjson.split(/\r?\n/)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim()
    if (!line || line === '') {
      continue
    }

    try {
      const parsed = safeJsonParse<T>(line, schema, options)
      results.push(parsed)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to parse NDJSON at line ${i + 1}: ${message}`)
    }
  }

  return results
}

export function* streamNdjson<T = unknown>(
  ndjson: string,
  schema?: Schema<T>,
  options?: JsonParseOptions,
): Generator<T, void, unknown> {
  const lines = ndjson.split(/\r?\n/)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim()
    if (!line || line === '') {
      continue
    }

    try {
      yield safeJsonParse<T>(line, schema, options)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to parse NDJSON at line ${i + 1}: ${message}`)
    }
  }
}
