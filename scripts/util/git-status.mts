/**
 * @file Git helper functions for listing staged / unstaged / changed files. All
 *   returned paths are relative to the git top-level, so downstream glob
 *   matchers keyed on repo-relative paths work regardless of the caller's cwd.
 */

import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import {
  spawn,
  spawnSync,
} from '@socketsecurity/lib-stable/process/spawn/child'

interface GitStatusOptions {
  cwd?: string | undefined
}

function resolveGitCwd(options: GitStatusOptions): string {
  const opts = { __proto__: null, ...options } as typeof options
  // oxlint-disable-next-line socket/no-process-cwd-in-scripts-hooks -- explicit cwd wins; the invocation directory is the established helper default.
  return opts.cwd ?? process.cwd()
}

function getGitRoot(cwd: string): string | undefined {
  try {
    const result = spawnSync('git', ['rev-parse', '--show-toplevel'], {
      cwd,
      stdioString: true,
    })
    if (result.status !== 0) {
      return undefined
    }
    return (result.stdout as string).trim() || undefined
  } catch {
    return undefined
  }
}

async function getGitRootAsync(cwd: string): Promise<string | undefined> {
  try {
    const { stdout } = await spawn('git', ['rev-parse', '--show-toplevel'], {
      cwd,
      stdioString: true,
    })
    return (stdout as string).trim() || undefined
  } catch {
    return undefined
  }
}

/**
 * Parse `git status --porcelain -z` output.
 *
 * @example
 *   // With -z, rename entries occupy two NUL-terminated records:
 *   //   "R  new-path\0old-path\0"
 *   // Regular entries are one record with XY-status prefix:
 *   //   " M file.ts\0"
 */
function parsePorcelainZ(raw: string, gitRoot: string): string[] {
  const records = raw.split('\0').filter(Boolean)
  const out: string[] = []
  for (let i = 0; i < records.length; i += 1) {
    const record = records[i]!
    const status = record.slice(0, 2)
    const filepath = record.slice(3)
    // Rename / copy — next record is the old path; skip it.
    if (status[0] === 'C' || status[0] === 'R') {
      i += 1
    }
    if (existsSync(path.join(gitRoot, filepath))) {
      out.push(filepath)
    }
  }
  return out
}

export function filterRelativeToRoot(
  stdout: string,
  gitRoot: string,
): string[] {
  return stdout
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .filter(file => existsSync(path.join(gitRoot, file)))
}

/**
 * Get changed files synchronously. Returned paths are relative to the git root.
 */
export function getChangedFilesSync(options: GitStatusOptions = {}): string[] {
  try {
    const gitRoot = getGitRoot(resolveGitCwd(options))
    if (!gitRoot) {
      return []
    }
    const result = spawnSync('git', ['status', '--porcelain', '-z'], {
      cwd: gitRoot,
      stdioString: true,
    })
    if (result.status !== 0) {
      return []
    }
    return parsePorcelainZ(result.stdout as string, gitRoot)
  } catch {
    return []
  }
}

/**
 * Get staged files. Returned paths are relative to the git root.
 */
export async function getStagedFiles(
  options: GitStatusOptions = {},
): Promise<string[]> {
  try {
    const gitRoot = await getGitRootAsync(resolveGitCwd(options))
    if (!gitRoot) {
      return []
    }
    const { stdout } = await spawn('git', ['diff', '--cached', '--name-only'], {
      cwd: gitRoot,
      stdioString: true,
    })
    return filterRelativeToRoot(stdout as string, gitRoot)
  } catch {
    return []
  }
}

/**
 * Get staged files synchronously. Returned paths are relative to the git root.
 */
export function getStagedFilesSync(options: GitStatusOptions = {}): string[] {
  try {
    const gitRoot = getGitRoot(resolveGitCwd(options))
    if (!gitRoot) {
      return []
    }
    const result = spawnSync('git', ['diff', '--cached', '--name-only'], {
      cwd: gitRoot,
      stdioString: true,
    })
    if (result.status !== 0) {
      return []
    }
    return filterRelativeToRoot(result.stdout as string, gitRoot)
  } catch {
    return []
  }
}

/**
 * Get unstaged files. Returned paths are relative to the git root.
 */
export async function getUnstagedFiles(
  options: GitStatusOptions = {},
): Promise<string[]> {
  try {
    const gitRoot = await getGitRootAsync(resolveGitCwd(options))
    if (!gitRoot) {
      return []
    }
    const { stdout } = await spawn('git', ['diff', '--name-only'], {
      cwd: gitRoot,
      stdioString: true,
    })
    return filterRelativeToRoot(stdout as string, gitRoot)
  } catch {
    return []
  }
}

/**
 * Get unstaged files synchronously. Returned paths are relative to the git
 * root.
 */
export function getUnstagedFilesSync(options: GitStatusOptions = {}): string[] {
  try {
    const gitRoot = getGitRoot(resolveGitCwd(options))
    if (!gitRoot) {
      return []
    }
    const result = spawnSync('git', ['diff', '--name-only'], {
      cwd: gitRoot,
      stdioString: true,
    })
    if (result.status !== 0) {
      return []
    }
    return filterRelativeToRoot(result.stdout as string, gitRoot)
  } catch {
    return []
  }
}

/**
 * Check if a file is unstaged.
 */
export async function isUnstaged(
  pathname: string,
  options: GitStatusOptions = {},
): Promise<boolean> {
  const files = await getUnstagedFiles(options)
  return files.includes(pathname)
}
