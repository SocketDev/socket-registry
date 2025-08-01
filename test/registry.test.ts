import assert from 'node:assert/strict'
import path from 'node:path'
import { describe, it } from 'node:test'

import { glob } from 'fast-glob'

import constants from '@socketregistry/scripts/constants'
import { isPackageTestingSkipped } from '@socketregistry/scripts/lib/tests'
import { isObjectObject } from '@socketsecurity/registry/lib/objects'

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
        await glob(['index.js', 'external/**/*.js', 'lib/**/*.js'], {
          absolute: true,
          cwd: rootRegistryPath
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

    it('should expose internal attributes', async () => {
      const registryConstants = require(
        path.join(rootRegistryPath, 'lib/constants/index.js')
      )
      const {
        kInternalsSymbol,
        [kInternalsSymbol]: { attributes }
      } = registryConstants
      const attribKeys = ['getters', 'internals', 'mixin', 'props']
      assert.deepStrictEqual(Object.keys(attributes), attribKeys)
      for (const key of attribKeys) {
        assert.ok(
          isObjectObject(attributes[key]) || attributes[key] === undefined,
          `config.${key} is an object or undefined`
        )
      }
    })
  }
)
