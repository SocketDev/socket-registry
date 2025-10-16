import {
  createInvalidValuesExcluding,
  createTypeCheckerTests,
} from '../utils/type-checker-helper.mts'

const isString = require('../../packages/npm/is-string')

createTypeCheckerTests({
  checkerFn: isString,
  invalidValues: createInvalidValuesExcluding(['string']),
  toStringTagTests: true,
  typeName: 'String',
  validValues: ['foo', Object('foo')],
})
