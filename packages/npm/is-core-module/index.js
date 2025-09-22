'use strict'

const UNDEFINED_TOKEN = {}

const { isArray } = Array
const { hasOwn } = Object

function specifierIncluded(nodeVersion, specifier) {
  const nodeVerParts = nodeVersion.split('.')
  const specParts = specifier.split(' ')
  const specVerParts = (
    specParts.length > 1 ? specParts[1] : specParts[0]
  ).split('.')
  const op = specParts.length > 1 ? specParts[0] : '='

  for (let i = 0; i < 3; i += 1) {
    const cur = parseInt(nodeVerParts[i] || 0, 10)
    const ver = parseInt(specVerParts[i] || 0, 10)
    if (cur === ver) {
      continue
    }
    if (op === '<') {
      return cur < ver
    }
    if (op === '>=') {
      return cur >= ver
    }
    return false
  }
  return op === '>='
}

function matchesRange(nodeVersion, range) {
  const specifiers = range.split(/ ?&& ?/)
  if (specifiers.length === 0) {
    return false
  }
  for (let i = 0, { length } = specifiers; i < length; i += 1) {
    if (!specifierIncluded(nodeVersion, specifiers[i])) {
      return false
    }
  }
  return true
}

function versionIncluded(nodeVersion, specifierValue) {
  if (typeof specifierValue === 'boolean') {
    return specifierValue
  }
  if (isArray(specifierValue)) {
    for (let i = 0, { length } = specifierValue; i < length; i += 1) {
      if (matchesRange(nodeVersion, specifierValue[i])) {
        return true
      }
    }
    return false
  }
  return matchesRange(nodeVersion, specifierValue)
}

let _data
function getData() {
  if (_data === undefined) {
    _data = require('./core.json')
  }
  return _data
}

let _defaultNodeVersion = UNDEFINED_TOKEN
function getDefaultNodeVersion() {
  if (_defaultNodeVersion === UNDEFINED_TOKEN) {
    _defaultNodeVersion = (
      typeof process === 'object' && process !== null ? process : undefined
    )?.versions?.node
  }
  return _defaultNodeVersion
}

module.exports = function isCore(moduleName, maybeNodeVersion) {
  let nodeVersion
  if (typeof maybeNodeVersion === 'string') {
    nodeVersion = maybeNodeVersion
  } else if (
    maybeNodeVersion === undefined ||
    // Detect if used as a callback in something like Array#map.
    (typeof maybeNodeVersion === 'number' && arguments.length === 3)
  ) {
    nodeVersion = getDefaultNodeVersion()
  } else {
    throw new TypeError(
      nodeVersion === undefined
        ? 'Unable to determine current node version'
        : 'If provided, a valid node version is required',
    )
  }
  const data = getData()
  return (
    hasOwn(data, moduleName) && versionIncluded(nodeVersion, data[moduleName])
  )
}
