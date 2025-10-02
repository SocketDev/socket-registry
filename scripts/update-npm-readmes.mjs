/** @fileoverview Update README.md files for all npm packages using templates. */

import fs from 'node:fs/promises'
import path from 'node:path'

import { parseArgs } from '../registry/dist/lib/parse-args.js'

import constants from './constants.mjs'
import { isModified } from './utils/git.mjs'
import { getNpmReadmeAction } from './utils/templates.mjs'

const { README_MD, UTF8, npmPackagesPath, npmTemplatesReadmePath } = constants

const { values: cliArgs } = parseArgs({
  options: {
    force: {
      type: 'boolean',
      short: 'f',
    },
    quiet: {
      type: 'boolean',
    },
  },
  strict: false,
})

/**
 * Generate and write README.md files for all npm packages.
 */
async function main() {
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
}

main().catch(console.error)
