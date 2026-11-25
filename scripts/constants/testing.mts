/**
 * @file Testing-related constants and utilities.
 */

import { readdirSync } from 'node:fs'

import { NPM_PACKAGES_PATH, ROOT_PACKAGES_PATH } from './paths.mts'

/**
 * Get available package ecosystems.
 */
export function getEcosystems() {
  return readdirSync(ROOT_PACKAGES_PATH)
}

/**
 * Get npm package names from packages directory.
 */
export function getNpmPackageNames() {
  return readdirSync(NPM_PACKAGES_PATH, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
    .map(dirent => dirent.name)
}
