/** @fileoverview Tests for @socketregistry/is-number-object npm package override. */
import {
  createInvalidValuesExcluding,
  createTypeCheckerTests,
} from '../utils/type-checker-helper.mts'

const isNumber = require('../../packages/npm/is-number-object')

createTypeCheckerTests({
  checkerFn: isNumber,
  invalidValues: createInvalidValuesExcluding(['number']),
  toStringTagTests: true,
  typeName: 'Number',
  validValues: [42, Object(42), Number.NaN, Number.POSITIVE_INFINITY],
})
