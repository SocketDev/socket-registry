'use strict'

const {
  kInternalsSymbol,
  [kInternalsSymbol]: { localeCompare, naturalCompare, naturalSorter }
} = /*@__PURE__*/ require('./constants')

module.exports = {
  localeCompare,
  naturalCompare,
  naturalSorter
}
