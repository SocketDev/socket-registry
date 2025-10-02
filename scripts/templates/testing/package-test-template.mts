/**
 * @fileoverview Template for package override test infrastructure.
 * Copy this template when creating new package override tests.
 */

/**
 * USAGE INSTRUCTIONS:
 * 1. Copy this file to test/npm/<package-name>.test.mts
 * 2. Replace PACKAGE_NAME with your actual package name
 * 3. Add package-specific tests using the installed package
 * 4. See existing tests in test/npm/ for examples:
 *    - test/npm/safer-buffer.test.mts
 *    - test/npm/json-stable-stringify.test.mts
 *    - test/npm/is-regex.test.mts
 */

import path from 'node:path'

import { beforeAll, describe, expect, it } from 'vitest'

import constants from '../../../scripts/constants.mjs'
import { installPackageForTesting } from '../../../scripts/utils/package.mjs'
import { isPackageTestingSkipped } from '../../../scripts/utils/tests.mjs'

const { NPM } = constants

const eco = NPM
const sockRegPkgName = path.basename(__filename, '.test.mts')

describe(
  `${eco} > ${sockRegPkgName}`,
  { skip: isPackageTestingSkipped(eco, sockRegPkgName) },
  () => {
    let pkgPath: string
    let pkgExport: any

    beforeAll(async () => {
      const result = await installPackageForTesting(sockRegPkgName)
      if (!result.installed) {
        throw new Error(`Failed to install package: ${result.reason}`)
      }
      pkgPath = result.packagePath!
      pkgExport = require(pkgPath)
    })

    it('should have valid package structure', () => {
      expect(pkgPath).toBeTruthy()
      expect(pkgExport).toBeDefined()
    })

    // Add package-specific functionality tests below.

    describe('functionality', () => {
      it('should perform expected behavior', () => {
        // Add tests for package-specific functionality.
        // Example:
        // const result = pkgExport.someFunction('test')
        // expect(result).toBe('expected')
        expect(true).toBe(true)
      })
    })
  },
)

/**
 * COMMON PITFALLS TO AVOID:
 *
 * 1. Hard-coded paths:
 *    ❌ WRONG: '/tmp/test-dir'
 *    ✅ CORRECT: path.join(os.tmpdir(), 'test-dir')
 *
 * 2. Path separators:
 *    ❌ WRONG: 'node_modules/package/index.js'
 *    ✅ CORRECT: path.join('node_modules', 'package', 'index.js')
 *
 * 3. Relative path traversal:
 *    ❌ WRONG: require('../../node_modules/package')
 *    ✅ CORRECT: require('package')
 *
 * 4. Direct .pnpm references:
 *    ❌ WRONG: 'node_modules/.pnpm/package@1.0.0/node_modules/package'
 *    ✅ CORRECT: Use regular imports
 *
 * 5. Missing cleanup:
 *    ❌ WRONG: Creating temp dirs without cleanup
 *    ✅ CORRECT: Track temp dirs and use safeRemove in afterEach
 *
 * 6. Importing fs incorrectly:
 *    ❌ WRONG: import fs from 'node:fs/promises'
 *    ✅ CORRECT: import { promises as fs } from 'node:fs'
 *
 * 7. Missing node: prefix:
 *    ❌ WRONG: import path from 'path'
 *    ✅ CORRECT: import path from 'node:path'
 */
