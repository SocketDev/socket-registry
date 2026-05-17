/** @fileoverview Tests for @socketregistry/is-string npm package override. */
import {
  createInvalidValuesExcluding,
  createTypeCheckerTests,
} from '../util/type-checker-helper.mts'

const isString = require('../../packages/npm/is-string')

createTypeCheckerTests({
  checkerFn: isString,
  invalidValues: createInvalidValuesExcluding(['string']),
  toStringTagTests: true,
  typeName: 'String',
  validValues: ['foo', Object('foo')],
})
