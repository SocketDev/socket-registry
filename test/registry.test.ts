import assert from 'node:assert/strict'
import path from 'node:path'
import { describe, it } from 'node:test'

import { glob as tinyGlob } from 'tinyglobby'

import constants from '@socketregistry/scripts/constants'
import { isPackageTestingSkipped } from '@socketregistry/scripts/lib/tests'

const { NPM, SOCKET_REGISTRY_PACKAGE_NAME } = constants

const rootPath = path.resolve(__dirname, '..')
const rootRegistryPath = path.join(rootPath, 'registry')

const eco = NPM

describe(
  SOCKET_REGISTRY_PACKAGE_NAME,
  { skip: isPackageTestingSkipped(eco, SOCKET_REGISTRY_PACKAGE_NAME) },
  () => {
    it('should not trigger lazy getter on module initialization', async () => {
      const jsFilepaths = (
        await tinyGlob(['**/*.js'], {
          absolute: true,
          cwd: rootRegistryPath,
          ignore: ['**/node_modules', 'src/**']
        })
      )
        // Normalize filepaths for Windows.
        .map(path.normalize)
      for (const filepath of jsFilepaths) {
        delete require.cache[filepath]
      }
      for (const filepath of jsFilepaths) {
        try {
          require(filepath)
        } catch (e) {
          console.error(`Failed to load ${filepath}`)
          throw e
        }
      }
      const registryConstants = require(
        path.join(rootRegistryPath, 'lib/constants/index.js')
      )
      const {
        kInternalsSymbol,
        [kInternalsSymbol]: { lazyGetterStats }
      } = registryConstants

      assert.deepStrictEqual([...lazyGetterStats.initialized], [])
    })
  }
)
