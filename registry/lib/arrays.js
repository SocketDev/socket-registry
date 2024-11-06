'use strict'

function arrayChunk(arr, size = 2) {
  const { length } = arr
  const chunkSize = Math.min(length, size)
  const chunks = []
  for (let i = 0; i < length; i += chunkSize) {
    chunks.push(arr.slice(i, i + chunkSize))
  }
  return chunks
}

function arrayUnique(arr) {
  return [...new Set(arr)]
}

function joinAsList(arr) {
  const { length } = arr
  if (length === 0) {
    return ''
  }
  if (length === 1) {
    return arr[0]
  }
  if (length === 2) {
    return `${arr[0]} and ${arr[1]}`
  }
  return `${arr.slice(0, -1).join(', ')}, and ${arr.at(-1)}`
}

module.exports = {
  arrayChunk,
  arrayUnique,
  joinAsList
}
