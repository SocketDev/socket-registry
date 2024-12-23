import assert from 'node:assert/strict'
import path from 'node:path'
import { describe, it } from 'node:test'

import { glob as tinyGlob } from 'tinyglobby'

const rootPath = path.resolve(__dirname, '..')
const rootRegistryPath = path.join(rootPath, 'registry')

describe('@socketsecurity/registry', () => {
  it('should not trigger lazy getter on module initialization', async () => {
    for (const filepath of await tinyGlob(['**/*.js'], {
      absolute: true,
      cwd: rootRegistryPath,
      ignore: ['**/node_modules']
    })) {
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
