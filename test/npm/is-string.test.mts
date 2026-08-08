/**
 * @file Tests for @socketregistry/is-string npm package override.
 */
import { describe } from 'vitest'

import {
  createInvalidValuesExcluding,
  createTypeCheckerTests,
} from '../util/type-checker-helper.mts'

// The exports map serves index.js by default and index.cjs under the node
// condition, so both lanes carry the upstream contract and both are gated.
for (const lane of ['index.js', 'index.cjs']) {
  const isString = require(`../../packages/npm/is-string/${lane}`)

  describe(`${lane} lane`, () => {
    createTypeCheckerTests({
      checkerFn: isString,
      invalidValues: createInvalidValuesExcluding(['string']),
      toStringTagTests: true,
      typeName: 'String',
      validValues: ['foo', Object('foo')],
    })
  })
}
