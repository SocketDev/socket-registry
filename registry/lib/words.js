'use strict'

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

function determineArticle(word) {
  return /^[aeiou]/.test(word) ? 'an' : 'a'
}

function pluralize(word, count = 1) {
  return count > 1 ? `${word}s` : word
}

module.exports = {
  capitalize,
  determineArticle,
  pluralize
}
