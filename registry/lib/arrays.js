'use strict'

let _conjunctionFormatter
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

/*@__NO_SIDE_EFFECTS__*/
function arrayUnique(arr) {
  return [...new Set(arr)]
}

/*@__NO_SIDE_EFFECTS__*/
function joinAnd(arr) {
  return getConjunctionFormatter().format(arr)
}

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
