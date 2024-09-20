'use strict'

const {
  kInternalsSymbol,
  [kInternalsSymbol]: { localCompare, naturalSort }
} = require('@socketregistry/scripts/constants')

module.exports = {
  localCompare,
  naturalSort
}
