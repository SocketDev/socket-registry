'use strict'

/**
 * Capitalize the first letter of a word.
 * @param {string} word - Word to capitalize.
 * @returns {string} Capitalized word.
 */
/*@__NO_SIDE_EFFECTS__*/
function capitalize(word) {
  const { length } = word
  if (length === 0) {
    return word
  }
  if (length === 1) {
    return word.toUpperCase()
  }
  return `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`
}

/**
 * Determine the appropriate article (a/an) for a word.
 * @param {string} word - Word to determine article for.
 * @returns {'a'|'an'} The appropriate article.
 */
/*@__NO_SIDE_EFFECTS__*/
function determineArticle(word) {
  return /^[aeiou]/.test(word) ? 'an' : 'a'
}

/**
 * Pluralize a word based on count.
 * @param {string} word - Word to pluralize.
 * @param {number} [count=1] - Count to determine pluralization.
 * @returns {string} Pluralized word if count is 0 or > 1.
 */
/*@__NO_SIDE_EFFECTS__*/
function pluralize(word, count = 1) {
  return count === 0 || count > 1 ? `${word}s` : word
}

module.exports = {
  capitalize,
  determineArticle,
  pluralize
}
