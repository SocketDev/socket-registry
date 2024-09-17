#!/usr/bin/env node
'use strict'

const path = require('node:path')

const fs = require('fs-extra')
const { glob: tinyGlob } = require('tinyglobby')

const { PACKAGE_JSON } = require('@socketregistry/scripts/constants')
const { trimTrailingSlash } = require('@socketregistry/scripts/utils/path')
const { localCompare } = require('@socketregistry/scripts/utils/sorts')

const rootPath = path.resolve(__dirname, '..')
const rootJsonPath = path.join(rootPath, PACKAGE_JSON)
const npmPackagesPath = path.join(rootPath, 'packages/npm')

;(async () => {
  const packageNames = (
    await tinyGlob(['*/'], {
      cwd: npmPackagesPath,
      onlyDirectories: true,
      expandDirectories: false
    })
  )
    .map(trimTrailingSlash)
    .sort(localCompare)

  const rootJsonRaw = await fs.readJson(rootJsonPath)
  rootJsonRaw.workspaces = packageNames.map(n => `packages/npm/${n}`)
  await fs.writeJson(rootJsonPath, rootJsonRaw, { spaces: 2 })
})()
