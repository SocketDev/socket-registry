'use strict'

const {
  posix: { parse: builtinPosixParse },
  win32: { parse: builtinWin32Parse }
} = require('node:path')

const variants = {
  posix: function parse(pathStr) {
    return builtinPosixParse(pathStr)
  },
  win32: function parse(pathStr) {
    return builtinWin32Parse(pathStr)
  }
}

Object.assign(variants.posix, variants)
Object.assign(variants.win32, variants)

module.exports = process.platform === 'win32' ? variants.win32 : variants.posix
