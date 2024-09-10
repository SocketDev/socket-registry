import assert from 'node:assert/strict'
import path from 'node:path'
import { describe, it } from 'node:test'

import fs from 'fs-extra'
import spawn from '@npmcli/promise-spawn'
import yargsParser from 'yargs-parser'

// @ts-ignore
import { stripQuotes } from '@socketregistry/monorepo/scripts/utils'

const { execPath } = process
const sideChannelPath = path.join(__dirname, 'side-channel')
const sideChannelPkgJson = require(path.join(sideChannelPath, 'package.json'))
const {
  scripts: { test }
} = sideChannelPkgJson
const binPath = path.join(sideChannelPath, 'node_modules/.bin')
const tapeBinPath = path.join(binPath, 'tape')

describe('side-channel', async () => {
  const tapeBinRealPath = await fs.realpath(tapeBinPath)

  it('should pass all unit tests', async () => {
    const args = yargsParser(test)._.map(n =>
      n === 'tape' ? tapeBinRealPath : stripQuotes(`${n}`)
    )
    await spawn(execPath, args, {
      cwd: sideChannelPath
    })
    assert.doesNotReject(
      spawn(execPath, args, {
        cwd: sideChannelPath
      })
    )
  })
})
