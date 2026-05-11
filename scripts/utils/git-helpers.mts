/**
 * @fileoverview Git helper functions for listing staged / unstaged / changed files.
 * All returned paths are relative to the git top-level, so downstream glob matchers
 * keyed on repo-relative paths work regardless of the caller's cwd.
 */

import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { spawn, spawnSync } from '@socketsecurity/lib/spawn'

export function filterRelativeToRoot(stdout: string, gitRoot: string): string[] {
  return stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .filter(file => existsSync(path.join(gitRoot, file)))
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
 * // With -z, rename entries occupy two NUL-terminated records:
 * //   "R  new-path\0old-path\0"
 * // Regular entries are one record with XY-status prefix:
 * //   " M file.ts\0"
 */
function parsePorcelainZ(raw: string, gitRoot: string): string[] {
  const records = raw.split('\0').filter(Boolean)
  const out: string[] = []
  for (let i = 0; i < records.length; i += 1) {
    const record = records[i]!
    const status = record.slice(0, 2)
    const filepath = record.slice(3)
    // Rename / copy — next record is the old path; skip it.
    if (status[0] === 'R' || status[0] === 'C') {
      i += 1
    }
    if (existsSync(path.join(gitRoot, filepath))) {
      out.push(filepath)
    }
  }
  return out
}

/**
 * Get changed files synchronously (paths relative to git root).
 */
export function getChangedFilesSync(cwd = process.cwd()): string[] {
  try {
    const gitRoot = getGitRoot(cwd)
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
 * Get staged files (paths relative to git root).
 */
export async function getStagedFiles(cwd = process.cwd()): Promise<string[]> {
  try {
    const gitRoot = await getGitRootAsync(cwd)
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
 * Get staged files synchronously (paths relative to git root).
 */
export function getStagedFilesSync(cwd = process.cwd()): string[] {
  try {
    const gitRoot = getGitRoot(cwd)
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
 * Get unstaged files (paths relative to git root).
 */
export async function getUnstagedFiles(cwd = process.cwd()): Promise<string[]> {
  try {
    const gitRoot = await getGitRootAsync(cwd)
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
 * Get unstaged files synchronously (paths relative to git root).
 */
export function getUnstagedFilesSync(cwd = process.cwd()): string[] {
  try {
    const gitRoot = getGitRoot(cwd)
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
  cwd = process.cwd(),
): Promise<boolean> {
  const files = await getUnstagedFiles(cwd)
  return files.includes(pathname)
}

/**
 * Check if a file is unstaged synchronously.
 */
export function isUnstagedSync(pathname: string, cwd = process.cwd()): boolean {
  const files = getUnstagedFilesSync(cwd)
  return files.includes(pathname)
}
