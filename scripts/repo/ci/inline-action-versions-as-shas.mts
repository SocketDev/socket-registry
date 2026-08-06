/**
 * @file Convert GitHub Actions tags/branches to commit SHAs in workflow files.
 */

import { existsSync, promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { errorMessage } from '@socketsecurity/lib-stable/errors/message'
import { resolveRefToSha } from '@socketsecurity/lib-stable/github/refs'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'

import { ROOT_PATH } from '../constants/paths.mts'
import { normalizePath } from '@socketsecurity/lib-stable/paths/normalize'

const logger = getDefaultLogger()

export interface Dependency {
  owner: string
  ref: string
  repoPath: string
}

export interface UsesStatement {
  comment: string
  fullMatch: string
  indent: string
  owner: string
  ref: string
  repoPath: string
}

export interface FileChange {
  action: string
  newLine: string
  oldLine: string
  ref: string
  sha: string
}

export interface ProcessFileResult {
  changes?: FileChange[] | undefined
  hasChanges: boolean
}

/**
 * Extract dependencies from the Dependencies comment block.
 */
export function extractDependencies(content: string): Dependency[] {
  const dependencies: Dependency[] = []

  // Extract dependencies from # Dependencies: comment blocks.
  const dependencyMatch = content.match(/^# Dependencies:\n((?:#.+\n)+)/m)
  if (!dependencyMatch) {
    return dependencies
  }

  const block = dependencyMatch[1]
  if (!block) {
    return dependencies
  }
  const lines = block.split('\n')
  for (let i = 0, { length } = lines; i < length; i += 1) {
    const line = lines[i]
    if (!line) {
      continue
    }
    // Match dependency format: #   - owner/repo@ref or #   - owner/repo/.github/path@ref
    // If @ref is omitted, defaults to @main
    const depMatch = line.match(/^#\s+-\s+([^/\s]+)\/([^@\s#]+)(?:@([^\s#]+))?/)
    if (depMatch) {
      const owner = depMatch[1]
      const repoPath = depMatch[2]
      const ref = depMatch[3] ?? 'main'
      if (owner && repoPath) {
        // May include .github/workflows/name or .github/actions/name.
        dependencies.push({
          owner,
          ref,
          repoPath,
        })
      }
    }
  }

  return dependencies
}

/**
 * Extract uses statements and their positions in the file.
 */
export function extractUsesStatements(content: string): UsesStatement[] {
  const statements: UsesStatement[] = []
  // Match a workflow `uses:` line: (1) leading indent, (2) owner, (3) repo+path,
  // (4) the @ref (tag/sha), (5) optional trailing ` # comment`. Multiline+global.
  const usesRegex = /^(\s*)uses:\s*([^/\s]+)\/([^@\s]+)@([^\s#]+)(\s*#.*)?$/gm

  let match: RegExpExecArray | null
  // biome-ignore lint/suspicious/noAssignInExpressions: Standard regex loop pattern.
  while ((match = usesRegex.exec(content)) !== null) {
    const [fullMatch, indent, owner, repoPath, ref, comment] = match
    if (!(fullMatch && indent !== undefined && owner && repoPath && ref)) {
      continue
    }
    statements.push({
      comment: comment?.trim() || '',
      fullMatch,
      indent,
      owner,
      ref,
      repoPath,
    })
  }

  return statements
}

/**
 * Recursively find all YAML files in a directory.
 */
export async function getAllYamlFiles(dir: string): Promise<string[]> {
  const files: string[] = []
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (let i = 0, { length } = entries; i < length; i += 1) {
      const entry = entries[i]
      if (!entry) {
        continue
      }
      const fullPath = path.join(dir, entry.name)
      if (entry.isFile() && entry.name.endsWith('.yml')) {
        files.push(fullPath)
      } else if (entry.isDirectory()) {
        files.push(...(await getAllYamlFiles(fullPath)))
      }
    }
  } catch {}
  return files
}

/**
 * Process a single file and update action references.
 */
export async function processFile(
  filePath: string,
  token: string,
  options: { dryRun?: boolean | undefined },
): Promise<ProcessFileResult> {
  const opts = { __proto__: null, ...options } as typeof options
  const { dryRun } = opts
  const content = await fs.readFile(filePath, 'utf8')
  const dependencies = extractDependencies(content)

  if (!dependencies.length) {
    return { hasChanges: false }
  }

  // Build a map of dependencies with their resolved SHAs.
  const depMap = new Map<string, Dependency & { sha: string }>()

  for (let i = 0, { length } = dependencies; i < length; i += 1) {
    const dep = dependencies[i]
    if (!dep) {
      continue
    }
    const { owner, ref, repoPath } = dep

    // Extract just the repo name (first part before any slashes in repoPath).
    const repo = normalizePath(repoPath).split('/')[0] ?? repoPath

    try {
      const sha = await resolveRefToSha(owner, repo, ref, { token })
      depMap.set(`${owner}/${repoPath}@${ref}`, { owner, ref, repoPath, sha })
    } catch (e) {
      logger.error(
        `Failed to resolve ${owner}/${repoPath}@${ref}: ${errorMessage(e)}`,
      )
    }
  }

  if (depMap.size === 0) {
    return { hasChanges: false }
  }

  // Now update uses statements based on resolved dependencies.
  const usesStatements = extractUsesStatements(content)
  let updatedContent = content
  const changes: FileChange[] = []

  // Process in reverse order to maintain correct string positions.
  // oxlint-disable-next-line socket/prefer-cached-for-loop -- iterates a reversed slice; cached-length form would lose the reverse pass.
  for (const stmt of usesStatements.slice().toReversed()) {
    const { fullMatch, indent, owner, ref: currentRef, repoPath } = stmt

    // Skip if already using a SHA (40-character hex string).
    if (/^[0-9a-f]{40}$/i.test(currentRef)) {
      continue
    }

    // Find matching dependency.
    const depKey = `${owner}/${repoPath}@${currentRef}`
    const dep = depMap.get(depKey)

    if (!dep) {
      continue
    }

    const { ref: originalRef, sha } = dep
    const newLine = `${indent}uses: ${owner}/${repoPath}@${sha} # ${originalRef}`

    updatedContent = updatedContent.replace(fullMatch, newLine)
    changes.push({
      action: `${owner}/${repoPath}`,
      newLine,
      oldLine: fullMatch.trim(),
      ref: originalRef,
      sha,
    })
  }

  if (changes.length > 0) {
    if (!dryRun) {
      await fs.writeFile(filePath, updatedContent, 'utf8')
    }
    return { changes, hasChanges: true }
  }

  return { hasChanges: false }
}

/**
 * Main function to process all workflow and action files.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const token = process.env['GITHUB_TOKEN'] || ''

  // Parse --cwd argument.
  const cwdIndex = args.indexOf('--cwd')
  const cwdArg = cwdIndex >= 0 ? args[cwdIndex + 1] : undefined
  const cwd = cwdArg ? path.resolve(cwdArg) : ROOT_PATH

  if (!token) {
    logger.warn(
      'No GITHUB_TOKEN found. GitHub API rate limit is 60 requests/hour without authentication.',
    )
    logger.warn(
      'Set GITHUB_TOKEN environment variable to increase limit to 5000 requests/hour.',
    )
  }

  if (dryRun) {
    logger.info('Running in dry-run mode - no files will be modified')
  }

  if (cwd !== ROOT_PATH) {
    logger.info(`Working directory: ${cwd}`)
  }

  const dotGithubPath = path.join(cwd, '.github')
  const workflowsPath = path.join(dotGithubPath, 'workflows')
  const actionsPath = path.join(dotGithubPath, 'actions')

  // Validate paths exist.
  if (!existsSync(dotGithubPath)) {
    logger.fail(`Directory not found: ${dotGithubPath}`)
    throw new Error(`Directory not found: ${dotGithubPath}`)
  }

  const hasWorkflows = existsSync(workflowsPath)
  const hasActions = existsSync(actionsPath)

  if (!hasWorkflows && !hasActions) {
    logger.fail(
      `Neither workflows nor actions directories found in ${dotGithubPath}`,
    )
    throw new Error(
      `Neither workflows nor actions directories found in ${dotGithubPath}`,
    )
  }

  const allFiles: string[] = []

  // Collect workflow files.
  const workflowFiles = await getAllYamlFiles(workflowsPath)
  allFiles.push(...workflowFiles)

  // Collect action files.
  try {
    const actionDirs = await fs.readdir(actionsPath, { withFileTypes: true })
    for (let i = 0, { length } = actionDirs; i < length; i += 1) {
      const dir = actionDirs[i]
      if (dir?.isDirectory()) {
        const actionFile = path.join(actionsPath, dir.name, 'action.yml')
        if (existsSync(actionFile)) {
          allFiles.push(actionFile)
        }
      }
    }
  } catch {}

  if (!allFiles.length) {
    logger.warn('No workflow or action files found')
    return
  }

  logger.info(`Processing ${allFiles.length} files…`)

  let totalChanges = 0
  const processedFiles: Array<{ changes: FileChange[]; file: string }> = []

  for (let i = 0, { length } = allFiles; i < length; i += 1) {
    const file = allFiles[i]
    if (!file) {
      continue
    }
    const result = await processFile(file, token, { dryRun })
    if (result.hasChanges && result.changes) {
      processedFiles.push({ changes: result.changes, file })
      totalChanges += result.changes.length
    }
  }

  if (!processedFiles.length) {
    logger.success('All actions are already using commit SHAs')
    return
  }

  // Display changes.
  // oxlint-disable-next-line socket/prefer-cached-for-loop -- destructured loop variable; cached-length rewrite would scatter the destructure.
  for (const { changes, file } of processedFiles) {
    logger.error('')
    logger.info(`${path.relative(cwd, file)}:`)
    for (let i = 0, { length } = changes; i < length; i += 1) {
      const change = changes[i]
      if (!change) {
        continue
      }
      logger.log(`  ${change.action}@${change.ref} → ${change.sha.slice(0, 7)}`)
      if (!dryRun) {
        logger.log(`    - ${change.oldLine}`)
        logger.log(`    + ${change.newLine.trim()}`)
      }
    }
  }

  logger.error('')
  logger.info(
    `Total: ${totalChanges} actions updated in ${processedFiles.length} files`,
  )

  if (dryRun) {
    logger.error('')
    logger.info('Run without --dry-run to apply changes')
  } else {
    logger.error('')
    logger.success('All actions have been updated to use commit SHAs')
  }
}

main().catch((e: unknown) => {
  logger.error(e)
  process.exitCode = 1
})
