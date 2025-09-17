'use strict'

let _conjunctionFormatter
/**
 * Get a cached Intl.ListFormat instance for conjunction (and) formatting.
 * @returns {Intl.ListFormat} The conjunction formatter.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function getConjunctionFormatter() {
  if (_conjunctionFormatter === undefined) {
    _conjunctionFormatter = new Intl.ListFormat('en', {
      style: 'long',
      type: 'conjunction' // "and" lists.
    })
  }
  return _conjunctionFormatter
}

let _disjunctionFormatter
/**
 * Get a cached Intl.ListFormat instance for disjunction (or) formatting.
 * @returns {Intl.ListFormat} The disjunction formatter.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function getDisjunctionFormatter() {
  if (_disjunctionFormatter === undefined) {
    _disjunctionFormatter = new Intl.ListFormat('en', {
      style: 'long',
      type: 'disjunction' // "or" lists.
    })
  }
  return _disjunctionFormatter
}

/**
 * Split an array into chunks of a specified size.
 * @param {any[]} arr - The array to chunk.
 * @param {number} [size=2] - The size of each chunk.
 * @returns {any[][]} Array of chunked arrays.
 */
/*@__NO_SIDE_EFFECTS__*/
function arrayChunk(arr, size = 2) {
  const { length } = arr
  const chunkSize = Math.min(length, size)
  const chunks = []
  for (let i = 0; i < length; i += chunkSize) {
    chunks.push(arr.slice(i, i + chunkSize))
  }
  return chunks
}

/**
 * Get unique values from an array.
 * @param {any[]} arr - The array to deduplicate.
 * @returns {any[]} Array with unique values.
 */
/*@__NO_SIDE_EFFECTS__*/
function arrayUnique(arr) {
  return [...new Set(arr)]
}

/**
 * Join array elements with proper "and" conjunction formatting.
 * @param {string[]} arr - The array to join.
 * @returns {string} The formatted string with "and" conjunction.
 */
/*@__NO_SIDE_EFFECTS__*/
function joinAnd(arr) {
  return getConjunctionFormatter().format(arr)
}

/**
 * Join array elements with proper "or" disjunction formatting.
 * @param {string[]} arr - The array to join.
 * @returns {string} The formatted string with "or" disjunction.
 */
/*@__NO_SIDE_EFFECTS__*/
function joinOr(arr) {
  return getDisjunctionFormatter().format(arr)
}

module.exports = {
  arrayChunk,
  arrayUnique,
  joinAnd,
  joinOr
}
