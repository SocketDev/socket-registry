'use strict'

const constants = require('@socketregistry/scripts/constants')
const {
  kInternalsSymbol,
  [kInternalsSymbol]: { localCompare, naturalSort }
} = constants

module.exports = {
  localCompare,
  naturalSort
}
