'use strict'

const {
  kInternalsSymbol,
  [kInternalsSymbol]: { localeCompare, naturalSort }
} = require('./constants')

module.exports = {
  localeCompare,
  naturalSort
}
