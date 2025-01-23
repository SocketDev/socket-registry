'use strict'

const {
  kInternalsSymbol,
  [kInternalsSymbol]: { localeCompare, naturalCompare, naturalSorter }
} = require('./constants')

module.exports = {
  localeCompare,
  naturalCompare,
  naturalSorter
}
