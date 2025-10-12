/**
 * @fileoverview Git helper functions that are not available in registry v2.0.
 */

import { execSync } from 'node:child_process'
import spawnModule from '../../registry/dist/lib/spawn.js'
const { spawn } = spawnModule

/**
 * Get staged files.
 */
export async function getStagedFiles(cwd = process.cwd()) {
  try {
    const { stdout } = await spawn('git', ['diff', '--cached', '--name-only'], {
      cwd,
    })
    return stdout.trim().split('\n').filter(Boolean)
  } catch {
    return []
  }
}

/**
 * Get staged files synchronously.
 */
export function getStagedFilesSync(cwd = process.cwd()) {
  try {
    const stdout = execSync('git diff --cached --name-only', {
      cwd,
      encoding: 'utf8',
    })
    return stdout.trim().split('\n').filter(Boolean)
  } catch {
    return []
  }
}

/**
 * Get unstaged files.
 */
export async function getUnstagedFiles(cwd = process.cwd()) {
  try {
    const { stdout } = await spawn('git', ['diff', '--name-only'], { cwd })
    return stdout.trim().split('\n').filter(Boolean)
  } catch {
    return []
  }
}

/**
 * Get unstaged files synchronously.
 */
export function getUnstagedFilesSync(cwd = process.cwd()) {
  try {
    const stdout = execSync('git diff --name-only', { cwd, encoding: 'utf8' })
    return stdout.trim().split('\n').filter(Boolean)
  } catch {
    return []
  }
}

/**
 * Get changed files synchronously.
 */
export function getChangedFilesSync(cwd = process.cwd()) {
  try {
    const stdout = execSync('git status --porcelain', { cwd, encoding: 'utf8' })
    return stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => line.slice(3)) // Remove status prefix
  } catch {
    return []
  }
}

/**
 * Check if file is unstaged.
 */
export async function isUnstaged(pathname, cwd = process.cwd()) {
  const files = await getUnstagedFiles(cwd)
  return files.includes(pathname)
}

/**
 * Check if file is unstaged synchronously.
 */
export function isUnstagedSync(pathname, cwd = process.cwd()) {
  const files = getUnstagedFilesSync(cwd)
  return files.includes(pathname)
}
