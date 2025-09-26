/**
 * @fileoverview Sorting comparison functions including locale-aware and natural sorting.
 * Provides various comparison utilities for arrays and collections.
 */
'use strict'

let _localeCompare
/**
 * Compare two strings using locale-aware comparison.
 * @param {string} x - First string to compare.
 * @param {string} y - Second string to compare.
 * @returns {number} Negative if x < y, positive if x > y, 0 if equal.
 */
/*@__NO_SIDE_EFFECTS__*/
function localeCompare(x, y) {
  if (_localeCompare === undefined) {
    // Lazily call new Intl.Collator() because in Node it can take 10-14ms.
    _localeCompare = new Intl.Collator().compare
  }
  return _localeCompare(x, y)
}

let _naturalCompare
/**
 * Compare two strings using natural sorting (numeric-aware, case-insensitive).
 * @param {string} x - First string to compare.
 * @param {string} y - Second string to compare.
 * @returns {number} Negative if x < y, positive if x > y, 0 if equal.
 */
/*@__NO_SIDE_EFFECTS__*/
function naturalCompare(x, y) {
  if (_naturalCompare === undefined) {
    // Lazily call new Intl.Collator() because in Node it can take 10-14ms.
    _naturalCompare = new Intl.Collator(
      // The `undefined` locale means it uses the default locale of the user's
      // environment.
      undefined,
      {
        // Enables numeric sorting: numbers in strings are compared by value,
        // e.g. 'file2' comes before 'file10' as numbers and not 'file10' before
        // 'file2' as plain text.
        numeric: true,
        // Makes the comparison case-insensitive and ignores diacritics, e.g.
        // 'a', 'A', and 'á' are treated as equivalent.
        sensitivity: 'base',
      },
    ).compare
  }
  return _naturalCompare(x, y)
}

let _naturalSorter
/**
 * Sort an array using natural comparison.
 * @param {any[]} arrayToSort - The array to sort.
 * @returns {any} The fast-sort instance with natural comparison.
 */
/*@__NO_SIDE_EFFECTS__*/
function naturalSorter(arrayToSort) {
  if (_naturalSorter === undefined) {
    // The 'fast-sort' package is browser safe.
    const fastSort = /*@__PURE__*/ require('../external/fast-sort')
    _naturalSorter = fastSort.createNewSortInstance({
      comparer: naturalCompare,
    })
  }
  return _naturalSorter(arrayToSort)
}

/**
 * Simple string comparison.
 * @param {string} a - First string.
 * @param {string} b - Second string.
 * @returns {number} Comparison result.
 */
/*@__NO_SIDE_EFFECTS__*/
function compareStr(a, b) {
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * Compare semantic versions.
 * @param {string} a - First version.
 * @param {string} b - Second version.
 * @returns {number} Comparison result.
 */
/*@__NO_SIDE_EFFECTS__*/
function compareSemver(a, b) {
  const semver = /*@__PURE__*/ require('semver')
  const validA = semver.valid(a)
  const validB = semver.valid(b)

  if (!validA && !validB) {
    return 0
  }
  if (!validA) {
    return -1
  }
  if (!validB) {
    return 1
  }

  return semver.compare(a, b)
}

module.exports = {
  compareSemver,
  compareStr,
  localeCompare,
  naturalCompare,
  naturalSorter,
}
