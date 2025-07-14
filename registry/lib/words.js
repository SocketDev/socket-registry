'use strict'

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

/*@__NO_SIDE_EFFECTS__*/
function determineArticle(word) {
  return /^[aeiou]/.test(word) ? 'an' : 'a'
}

/*@__NO_SIDE_EFFECTS__*/
function pluralize(word, count = 1) {
  return count === 0 || count > 1 ? `${word}s` : word
}

module.exports = {
  capitalize,
  determineArticle,
  pluralize
}
