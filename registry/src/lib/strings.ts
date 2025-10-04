/**
 * @fileoverview String manipulation utilities including ANSI code handling.
 * Provides string processing, prefix application, and terminal output utilities.
 */

// Type definitions
declare const BlankStringBrand: unique symbol
export type BlankString = string & { [BlankStringBrand]: true }
declare const EmptyStringBrand: unique symbol
export type EmptyString = string & { [EmptyStringBrand]: true }

// IMPORTANT: Do not use destructuring here - use direct assignment instead.
// tsgo has a bug that incorrectly transpiles destructured exports, resulting in
// `exports.SomeName = void 0;` which causes runtime errors.
// See: https://github.com/SocketDev/socket-packageurl-js/issues/3
const fromCharCode = String.fromCharCode

// Inlined ansi-regex:
// https://socket.dev/npm/package/ansi-regexp/overview/6.2.2
// MIT License
// Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)

/**
 * Create a regular expression for matching ANSI escape codes.
 */
/*@__NO_SIDE_EFFECTS__*/
function ansiRegex(options?: { onlyFirst?: boolean }): RegExp {
  const { onlyFirst } = options ?? {}
  // Valid string terminator sequences are BEL, ESC\, and 0x9c.
  const ST = '(?:\\u0007|\\u001B\\u005C|\\u009C)'
  // OSC sequences only: ESC ] ... ST (non-greedy until the first ST).
  const osc = `(?:\\u001B\\][\\s\\S]*?${ST})`
  // CSI and related: ESC/C1, optional intermediates, optional params (supports ; and :) then final byte.
  const csi =
    '[\\u001B\\u009B][[\\]()#;?]*(?:\\d{1,4}(?:[;:]\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]'
  const pattern = `${osc}|${csi}`
  return new RegExp(pattern, onlyFirst ? undefined : 'g')
}

export interface ApplyLinePrefixOptions {
  prefix?: string
}

/**
 * Apply a prefix to each line of a string.
 */
/*@__NO_SIDE_EFFECTS__*/
export function applyLinePrefix(
  str: string,
  options?: ApplyLinePrefixOptions | undefined,
): string {
  const { prefix = '' } = {
    __proto__: null,
    ...options,
  } as ApplyLinePrefixOptions
  return prefix.length
    ? `${prefix}${str.includes('\n') ? str.replace(/\n/g, `\n${prefix}`) : str}`
    : str
}

/**
 * Convert a camelCase string to kebab-case.
 */
/*@__NO_SIDE_EFFECTS__*/
export function camelToKebab(str: string): string {
  const { length } = str
  if (!length) {
    return ''
  }
  let result = ''
  let i = 0
  while (i < length) {
    const char = str[i]
    if (!char) {
      break
    }
    const charCode = char.charCodeAt(0)
    // Check if current character is uppercase letter.
    // A = 65, Z = 90
    const isUpperCase = charCode >= 65 /*'A'*/ && charCode <= 90 /*'Z'*/
    if (isUpperCase) {
      // Add dash before uppercase sequence (except at start).
      if (result.length > 0) {
        result += '-'
      }
      // Collect all consecutive uppercase letters.
      while (i < length) {
        const currChar = str[i]
        if (!currChar) {
          break
        }
        const currCharCode = currChar.charCodeAt(0)
        const isCurrUpper =
          currCharCode >= 65 /*'A'*/ && currCharCode <= 90 /*'Z'*/
        if (isCurrUpper) {
          // Convert uppercase to lowercase: subtract 32 (A=65 -> a=97, diff=32)
          result += fromCharCode(currCharCode + 32 /*'a'-'A'*/)
          i += 1
        } else {
          // Stop when we hit non-uppercase.
          break
        }
      }
    } else {
      // Handle lowercase letters, digits, and other characters.
      result += char
      i += 1
    }
  }
  return result
}

export interface IndentStringOptions {
  count?: number
}

/**
 * Indent each line of a string with spaces.
 */
/*@__NO_SIDE_EFFECTS__*/
export function indentString(
  str: string,
  options?: IndentStringOptions | undefined,
): string {
  const { count = 1 } = { __proto__: null, ...options } as IndentStringOptions
  return str.replace(/^(?!\s*$)/gm, ' '.repeat(count))
}

/**
 * Check if a value is a blank string (empty or only whitespace).
 */
/*@__NO_SIDE_EFFECTS__*/
export function isBlankString(value: unknown): value is BlankString {
  return typeof value === 'string' && (!value.length || /^\s+$/.test(value))
}

/**
 * Check if a value is a non-empty string.
 */
/*@__NO_SIDE_EFFECTS__*/
export function isNonEmptyString(
  value: unknown,
): value is Exclude<string, EmptyString> {
  return typeof value === 'string' && value.length > 0
}

export interface SearchOptions {
  fromIndex?: number
}

/**
 * Search for a regular expression in a string starting from an index.
 */
/*@__NO_SIDE_EFFECTS__*/
export function search(
  str: string,
  regexp: RegExp,
  options?: SearchOptions | undefined,
): number {
  const { fromIndex = 0 } = { __proto__: null, ...options } as SearchOptions
  const { length } = str
  if (fromIndex >= length) {
    return -1
  }
  if (fromIndex === 0) {
    return str.search(regexp)
  }
  const offset = fromIndex < 0 ? Math.max(length + fromIndex, 0) : fromIndex
  const result = str.slice(offset).search(regexp)
  return result === -1 ? -1 : result + offset
}

/**
 * Strip ANSI escape codes from a string.
 */
/*@__NO_SIDE_EFFECTS__*/
export function stripAnsi(str: string): string {
  return str.replace(ansiRegex(), '')
}

/**
 * Strip the Byte Order Mark (BOM) from the beginning of a string.
 */
/*@__NO_SIDE_EFFECTS__*/
export function stripBom(str: string): string {
  // In JavaScript, string data is stored as UTF-16, so BOM is 0xFEFF.
  // https://tc39.es/ecma262/#sec-unicode-format-control-characters
  return str.length > 0 && str.charCodeAt(0) === 0xfeff ? str.slice(1) : str
}

/**
 * Convert a string to kebab-case (handles camelCase and snake_case).
 */
/*@__NO_SIDE_EFFECTS__*/
export function toKebabCase(str: string): string {
  if (!str.length) {
    return str
  }
  return (
    str
      // Convert camelCase to kebab-case
      .replace(/([a-z]+[0-9]*)([A-Z])/g, '$1-$2')
      // Convert underscores to hyphens
      .replace(/_/g, '-')
      .toLowerCase()
  )
}

/**
 * Trim newlines from the beginning and end of a string.
 */
/*@__NO_SIDE_EFFECTS__*/
export function trimNewlines(str: string): string {
  const { length } = str
  if (length === 0) {
    return str
  }
  const first = str.charCodeAt(0)
  const noFirstNewline = first !== 13 /*'\r'*/ && first !== 10 /*'\n'*/
  if (length === 1) {
    return noFirstNewline ? str : ''
  }
  const last = str.charCodeAt(length - 1)
  const noLastNewline = last !== 13 /*'\r'*/ && last !== 10 /*'\n'*/
  if (noFirstNewline && noLastNewline) {
    return str
  }
  let start = 0
  let end = length
  while (start < end) {
    const code = str.charCodeAt(start)
    if (code !== 13 /*'\r'*/ && code !== 10 /*'\n'*/) {
      break
    }
    start += 1
  }
  while (end > start) {
    const code = str.charCodeAt(end - 1)
    if (code !== 13 /*'\r'*/ && code !== 10 /*'\n'*/) {
      break
    }
    end -= 1
  }
  return start === 0 && end === length ? str : str.slice(start, end)
}
