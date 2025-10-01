/** @fileoverview Git operations including diff detection and file tracking. */

'use strict'

import path from 'node:path'

import { getGlobMatcher } from './globs'
import { normalizePath } from './path'
import { spawn, spawnSync } from './spawn'
import { stripAnsi } from './strings'

const gitDiffCache = new Map<string, string[]>()

/**
 * Options for git diff operations.
 */
export interface GitDiffOptions {
  absolute?: boolean
  cache?: boolean
  cwd?: string
  porcelain?: boolean
  asSet?: boolean
  [key: string]: unknown
}

/**
 * Options for package filtering operations.
 */
export interface FilterPackagesByChangesOptions {
  force?: boolean
  packageKey?: string
  [key: string]: unknown
}

type SpawnArgs = [string, string[], Record<string, unknown>]

interface GitDiffSpawnArgs {
  all: SpawnArgs
  unstaged: SpawnArgs
  staged: SpawnArgs
}

let _fs: typeof import('node:fs') | undefined
/**
 * Lazily load the fs module.
 */
/*@__NO_SIDE_EFFECTS__*/
function getFs() {
  if (_fs === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _fs = /*@__PURE__*/ require('fs')
  }
  return _fs!
}

/**
 * Get git executable path.
 */
function getGitPath(): string {
  return 'git'
}

/**
 * Get current working directory for git operations.
 * Returns the real path to handle symlinks like /tmp -> /private/tmp.
 */
function getCwd(): string {
  return getFs().realpathSync(process.cwd())
}

function getGitDiffSpawnArgs(): GitDiffSpawnArgs {
  const cwd = getCwd()
  return {
    all: [
      getGitPath(),
      ['status', '--porcelain'],
      {
        cwd,
        shell: process.platform === 'win32',
      },
    ],
    unstaged: [
      getGitPath(),
      ['diff', '--name-only'],
      {
        cwd,
      },
    ],
    staged: [
      getGitPath(),
      ['diff', '--cached', '--name-only'],
      {
        cwd,
        shell: process.platform === 'win32',
      },
    ],
  }
}

async function innerDiff(
  args: SpawnArgs,
  options?: GitDiffOptions,
): Promise<string[]> {
  const { cache = true, ...parseOptions } = { __proto__: null, ...options }
  const cacheKey = cache ? JSON.stringify({ args, parseOptions }) : undefined
  if (cache && cacheKey) {
    const result = gitDiffCache.get(cacheKey)
    if (result) {
      return result
    }
  }
  let result: string[]
  try {
    // Use stdioString: false to get raw Buffer, then convert ourselves to preserve exact output.
    const spawnResult = await spawn(args[0], args[1], {
      ...args[2],
      stdioString: false,
    })
    const stdout = Buffer.isBuffer(spawnResult.stdout)
      ? spawnResult.stdout.toString('utf8')
      : String(spawnResult.stdout)
    result = parseGitDiffStdout(stdout, parseOptions)
  } catch {
    return []
  }
  if (cache && cacheKey) {
    gitDiffCache.set(cacheKey, result)
  }
  return result
}

function innerDiffSync(args: SpawnArgs, options?: GitDiffOptions): string[] {
  const { cache = true, ...parseOptions } = { __proto__: null, ...options }
  const cacheKey = cache ? JSON.stringify({ args, parseOptions }) : undefined
  if (cache && cacheKey) {
    const result = gitDiffCache.get(cacheKey)
    if (result) {
      return result
    }
  }
  let result: string[]
  try {
    // Use stdioString: false to get raw Buffer, then convert ourselves to preserve exact output.
    const spawnResult = spawnSync(args[0], args[1], {
      ...args[2],
      stdioString: false,
    })
    const stdout = Buffer.isBuffer(spawnResult.stdout)
      ? spawnResult.stdout.toString('utf8')
      : String(spawnResult.stdout)
    result = parseGitDiffStdout(stdout, parseOptions)
  } catch {
    return []
  }
  if (cache && cacheKey) {
    gitDiffCache.set(cacheKey, result)
  }
  return result
}

function parseGitDiffStdout(
  stdout: string,
  options?: GitDiffOptions,
): string[] {
  const rootPath = getCwd()
  const {
    absolute = false,
    cwd: cwdOption = rootPath,
    porcelain = false,
    ...matcherOptions
  } = { __proto__: null, ...options }
  // Resolve cwd to handle symlinks.
  const cwd =
    cwdOption === rootPath ? rootPath : getFs().realpathSync(cwdOption)
  // Split into lines without trimming to preserve leading spaces in porcelain format.
  let rawFiles = stdout
    ? stripAnsi(stdout)
        .split('\n')
        .map(line => line.trimEnd())
        .filter(line => line)
    : []
  // Parse porcelain format: strip status codes.
  // Git status --porcelain format is: XY filename
  // where X and Y are single characters and there's a space before the filename.
  if (porcelain) {
    rawFiles = rawFiles.map(line => {
      // Status is first 2 chars, then space, then filename.
      return line.length > 3 ? line.substring(3) : line
    })
  }
  const files = absolute
    ? rawFiles.map(relPath => normalizePath(path.join(rootPath, relPath)))
    : rawFiles.map(relPath => normalizePath(relPath))
  if (cwd === rootPath) {
    return files
  }
  const relPath = normalizePath(path.relative(rootPath, cwd))
  const matcher = getGlobMatcher([`${relPath}/**`], {
    ...matcherOptions,
    absolute,
    cwd: rootPath,
  })
  const filtered: string[] = []
  for (const filepath of files) {
    if (matcher(filepath)) {
      filtered.push(filepath)
    }
  }
  return filtered
}

/**
 * Get all changed files including staged, unstaged, and untracked files.
 * Uses `git status --porcelain` which returns the full working tree status
 * with status codes (M=modified, A=added, D=deleted, ??=untracked, etc.).
 * This is the most comprehensive check - captures everything that differs
 * from the last commit.
 */
export async function getChangedFiles(
  options?: GitDiffOptions,
): Promise<string[]> {
  const args = getGitDiffSpawnArgs().all
  return await innerDiff(args, {
    __proto__: null,
    ...options,
    porcelain: true,
  })
}

/**
 * Get all changed files including staged, unstaged, and untracked files.
 * Uses `git status --porcelain` which returns the full working tree status
 * with status codes (M=modified, A=added, D=deleted, ??=untracked, etc.).
 * This is the most comprehensive check - captures everything that differs
 * from the last commit.
 */
export function getChangedFilesSync(options?: GitDiffOptions): string[] {
  const args = getGitDiffSpawnArgs().all
  return innerDiffSync(args, {
    __proto__: null,
    ...options,
    porcelain: true,
  })
}

/**
 * Get unstaged modified files (changes not yet staged for commit).
 * Uses `git diff --name-only` which returns only unstaged modifications
 * to tracked files. Does not include untracked files or staged changes.
 * This is a focused check for uncommitted changes to existing files.
 */
export async function getUnstagedFiles(
  options?: GitDiffOptions,
): Promise<string[]> {
  const args = getGitDiffSpawnArgs().unstaged
  return await innerDiff(args, options)
}

/**
 * Get unstaged modified files (changes not yet staged for commit).
 * Uses `git diff --name-only` which returns only unstaged modifications
 * to tracked files. Does not include untracked files or staged changes.
 * This is a focused check for uncommitted changes to existing files.
 */
export function getUnstagedFilesSync(options?: GitDiffOptions): string[] {
  const args = getGitDiffSpawnArgs().unstaged
  return innerDiffSync(args, options)
}

/**
 * Get staged files ready for commit (changes added with `git add`).
 * Uses `git diff --cached --name-only` which returns only staged changes.
 * Does not include unstaged modifications or untracked files.
 * This is a focused check for what will be included in the next commit.
 */
export async function getStagedFiles(
  options?: GitDiffOptions,
): Promise<string[]> {
  const args = getGitDiffSpawnArgs().staged
  return await innerDiff(args, options)
}

/**
 * Get staged files ready for commit (changes added with `git add`).
 * Uses `git diff --cached --name-only` which returns only staged changes.
 * Does not include unstaged modifications or untracked files.
 * This is a focused check for what will be included in the next commit.
 */
export function getStagedFilesSync(options?: GitDiffOptions): string[] {
  const args = getGitDiffSpawnArgs().staged
  return innerDiffSync(args, options)
}

/**
 * Check if pathname has any changes (staged, unstaged, or untracked).
 */
export async function isChanged(
  pathname: string,
  options?: GitDiffOptions,
): Promise<boolean> {
  const files = await getChangedFiles({
    __proto__: null,
    ...options,
    absolute: false,
  })
  // Resolve pathname to handle symlinks before computing relative path.
  const resolvedPathname = getFs().realpathSync(pathname)
  const relativePath = normalizePath(path.relative(getCwd(), resolvedPathname))
  return files.includes(relativePath)
}

/**
 * Check if pathname has any changes (staged, unstaged, or untracked).
 */
export function isChangedSync(
  pathname: string,
  options?: GitDiffOptions,
): boolean {
  const files = getChangedFilesSync({
    __proto__: null,
    ...options,
    absolute: false,
  })
  // Resolve pathname to handle symlinks before computing relative path.
  const resolvedPathname = getFs().realpathSync(pathname)
  const relativePath = normalizePath(path.relative(getCwd(), resolvedPathname))
  return files.includes(relativePath)
}

/**
 * Check if pathname has unstaged changes (modified but not staged).
 */
export async function isUnstaged(
  pathname: string,
  options?: GitDiffOptions,
): Promise<boolean> {
  const files = await getUnstagedFiles({
    __proto__: null,
    ...options,
    absolute: false,
  })
  // Resolve pathname to handle symlinks before computing relative path.
  const resolvedPathname = getFs().realpathSync(pathname)
  const relativePath = normalizePath(path.relative(getCwd(), resolvedPathname))
  return files.includes(relativePath)
}

/**
 * Check if pathname has unstaged changes (modified but not staged).
 */
export function isUnstagedSync(
  pathname: string,
  options?: GitDiffOptions,
): boolean {
  const files = getUnstagedFilesSync({
    __proto__: null,
    ...options,
    absolute: false,
  })
  // Resolve pathname to handle symlinks before computing relative path.
  const resolvedPathname = getFs().realpathSync(pathname)
  const relativePath = normalizePath(path.relative(getCwd(), resolvedPathname))
  return files.includes(relativePath)
}

/**
 * Check if pathname is staged for commit.
 */
export async function isStaged(
  pathname: string,
  options?: GitDiffOptions,
): Promise<boolean> {
  const files = await getStagedFiles({
    __proto__: null,
    ...options,
    absolute: false,
  })
  // Resolve pathname to handle symlinks before computing relative path.
  const resolvedPathname = getFs().realpathSync(pathname)
  const relativePath = normalizePath(path.relative(getCwd(), resolvedPathname))
  return files.includes(relativePath)
}

/**
 * Check if pathname is staged for commit.
 */
export function isStagedSync(
  pathname: string,
  options?: GitDiffOptions,
): boolean {
  const files = getStagedFilesSync({
    __proto__: null,
    ...options,
    absolute: false,
  })
  // Resolve pathname to handle symlinks before computing relative path.
  const resolvedPathname = getFs().realpathSync(pathname)
  const relativePath = normalizePath(path.relative(getCwd(), resolvedPathname))
  return files.includes(relativePath)
}

export default {
  getChangedFiles,
  getChangedFilesSync,
  getStagedFiles,
  getStagedFilesSync,
  getUnstagedFiles,
  getUnstagedFilesSync,
  isChanged,
  isChangedSync,
  isStaged,
  isStagedSync,
  isUnstaged,
  isUnstagedSync,
}
