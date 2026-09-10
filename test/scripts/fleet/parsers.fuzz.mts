/**
 * @file vitiate coverage-guided fuzz targets (Tier 2) for this repo's
 *   untrusted-input string parsers: soak-bypass's `parseSpec` (a
 *   name@version spec parser) and validate-bundle-deps's
 *   `isValidPackageSpecifier` (a package-specifier validator). Complements the
 *   fast-check property tests (soak-bypass.fuzz.test.mts,
 *   validate-bundle-deps.fuzz.test.mts): fast-check checks the contract on
 *   constructed specs; vitiate feeds SWC-coverage-guided mutated BYTES to drive
 *   the split/validation branches. Both are total — never throw on any input.
 *   Run via `pnpm run test:fuzz`.
 */

import { fuzz } from '@vitiate/core'

import { parseSpec } from '../../../scripts/fleet/soak-bypass.mts'
import { isValidPackageSpecifier } from '../../../scripts/fleet/validate-bundle-deps.mts'

fuzz('parseSpec never throws on arbitrary bytes', data => {
  parseSpec(data.toString('utf8'))
})

fuzz('isValidPackageSpecifier never throws and returns a boolean', data => {
  const result = isValidPackageSpecifier(data.toString('utf8'))
  if (typeof result !== 'boolean') {
    throw new Error('isValidPackageSpecifier returned a non-boolean')
  }
})
