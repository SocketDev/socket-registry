/**
 * @file Tests for @socketregistry/is-boolean-object npm package override.
 */
import { describe } from 'vitest'

import {
  createInvalidValuesExcluding,
  createTypeCheckerTests,
} from '../util/type-checker-helper.mts'

// The exports map serves index.js by default and index.cjs under the node
// condition, so both lanes carry the upstream contract and both are gated.
for (const lane of ['index.js', 'index.cjs']) {
  const isBoolean = require(`../../packages/npm/is-boolean-object/${lane}`)

  describe(`${lane} lane`, () => {
    createTypeCheckerTests({
      checkerFn: isBoolean,
      invalidValues: createInvalidValuesExcluding(['boolean']),
      toStringTagTests: true,
      typeName: 'Boolean',
      validValues: [true, false, Object(true), Object(false)],
    })
  })
}
