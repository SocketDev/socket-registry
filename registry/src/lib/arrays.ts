/**
 * @fileoverview Array utility functions for formatting lists and collections.
 * Provides conjunction and disjunction formatters using Intl.ListFormat.
 */

let _conjunctionFormatter: Intl.ListFormat | undefined
/**
 * Get a cached Intl.ListFormat instance for conjunction (and) formatting.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function getConjunctionFormatter() {
  if (_conjunctionFormatter === undefined) {
    _conjunctionFormatter = new Intl.ListFormat('en', {
      style: 'long',
      // "and" lists.
      type: 'conjunction',
    })
  }
  return _conjunctionFormatter
}

let _disjunctionFormatter: Intl.ListFormat | undefined
/**
 * Get a cached Intl.ListFormat instance for disjunction (or) formatting.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function getDisjunctionFormatter() {
  if (_disjunctionFormatter === undefined) {
    _disjunctionFormatter = new Intl.ListFormat('en', {
      style: 'long',
      // "or" lists.
      type: 'disjunction',
    })
  }
  return _disjunctionFormatter
}

/**
 * Split an array into chunks of a specified size.
 */
/*@__NO_SIDE_EFFECTS__*/
export function arrayChunk<T>(
  arr: T[] | readonly T[],
  size?: number | undefined,
): T[][] {
  const chunkSize = size ?? 2
  if (chunkSize <= 0) {
    throw new Error('Chunk size must be greater than 0')
  }
  const { length } = arr
  const actualChunkSize = Math.min(length, chunkSize)
  const chunks = []
  for (let i = 0; i < length; i += actualChunkSize) {
    chunks.push(arr.slice(i, i + actualChunkSize) as T[])
  }
  return chunks
}

/**
 * Get unique values from an array.
 */
/*@__NO_SIDE_EFFECTS__*/
export function arrayUnique<T>(arr: T[] | readonly T[]): T[] {
  return [...new Set(arr)]
}

// IMPORTANT: Do not use destructuring here - use direct assignment instead.
// tsgo has a bug that incorrectly transpiles destructured exports, resulting in
// `exports.SomeName = void 0;` which causes runtime errors.
// See: https://github.com/SocketDev/socket-packageurl-js/issues/3

/**
 * Alias for native Array.isArray.
 * Determines whether the passed value is an array.
 */
export const isArray = Array.isArray

/**
 * Join array elements with proper "and" conjunction formatting.
 */
/*@__NO_SIDE_EFFECTS__*/
export function joinAnd(arr: string[] | readonly string[]): string {
  return getConjunctionFormatter().format(arr)
}

/**
 * Join array elements with proper "or" disjunction formatting.
 */
/*@__NO_SIDE_EFFECTS__*/
export function joinOr(arr: string[] | readonly string[]): string {
  return getDisjunctionFormatter().format(arr)
}
