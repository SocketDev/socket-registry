/**
 * @file Utility functions for constants.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import which from 'which'
import {
  NODE_MODULES,
  PACKAGE_LOCK_JSON,
  PNPM,
  ROOT_LICENSE_PATH,
  ROOT_NODE_MODULES_BIN_PATH,
  ROOT_PATH,
  YARN_LOCK,
} from './paths.mts'

/**
 * Get cached default which command options with augmented PATH.
 */
let defaultWhichOptions: { path: string } | undefined
export function getDefaultWhichOptions(): { path: string } {
  if (defaultWhichOptions === undefined) {
    defaultWhichOptions = {
      __proto__: null,
      path: `${ROOT_NODE_MODULES_BIN_PATH}${path.delimiter}${process.env['PATH']}`,
    } as { path: string }
  }
  return defaultWhichOptions!
}

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
 * Get git executable path.
 */
let gitExecPath: string | undefined
export function getGitExecPath(): string {
  if (gitExecPath === undefined) {
    gitExecPath = which.sync('git', getDefaultWhichOptions())
  }
  return gitExecPath!
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
      .split('\n')
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
      // oxlint-disable-next-line socket/sort-set-args -- spread + template strings, non-sortable
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

/**
 * Parse arguments configuration.
 */
export const PARSE_ARGS_CONFIG = {
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
}
