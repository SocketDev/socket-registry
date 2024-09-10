import assert from 'node:assert/strict'
import path from 'node:path'
import { describe, it } from 'node:test'

import fs from 'fs-extra'
import spawn from '@npmcli/promise-spawn'
import yargsParser from 'yargs-parser'

// @ts-ignore
import { stripQuotes } from '@socketregistry/monorepo/scripts/utils'

const { execPath } = process
const definePropertiesPath = path.join(__dirname, 'define-properties')
const definePropertiesPkgJson = require(
  path.join(definePropertiesPath, 'package.json')
)
const {
  scripts: { test }
} = definePropertiesPkgJson
const binPath = path.join(definePropertiesPath, 'node_modules/.bin')
const tapeBinPath = path.join(binPath, 'tape')

describe('define-properties', async () => {
  const tapeBinRealPath = await fs.realpath(tapeBinPath)

  it('should pass all unit tests', async () => {
    const args = yargsParser(test)._.map(n =>
      n === 'tape' ? tapeBinRealPath : stripQuotes(`${n}`)
    )
    assert.doesNotReject(
      spawn(execPath, args, {
        cwd: definePropertiesPath
      })
    )
  })
})
