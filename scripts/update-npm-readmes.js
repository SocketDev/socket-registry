'use strict'

const path = require('node:path')
const util = require('node:util')

const fs = require('fs-extra')

const constants = require('@socketregistry/scripts/constants')
const { README_MD, npmPackagesPath, npmTemplatesReadmePath, parseArgsConfig } =
  constants
const { isModified } = require('@socketregistry/scripts/utils/git')
const {
  getNpmReadmeAction
} = require('@socketregistry/scripts/utils/templates')

const { values: cliArgs } = util.parseArgs(parseArgsConfig)

;(async () => {
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
