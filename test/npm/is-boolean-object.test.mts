import {
  createInvalidValuesExcluding,
  createTypeCheckerTests,
} from '../utils/type-checker-helper.mts'

const isBoolean = require('../../packages/npm/is-boolean-object')

createTypeCheckerTests({
  checkerFn: isBoolean,
  invalidValues: createInvalidValuesExcluding(['boolean']),
  toStringTagTests: true,
  typeName: 'Boolean',
  validValues: [true, false, Object(true), Object(false)],
})
