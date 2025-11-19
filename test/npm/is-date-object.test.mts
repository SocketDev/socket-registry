/** @fileoverview Tests for @socketregistry/is-date-object npm package override. */
import {
  createInvalidValuesExcluding,
  createTypeCheckerTests,
} from '../utils/type-checker-helper.mts'

const isDate = require('../../packages/npm/is-date-object')

createTypeCheckerTests({
  checkerFn: isDate,
  invalidValues: createInvalidValuesExcluding(['date']),
  toStringTagTests: true,
  typeName: 'Date',
  validValues: [new Date()],
})
