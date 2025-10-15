import path from 'node:path'

import { getGlobMatcher } from './globs'
import { normalizePath } from './path'
import { spawn, spawnSync } from './spawn'
import { stripAnsi } from './strings'

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

const gitDiffCache = new Map<string, string[]>()

let _fs: typeof import('fs') | undefined
/**
 * Lazily load the fs module to avoid Webpack errors.
 */
/*@__NO_SIDE_EFFECTS__*/
function getFs() {
  if (_fs === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.

    _fs = /*@__PURE__*/ require('node:fs')
  }
  return _fs as typeof import('fs')
}

let _path: typeof import('path') | undefined
/**
 * Lazily load the path module to avoid Webpack errors.
 */
/*@__NO_SIDE_EFFECTS__*/
function getPath() {
  if (_path === undefined) {
    _path = /*@__PURE__*/ require('node:path')
  }
  return _path as typeof import('path')
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

function getGitDiffSpawnArgs(cwd?: string): GitDiffSpawnArgs {
  const resolvedCwd = cwd ? getFs().realpathSync(cwd) : getCwd()
  return {
    all: [
      getGitPath(),
      ['status', '--porcelain'],
      {
        cwd: resolvedCwd,
        shell: process.platform === 'win32',
      },
    ],
    unstaged: [
      getGitPath(),
      ['diff', '--name-only'],
      {
        cwd: resolvedCwd,
      },
    ],
    staged: [
      getGitPath(),
      ['diff', '--cached', '--name-only'],
      {
        cwd: resolvedCwd,
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
    // Extract spawn cwd from args to pass to parser
    const spawnCwd =
      typeof args[2]['cwd'] === 'string' ? args[2]['cwd'] : undefined
    result = parseGitDiffStdout(stdout, parseOptions, spawnCwd)
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
    // Extract spawn cwd from args to pass to parser
    const spawnCwd =
      typeof args[2]['cwd'] === 'string' ? args[2]['cwd'] : undefined
    result = parseGitDiffStdout(stdout, parseOptions, spawnCwd)
  } catch {
    return []
  }
  if (cache && cacheKey) {
    gitDiffCache.set(cacheKey, result)
  }
  return result
}

/**
 * Find git repository root by walking up from the given directory.
 * Returns the directory itself if it contains .git, or the original path if no .git found.
 * Exported for testing.
 */
export function findGitRoot(startPath: string): string {
  const fs = getFs()
  const path = getPath()
  let currentPath = startPath
  // Walk up the directory tree looking for .git
  while (true) {
    try {
      const gitPath = path.join(currentPath, '.git')
      if (fs.existsSync(gitPath)) {
        return currentPath
      }
    } catch {
      // Ignore errors and continue walking up
    }
    const parentPath = path.dirname(currentPath)
    // Stop if we've reached the root or can't go up anymore
    if (parentPath === currentPath) {
      // Return original path if no .git found
      return startPath
    }
    currentPath = parentPath
  }
}

function parseGitDiffStdout(
  stdout: string,
  options?: GitDiffOptions,
  spawnCwd?: string,
): string[] {
  // Find git repo root from spawnCwd. Git always returns paths relative to the repo root,
  // not the cwd where it was run. So we need to find the repo root to correctly parse paths.
  const defaultRoot = spawnCwd ? findGitRoot(spawnCwd) : getCwd()
  const {
    absolute = false,
    cwd: cwdOption = defaultRoot,
    porcelain = false,
    ...matcherOptions
  } = { __proto__: null, ...options }
  // Resolve cwd to handle symlinks.
  const cwd =
    cwdOption === defaultRoot ? defaultRoot : getFs().realpathSync(cwdOption)
  const rootPath = defaultRoot
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
    ...(matcherOptions as {
      dot?: boolean
      ignore?: string[]
      nocase?: boolean
    }),
    absolute,
    cwd: rootPath,
  } as {
    absolute?: boolean
    cwd?: string
    dot?: boolean
    ignore?: string[]
    nocase?: boolean
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
  const args = getGitDiffSpawnArgs(options?.cwd).all
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
  const args = getGitDiffSpawnArgs(options?.cwd).all
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
  const args = getGitDiffSpawnArgs(options?.cwd).unstaged
  return await innerDiff(args, options)
}

/**
 * Get unstaged modified files (changes not yet staged for commit).
 * Uses `git diff --name-only` which returns only unstaged modifications
 * to tracked files. Does not include untracked files or staged changes.
 * This is a focused check for uncommitted changes to existing files.
 */
export function getUnstagedFilesSync(options?: GitDiffOptions): string[] {
  const args = getGitDiffSpawnArgs(options?.cwd).unstaged
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
  const args = getGitDiffSpawnArgs(options?.cwd).staged
  return await innerDiff(args, options)
}

/**
 * Get staged files ready for commit (changes added with `git add`).
 * Uses `git diff --cached --name-only` which returns only staged changes.
 * Does not include unstaged modifications or untracked files.
 * This is a focused check for what will be included in the next commit.
 */
export function getStagedFilesSync(options?: GitDiffOptions): string[] {
  const args = getGitDiffSpawnArgs(options?.cwd).staged
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
  const baseCwd = options?.cwd ? getFs().realpathSync(options['cwd']) : getCwd()
  const relativePath = normalizePath(path.relative(baseCwd, resolvedPathname))
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
  const baseCwd = options?.cwd ? getFs().realpathSync(options['cwd']) : getCwd()
  const relativePath = normalizePath(path.relative(baseCwd, resolvedPathname))
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
  const baseCwd = options?.cwd ? getFs().realpathSync(options['cwd']) : getCwd()
  const relativePath = normalizePath(path.relative(baseCwd, resolvedPathname))
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
  const baseCwd = options?.cwd ? getFs().realpathSync(options['cwd']) : getCwd()
  const relativePath = normalizePath(path.relative(baseCwd, resolvedPathname))
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
  const baseCwd = options?.cwd ? getFs().realpathSync(options['cwd']) : getCwd()
  const relativePath = normalizePath(path.relative(baseCwd, resolvedPathname))
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
  const baseCwd = options?.cwd ? getFs().realpathSync(options['cwd']) : getCwd()
  const relativePath = normalizePath(path.relative(baseCwd, resolvedPathname))
  return files.includes(relativePath)
}
