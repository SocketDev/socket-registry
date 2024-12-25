import assert from 'node:assert/strict'
import path from 'node:path'
import { describe, it } from 'node:test'

import { glob as tinyGlob } from 'tinyglobby'

import constants from '@socketregistry/scripts/constants'
import { isPackageTestingSkipped } from '@socketregistry/scripts/lib/tests'

const { NPM } = constants

const rootPath = path.resolve(__dirname, '..')
const rootRegistryPath = path.join(rootPath, 'registry')

const eco = NPM
const regPkgName = '@socketsecurity/registry'

describe(regPkgName, { skip: isPackageTestingSkipped(eco, regPkgName) }, () => {
  it('should not trigger lazy getter on module initialization', async () => {
    const jsFilepaths = (
      await tinyGlob(['**/*.js'], {
        absolute: true,
        cwd: rootRegistryPath,
        ignore: ['**/node_modules']
      })
    )
      // Normalize filepaths for Windows.
      .map(path.normalize)
    for (const filepath of jsFilepaths) {
      delete require.cache[filepath]
    }
    for (const filepath of jsFilepaths) {
      require(filepath)
    }
    const registryConstants = require(
      path.join(rootRegistryPath, 'lib/constants.js')
    )
    const {
      kInternalsSymbol,
      [kInternalsSymbol]: { lazyGetterStats }
    } = registryConstants

    assert.strictEqual(lazyGetterStats.initialized.size, 0)
  })
})