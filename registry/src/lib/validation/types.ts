/**
 * @fileoverview Validation type definitions.
 */

/**
 * Schema parse result.
 */
export interface ParseResult<T> {
  success: boolean
  data?: T
  error?: any
}

/**
 * Base schema interface.
 */
export interface Schema<T = any> {
  safeParse(data: any): ParseResult<T>
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
