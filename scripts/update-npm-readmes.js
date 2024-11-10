'use strict'

const fs = require('node:fs/promises')
const path = require('node:path')
const util = require('node:util')

const constants = require('@socketregistry/scripts/constants')
const { README_MD, npmPackagesPath, npmTemplatesReadmePath, parseArgsConfig } =
  constants
const { isModified } = require('@socketregistry/scripts/lib/git')
const { getNpmReadmeAction } = require('@socketregistry/scripts/lib/templates')

const { values: cliArgs } = util.parseArgs(parseArgsConfig)

void (async () => {
  // Exit early if no relevant files have been modified.
  if (!cliArgs.force && !(await isModified(npmTemplatesReadmePath))) {
    return
  }
  await Promise.all(
    // Lazily access constants.npmPackageNames.
    constants.npmPackageNames.map(async regPkgName => {
      const pkgPath = path.join(npmPackagesPath, regPkgName)
      const readmePath = path.join(pkgPath, README_MD)
      const { 1: data } = await getNpmReadmeAction(pkgPath)
      return fs.writeFile(readmePath, data.readme, 'utf8')
    })
  )
})()
