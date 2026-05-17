/** @fileoverview Update README.md files for all npm packages using templates. */

import { promises as fs } from 'node:fs'
import path from 'node:path'

import { parseArgs } from '@socketsecurity/lib-stable/argv/parse'
import { UTF8 } from '@socketsecurity/lib-stable/constants/encoding'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger'

const logger = getDefaultLogger()

import {
  NPM_PACKAGES_PATH,
  NPM_TEMPLATES_README_PATH,
  README_MD,
} from '../constants/paths.mts'
import { getNpmPackageNames } from '../constants/testing.mts'
import { isModified } from '../util/git.mts'
import { getNpmReadmeAction } from '../util/templates.mts'

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
async function main(): Promise<void> {
  // Exit early if no relevant files have been modified.
  if (!cliArgs.force && !(await isModified(NPM_TEMPLATES_README_PATH))) {
    return
  }
  const npmPackageNames = getNpmPackageNames()
  await Promise.allSettled(
    npmPackageNames.map(async sockRegPkgName => {
      const pkgPath = path.join(NPM_PACKAGES_PATH, sockRegPkgName)
      const readmePath = path.join(pkgPath, README_MD)
      const { 1: data } = await getNpmReadmeAction(pkgPath)
      return fs.writeFile(readmePath, data.readme, UTF8)
    }),
  )
}

main().catch((e: unknown) => {
  logger.error(e)
  process.exitCode = 1
})
