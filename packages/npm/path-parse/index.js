'use strict'

const {
  posix: { parse: builtinPosixParse },
  win32: { parse: builtinWin32Parse }
} = require('node:path')

function validatePathString(pathString) {
  if (typeof pathString !== 'string') {
    throw new TypeError(
      `Parameter 'pathString' must be a string, not ${typeof pathString}`
    )
  }
  return pathString
}

const variants = {
  posix: function parse(pathString) {
    return builtinPosixParse(validatePathString(pathString))
  },
  win32: function parse(pathString) {
    return builtinWin32Parse(validatePathString(pathString))
  }
}

Object.assign(variants.posix, variants)
Object.assign(variants.win32, variants)

module.exports = process.platform === 'win32' ? variants.win32 : variants.posix
