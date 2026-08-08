/**
 * @file Tests for @socketregistry/is-date-object npm package override.
 */
import { describe } from 'vitest'

import {
  createInvalidValuesExcluding,
  createTypeCheckerTests,
} from '../util/type-checker-helper.mts'

// The exports map serves index.js by default and index.cjs under the node
// condition, so both lanes carry the upstream contract and both are gated.
for (const lane of ['index.js', 'index.cjs']) {
  const isDate = require(`../../packages/npm/is-date-object/${lane}`)

  describe(`${lane} lane`, () => {
    createTypeCheckerTests({
      checkerFn: isDate,
      invalidValues: createInvalidValuesExcluding(['date']),
      toStringTagTests: true,
      typeName: 'Date',
      validValues: [new Date()],
    })
  })
}
