/**
 * @fileoverview Array utility functions for formatting lists and collections.
 * Provides conjunction and disjunction formatters using Intl.ListFormat.
 */
'use strict'

let _conjunctionFormatter
/**
 * Get a cached Intl.ListFormat instance for conjunction (and) formatting.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function getConjunctionFormatter() {
  if (_conjunctionFormatter === undefined) {
    _conjunctionFormatter = new Intl.ListFormat('en', {
      style: 'long',
      type: 'conjunction', // "and" lists.
    })
  }
  return _conjunctionFormatter
}

let _disjunctionFormatter
/**
 * Get a cached Intl.ListFormat instance for disjunction (or) formatting.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function getDisjunctionFormatter() {
  if (_disjunctionFormatter === undefined) {
    _disjunctionFormatter = new Intl.ListFormat('en', {
      style: 'long',
      type: 'disjunction', // "or" lists.
    })
  }
  return _disjunctionFormatter
}

/**
 * Split an array into chunks of a specified size.
 */
/*@__NO_SIDE_EFFECTS__*/
function arrayChunk(arr, size = 2) {
  if (size <= 0) {
    throw new Error('Chunk size must be greater than 0')
  }
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
 */
/*@__NO_SIDE_EFFECTS__*/
function arrayUnique(arr) {
  return [...new Set(arr)]
}

/**
 * Join array elements with proper "and" conjunction formatting.
 */
/*@__NO_SIDE_EFFECTS__*/
function joinAnd(arr) {
  return getConjunctionFormatter().format(arr)
}

/**
 * Join array elements with proper "or" disjunction formatting.
 */
/*@__NO_SIDE_EFFECTS__*/
function joinOr(arr) {
  return getDisjunctionFormatter().format(arr)
}

module.exports = {
  arrayChunk,
  arrayUnique,
  joinAnd,
  joinOr,
}
