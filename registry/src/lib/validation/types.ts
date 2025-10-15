/**
 * @fileoverview Validation type definitions.
 */

/**
 * Schema parse result.
 */
export interface ParseResult<T> {
  success: boolean
  data?: T
  // biome-ignore lint/suspicious/noExplicitAny: Error can be any schema validation error.
  error?: any
}

/**
 * Base schema interface.
 */
// biome-ignore lint/suspicious/noExplicitAny: Schema interface accepts any input data for validation.
export interface Schema<T = any> {
  // biome-ignore lint/suspicious/noExplicitAny: Validation accepts any input data.
  safeParse(data: any): ParseResult<T>
  // biome-ignore lint/suspicious/noExplicitAny: Validation accepts any input data.
  parse(data: any): T
  _name?: string
}

/**
 * JSON parse options.
 */
export interface JsonParseOptions {
  maxSize?: number
  allowPrototype?: boolean
}

/**
 * JSON parse result.
 */
export type JsonParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }
