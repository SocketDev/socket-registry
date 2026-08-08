/**
 * @file Tests for @socketregistry/is-number-object npm package override.
 */
import { describe } from 'vitest'

import {
  createInvalidValuesExcluding,
  createTypeCheckerTests,
} from '../util/type-checker-helper.mts'

// The exports map serves index.js by default and index.cjs under the node
// condition, so both lanes carry the upstream contract and both are gated.
for (const lane of ['index.js', 'index.cjs']) {
  const isNumber = require(`../../packages/npm/is-number-object/${lane}`)

  describe(`${lane} lane`, () => {
    createTypeCheckerTests({
      checkerFn: isNumber,
      invalidValues: createInvalidValuesExcluding(['number']),
      toStringTagTests: true,
      typeName: 'Number',
      validValues: [42, Object(42), Number.NaN, Number.POSITIVE_INFINITY],
    })
  })
}
