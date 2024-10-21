'use strict'

const { iterator: SymbolIterator } = Symbol

module.exports = function getIterator(iterable) {
  return iterable?.[SymbolIterator]?.()
}
