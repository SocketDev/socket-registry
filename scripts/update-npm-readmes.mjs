'use strict'

import fs from 'node:fs/promises'
import path from 'node:path'
import util from 'node:util'

import constants from '@socketregistry/scripts/constants'
import { isModified } from '@socketregistry/scripts/lib/git'
import { getNpmReadmeAction } from '@socketregistry/scripts/lib/templates'

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
