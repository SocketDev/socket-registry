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
const absNpmPackagesPath = path.join(__dirname, 'npm')

;(async () => {
  const packageDirs = await tinyGlob(['*/'], {
    cwd: absNpmPackagesPath,
    onlyDirectories: true,
    expandDirectories: false
  })

  for (const pkgDir of packageDirs) {
    const pkgName = pkgDir.replace(/[/\\]$/, '')
    const absPkgPath = path.join(absNpmPackagesPath, pkgName)
    const pkgJson = require(path.join(absPkgPath, 'package.json'))
    const {
      scripts: { test }
    } = pkgJson
    const binPath = path.join(absPkgPath, 'node_modules/.bin')
    const tapeBinPath = path.join(binPath, 'tape')

    describe(pkgName, async () => {
      const tapeBinRealPath = await fs.realpath(tapeBinPath)

      it('should pass all unit tests', async () => {
        const args = yargsParser(test)._.map(n =>
          n === 'tape' ? tapeBinRealPath : stripQuotes(`${n}`)
        )
        assert.doesNotReject(spawn(execPath, args, { cwd: absPkgPath }))
      })
    })
  }
})()
