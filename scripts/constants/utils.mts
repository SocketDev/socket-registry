/**
 * @file Utility functions for constants.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'

import {
  NODE_MODULES,
  PACKAGE_LOCK_JSON,
  PNPM,
  ROOT_LICENSE_PATH,
  ROOT_PATH,
  YARN_LOCK,
} from './paths.mts'

/**
 * Get root LICENSE file content.
 */
let licenseContent: string | undefined
export function getLicenseContent(): string {
  if (licenseContent === undefined) {
    licenseContent = readFileSync(ROOT_LICENSE_PATH, 'utf8')
  }
  return licenseContent!
}

/**
 * Parse gitignore file and return ignore patterns.
 */
let gitIgnorePatterns: string[] | undefined
export function getGitIgnorePatterns(): string[] {
  if (gitIgnorePatterns === undefined) {
    const gitignorePath = path.join(ROOT_PATH, '.gitignore')
    const content = readFileSync(gitignorePath, 'utf8')
    gitIgnorePatterns = content
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
  }
  return gitIgnorePatterns!
}

/**
 * Get merged ignore globs from gitignore and standard exclusions.
 */
let ignoreGlobs: readonly string[] | undefined
export function getIgnoreGlobs(): readonly string[] {
  if (ignoreGlobs === undefined) {
    ignoreGlobs = Object.freeze([
      // Spread + template strings, non-sortable.
      // oxlint-disable-next-line socket/sort-set-args -- reserved
      ...new Set([
        // Most of these ignored files can be included specifically if included in the
        // files globs. Exceptions to this are:
        // https://docs.npmjs.com/cli/v10/configuring-npm/package-json#files
        // These can not be included.
        '.git',
        '.npmrc',
        `**/${NODE_MODULES}`,
        `**/${PACKAGE_LOCK_JSON}`,
        `**/${PNPM}-lock.ya?ml`,
        `**/${YARN_LOCK}`,
        ...getGitIgnorePatterns(),
      ]),
    ])
  }
  return ignoreGlobs!
}
