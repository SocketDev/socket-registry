import assert from 'node:assert/strict'
import path from 'node:path'
import { describe, it } from 'node:test'

import fs from 'fs-extra'
import spawn from '@npmcli/promise-spawn'
import yargsParser from 'yargs-parser'

// @ts-ignore
import { stripQuotes } from '../scripts/utils'

const { execPath } = process
const jsonStableStringifyPath = path.join(__dirname, 'json-stable-stringify')
const jsonStableStringifyPkgJson = require(
  path.join(jsonStableStringifyPath, 'package.json')
)
const {
  scripts: { test }
} = jsonStableStringifyPkgJson
const binPath = path.join(jsonStableStringifyPath, 'node_modules/.bin')
const tapeBinPath = path.join(binPath, 'tape')

describe('json-stable-stringify', async () => {
  const tapeBinRealPath = await fs.realpath(tapeBinPath)

  it('should pass all unit tests', async () => {
    const args = yargsParser(test)._.map(n =>
      n === 'tape' ? tapeBinRealPath : stripQuotes(`${n}`)
    )
    assert.doesNotReject(
      spawn(execPath, args, {
        cwd: jsonStableStringifyPath
      })
    )
  })
})
