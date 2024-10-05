'use strict'

const {
  kInternalsSymbol,
  [kInternalsSymbol]: { localeCompare, naturalSort }
} = require('@socketregistry/scripts/constants')

module.exports = {
  localeCompare,
  naturalSort
}
