'use strict'

const { fromCharCode } = String

// Inlined ansi-regex:
// https://socket.dev/npm/package/ansi-regexp/overview/6.2.2
// MIT License
// Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)

/**
 * Create a regular expression for matching ANSI escape codes.
 * @param {{onlyFirst?: boolean}} [options] - Configuration options.
 * @returns {RegExp} Regular expression for matching ANSI codes.
 */
/*@__NO_SIDE_EFFECTS__*/
function ansiRegex(options) {
  const { onlyFirst } = { __proto__: null, ...options }
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

/**
 * Apply a prefix to each line of a string.
 * @param {string} str - The string to prefix.
 * @param {string} [prefix=''] - The prefix to add to each line.
 * @returns {string} The string with prefixes applied.
 */
/*@__NO_SIDE_EFFECTS__*/
function applyLinePrefix(str, prefix = '') {
  return prefix.length
    ? `${prefix}${str.includes('\n') ? str.replace(/\n/g, `\n${prefix}`) : str}`
    : str
}

/**
 * Convert a camelCase string to kebab-case.
 * @param {string} str - The camelCase string to convert.
 * @returns {string} The kebab-case string.
 */
/*@__NO_SIDE_EFFECTS__*/
function camelToKebab(str) {
  const { length } = str
  if (!length) {
    return ''
  }
  let result = ''
  let i = 0
  while (i < length) {
    const char = str[i]
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

/**
 * Indent each line of a string with spaces.
 * @param {string} str - The string to indent.
 * @param {number} [count=1] - Number of spaces to indent.
 * @returns {string} The indented string.
 */
/*@__NO_SIDE_EFFECTS__*/
function indentString(str, count = 1) {
  return str.replace(/^(?!\s*$)/gm, ' '.repeat(count))
}

/**
 * Check if a value is a blank string (empty or only whitespace).
 * @param {any} value - The value to check.
 * @returns {boolean} True if the value is a blank string.
 */
/*@__NO_SIDE_EFFECTS__*/
function isBlankString(value) {
  return typeof value === 'string' && (!value.length || /^\s+$/.test(value))
}

/**
 * Check if a value is a non-empty string.
 * @param {any} value - The value to check.
 * @returns {boolean} True if the value is a non-empty string.
 */
/*@__NO_SIDE_EFFECTS__*/
function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0
}

/**
 * Search for a regular expression in a string starting from an index.
 * @param {string} str - The string to search in.
 * @param {RegExp} regexp - The regular expression to search for.
 * @param {number} [fromIndex=0] - The index to start searching from.
 * @returns {number} The index of the match, or -1 if not found.
 */
/*@__NO_SIDE_EFFECTS__*/
function search(str, regexp, fromIndex = 0) {
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
 * @param {string} str - The string to strip ANSI codes from.
 * @returns {string} The string without ANSI codes.
 */
/*@__NO_SIDE_EFFECTS__*/
function stripAnsi(str) {
  return str.replace(ansiRegex(), '')
}

/**
 * Strip the Byte Order Mark (BOM) from the beginning of a string.
 * @param {string} str - The string to strip BOM from.
 * @returns {string} The string without BOM.
 */
/*@__NO_SIDE_EFFECTS__*/
function stripBom(str) {
  // In JavaScript, string data is stored as UTF-16, so BOM is 0xFEFF.
  // https://tc39.es/ecma262/#sec-unicode-format-control-characters
  return str.length > 0 && str.charCodeAt(0) === 0xfeff ? str.slice(1) : str
}

/**
 * Convert a string to kebab-case (handles camelCase and snake_case).
 * @param {string} str - The string to convert.
 * @returns {string} The kebab-case string.
 */
/*@__NO_SIDE_EFFECTS__*/
function toKebabCase(str) {
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
 * @param {string} str - The string to trim newlines from.
 * @returns {string} The string with newlines trimmed.
 */
/*@__NO_SIDE_EFFECTS__*/
function trimNewlines(str) {
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

module.exports = {
  applyLinePrefix,
  camelToKebab,
  indentString,
  isBlankString,
  isNonEmptyString,
  search,
  stripAnsi,
  stripBom,
  toKebabCase,
  trimNewlines
}
