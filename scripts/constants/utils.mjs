/**
 * @fileoverview Utility functions for constants.
 */

import fs from 'node:fs'
import path from 'node:path'
import { includeIgnoreFile } from '@eslint/compat'
import which from 'which'
import {
  NODE_MODULES,
  PACKAGE_LOCK_JSON,
  PNPM,
  ROOT_LICENSE_PATH,
  ROOT_NODE_MODULES_BIN_PATH,
  ROOT_PATH,
  YARN_LOCK,
} from './paths.mjs'

/**
 * Get cached default which command options with augmented PATH.
 */
let _defaultWhichOptions
export function getDefaultWhichOptions() {
  if (_defaultWhichOptions === undefined) {
    _defaultWhichOptions = {
      __proto__: null,
      path: `${ROOT_NODE_MODULES_BIN_PATH}${path.delimiter}${process.env.PATH}`,
    }
  }
  return _defaultWhichOptions
}

/**
 * Get root LICENSE file content.
 */
let _licenseContent
export function getLicenseContent() {
  if (_licenseContent === undefined) {
    _licenseContent = fs.readFileSync(ROOT_LICENSE_PATH, 'utf8')
  }
  return _licenseContent
}

/**
 * Get git executable path.
 */
let _gitExecPath
export function getGitExecPath() {
  if (_gitExecPath === undefined) {
    _gitExecPath = which.sync('git', getDefaultWhichOptions())
  }
  return _gitExecPath
}

/**
 * Get tsx executable path.
 */
let _tsxExecPath
export function getTsxExecPath() {
  if (_tsxExecPath === undefined) {
    const tsxPath = path.join(ROOT_NODE_MODULES_BIN_PATH, 'tsx')
    if (fs.existsSync(tsxPath)) {
      _tsxExecPath = tsxPath
    } else {
      _tsxExecPath = which.sync('tsx', getDefaultWhichOptions())
    }
  }
  return _tsxExecPath
}

/**
 * Get gitignore file configuration for ESLint.
 */
let _gitIgnoreFile
export function getGitIgnoreFile() {
  if (_gitIgnoreFile === undefined) {
    const gitignorePath = path.join(ROOT_PATH, '.gitignore')
    _gitIgnoreFile = includeIgnoreFile(gitignorePath)
  }
  return _gitIgnoreFile
}

/**
 * Get merged ignore globs from gitignore and standard exclusions.
 */
let _ignoreGlobs
export function getIgnoreGlobs() {
  if (_ignoreGlobs === undefined) {
    _ignoreGlobs = Object.freeze([
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
        ...getGitIgnoreFile().ignores,
      ]),
    ])
  }
  return _ignoreGlobs
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
