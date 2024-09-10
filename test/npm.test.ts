import assert from 'node:assert/strict'
import path from 'node:path'
import { describe, it } from 'node:test'

import fs from 'fs-extra'
import spawn from '@npmcli/promise-spawn'
import { glob as tinyGlob } from 'tinyglobby'
import yargsParser from 'yargs-parser'

// @ts-ignore
import { stripQuotes } from '@socketregistry/monorepo/scripts/utils'

const { execPath } = process
const rootPath = path.resolve(__dirname, '..')
const binPath = path.join(rootPath, 'node_modules/.bin')
const npmPackagesPath = path.join(__dirname, 'npm')
const tapeBinPath = fs.realpathSync(path.join(binPath, 'tape'))

;(async () => {
  const packageDirs = await tinyGlob(['*/'], {
    cwd: npmPackagesPath,
    onlyDirectories: true,
    expandDirectories: false
  })

  for (const pkgDir of packageDirs) {
    const pkgName = pkgDir.replace(/[/\\]$/, '')
    const absPkgPath = path.join(npmPackagesPath, pkgName)
    const pkgJson = require(path.join(absPkgPath, 'package.json'))
    const {
      scripts: { test }
    } = pkgJson

    describe(pkgName, async () => {
      it('should pass all unit tests', async () => {
        const args = yargsParser(test)._.map(n =>
          n === 'tape' ? tapeBinPath : stripQuotes(`${n}`)
        )
        assert.doesNotReject(spawn(execPath, args, { cwd: absPkgPath }))
      })
    })
  }
})()
