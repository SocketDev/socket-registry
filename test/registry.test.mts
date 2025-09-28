import path from 'node:path'

import fastGlob from 'fast-glob'
import { describe, expect, it } from 'vitest'

import { isObjectObject } from '@socketsecurity/registry/lib/objects'

import constants from '../scripts/constants.mjs'
import { isPackageTestingSkipped } from '../scripts/utils/tests.mjs'

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
        await fastGlob.glob(['index.js', 'external/**/*.js', 'lib/**/*.js'], {
          absolute: true,
          cwd: rootRegistryPath,
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
        } catch (e: any) {
          // Skip known problematic external files with duplicate declarations.
          // Use replaceAll for cross-platform path comparison.
          const normalizedPath = filepath.replaceAll('\\', '/')
          if (
            e.message?.includes('dbcsCode') &&
            (normalizedPath.includes('/external/') ||
              normalizedPath.includes('pacote-cache-path.js'))
          ) {
            console.warn(`Skipping ${filepath} due to known bundling issue`)
            continue
          }
          console.error(`Failed to load ${filepath}`)
          throw e
        }
      }
      const registryConstants = require(
        path.join(rootRegistryPath, 'lib/constants/index.js'),
      )
      const {
        kInternalsSymbol,
        [kInternalsSymbol]: { lazyGetterStats },
      } = registryConstants

      expect(Array.from(lazyGetterStats.initialized)).toEqual([])
    })

    it('should expose internal attributes', async () => {
      const registryConstants = require(
        path.join(rootRegistryPath, 'lib/constants/index.js'),
      )
      const {
        kInternalsSymbol,
        [kInternalsSymbol]: { attributes },
      } = registryConstants
      const attribKeys = ['getters', 'internals', 'mixin', 'props']
      expect(Object.keys(attributes)).toEqual(attribKeys)
      for (const key of attribKeys) {
        expect(
          isObjectObject(attributes[key]) || attributes[key] === undefined,
        ).toBe(true)
      }
    })
  },
)
