'use strict'

const fs = require('node:fs/promises')
const path = require('node:path')
const util = require('node:util')

const constants = require('@socketregistry/scripts/constants')
const { isModified } = require('@socketregistry/scripts/lib/git')
const { getNpmReadmeAction } = require('@socketregistry/scripts/lib/templates')

const { README_MD, UTF8, npmPackagesPath, npmTemplatesReadmePath } = constants

const { values: cliArgs } = util.parseArgs(constants.parseArgsConfig)

void (async () => {
  // Exit early if no relevant files have been modified.
  if (!cliArgs.force && !(await isModified(npmTemplatesReadmePath))) {
    return
  }
  await Promise.all(
    constants.npmPackageNames.map(async sockRegPkgName => {
      const pkgPath = path.join(npmPackagesPath, sockRegPkgName)
      const readmePath = path.join(pkgPath, README_MD)
      const { 1: data } = await getNpmReadmeAction(pkgPath)
      return fs.writeFile(readmePath, data.readme, UTF8)
    }),
  )
})()
